'use strict';
const fetch = require('node-fetch');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { getDb } = require('../config/firebase');

const toDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const parseDateString = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const toPaise = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
};

/**
 * 1. fetchFromDataGov — FAST BATCH VERSION
 * Single dedup query + batch commit instead of 500 individual read+writes
 */
const fetchFromDataGov = async ({ state, commodity }) => {
  const apiKey = process.env.DATAGOV_API_KEY;
  const baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  let fetchedCount = 0;
  const imported = [];

  try {
    const db = getDb();
    if (!db) throw new Error('Database service unavailable');

    // Build URL — data.gov.in actual field names are lowercase
    const url = new URL(baseUrl);
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', '500');
    if (state)     url.searchParams.set('filters[state]', state);
    if (commodity) url.searchParams.set('filters[commodity]', commodity);

    const response = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' }, timeout: 15000 });
    if (!response.ok) throw new Error(`DataGov API ${response.status}: ${response.statusText}`);

    const data = await response.json();
    const records = data.records || [];
    fetchedCount = records.length;
    if (fetchedCount === 0) return { fetched: 0, imported: 0, errors: ['No records returned from API for given filters'], observations: [] };

    // Build docs (actual data.gov.in fields: state, district, market, commodity, variety, grade, arrival_date, modal_price, min_price, max_price)
    const docs = records.map((r) => {
      const stateName    = r.state     || state      || 'Unknown';
      const districtName = r.district  || 'Unknown';
      const marketName   = r.market    || 'Unknown';
      const commName     = r.commodity || commodity  || 'Unknown';
      const variety      = r.variety   || '';
      const grade        = r.grade     || '';
      const obsDate      = parseDateString(r.arrival_date || r.date);
      const srcId = `datagov_${stateName}_${districtName}_${marketName}_${commName}_${obsDate.toISOString().split('T')[0]}_${variety}`.replace(/\s+/g, '_');
      return {
        source: 'datagov', sourceRecordId: srcId,
        state: stateName, district: districtName, market: marketName,
        commodity: commName, variety, grade,
        observationDate: obsDate.toISOString(),
        modalPricePaise: toPaise(r.modal_price), minPricePaise: toPaise(r.min_price), maxPricePaise: toPaise(r.max_price),
        arrivals: parseFloat(r.arrivals) || 0, unit: 'quintal',
        importMethod: 'api', dataQuality: 'good', retrievedAt: new Date().toISOString()
      };
    });

    // Single bulk dedup query (fetch all existing sourceRecordIds for this source)
    const existingSnap = await db.collection('mandiObservations').where('source', '==', 'datagov').get();
    const existingIds = new Set(existingSnap.docs.map(d => d.data().sourceRecordId));
    const newDocs = docs.filter(d => !existingIds.has(d.sourceRecordId));

    if (newDocs.length === 0) return { fetched: fetchedCount, imported: 0, errors: ['All records already saved — no new data'], observations: [] };

    // Batch commit in chunks of 400 (Firestore limit: 500/batch)
    const CHUNK = 400;
    for (let i = 0; i < newDocs.length; i += CHUNK) {
      const chunk = newDocs.slice(i, i + CHUNK);
      const batch = db.batch();
      chunk.forEach(doc => batch.set(db.collection('mandiObservations').doc(), doc));
      await batch.commit();
      imported.push(...chunk);
    }

    return { fetched: fetchedCount, imported: imported.length, errors: [], observations: imported };
  } catch (err) {
    console.error('[MandiService] fetchFromDataGov error:', err.message);
    return { fetched: fetchedCount, imported: imported.length, errors: [err.message], observations: [] };
  }
};

/**
 * 2. importFromCSV
 */
const importFromCSV = async (filePath) => {
  let imported = 0, skipped = 0;
  const errors = [];
  try {
    const db = getDb();
    if (!db) throw new Error('Database service unavailable');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
    const batch = db.batch();
    let batchCount = 0;
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const state = row.state || row.State;
        const district = row.district || row.District;
        const market = row.market || row.Market;
        const commodity = row.commodity || row.Commodity;
        const rawDate = row.date || row.Date || row.arrival_date;
        if (!state || !market || !commodity || !rawDate) { skipped++; continue; }
        const obsDate = parseDateString(rawDate);
        const srcId = `csv_${state}_${district}_${market}_${commodity}_${obsDate.toISOString().split('T')[0]}`.replace(/\s+/g, '_');
        const doc = {
          source: 'csv_import', sourceRecordId: srcId, state: state || '', district: district || '',
          market, commodity, variety: row.variety || '', grade: row.grade || '',
          observationDate: obsDate.toISOString(),
          modalPricePaise: toPaise(row.modal_price || row.price),
          minPricePaise: toPaise(row.min_price || row.modal_price),
          maxPricePaise: toPaise(row.max_price || row.modal_price),
          arrivals: parseFloat(row.arrivals) || 0, unit: row.unit || 'quintal',
          importMethod: 'csv_upload', dataQuality: 'good', retrievedAt: new Date().toISOString()
        };
        batch.set(db.collection('mandiObservations').doc(), doc);
        batchCount++;
        imported++;
        if (batchCount === 400) { await batch.commit(); batchCount = 0; }
      } catch (e) { skipped++; errors.push(e.message); }
    }
    if (batchCount > 0) await batch.commit();
    return { imported, skipped, errors };
  } catch (err) {
    return { imported, skipped, errors: [err.message] };
  }
};

/**
 * 3. getObservations
 */
const getObservations = async (filters = {}) => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');

  let query = db.collection('mandiObservations');
  if (filters.state)     query = query.where('state', '==', filters.state);
  if (filters.district && filters.district !== 'undefined')  query = query.where('district', '==', filters.district);
  if (filters.market)    query = query.where('market', '==', filters.market);
  if (filters.commodity) query = query.where('commodity', '==', filters.commodity);

  const snap = await query.get();
  let records = toDocs(snap);

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    records = records.filter(r => new Date(r.observationDate).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    records = records.filter(r => new Date(r.observationDate).getTime() <= to);
  }
  records.sort((a, b) => new Date(b.observationDate || 0) - new Date(a.observationDate || 0));

  const page  = parseInt(filters.page,  10) || 1;
  const limit = parseInt(filters.limit, 10) || 50;
  const total = records.length;
  const paginated = records.slice((page - 1) * limit, page * limit);

  return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, observations: paginated };
};

/**
 * 4. compareMarkets
 */
const compareMarkets = async ({ commodity, markets = [], targetDate = new Date() }) => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');
  const target = new Date(targetDate);
  const thirtyDaysAgo = new Date(target.getTime() - 30 * 24 * 60 * 60 * 1000);
  const marketList = Array.isArray(markets) ? markets : (typeof markets === 'string' ? markets.split(',').map(m => m.trim()) : []);

  const snap = await db.collection('mandiObservations').where('commodity', '==', commodity).get();
  const allObs = toDocs(snap);
  const results = [];

  for (const mkt of marketList) {
    const matching = allObs.filter(o => {
      if (!o.market || o.market.toLowerCase() !== mkt.toLowerCase()) return false;
      const d = new Date(o.observationDate);
      return d >= thirtyDaysAgo && d <= new Date(target.getTime() + 5 * 86400000);
    }).sort((a, b) => new Date(b.observationDate) - new Date(a.observationDate));

    const obs = matching[0] || null;
    if (obs) {
      const diffDays = Math.floor(Math.abs(target - new Date(obs.observationDate)) / 86400000);
      results.push({ market: mkt, district: obs.district, state: obs.state, commodity: obs.commodity,
        variety: obs.variety, observationDate: obs.observationDate,
        modalPricePaise: obs.modalPricePaise, minPricePaise: obs.minPricePaise, maxPricePaise: obs.maxPricePaise,
        arrivals: obs.arrivals, observationId: obs.id,
        freshness: diffDays === 0 ? 'today' : diffDays <= 2 ? 'recent' : diffDays <= 7 ? 'moderate' : 'stale',
        daysDifference: diffDays });
    } else {
      results.push({ market: mkt, commodity, freshness: 'unavailable', modalPricePaise: null, observationDate: null });
    }
  }
  return results.sort((a, b) => (b.modalPricePaise || 0) - (a.modalPricePaise || 0));
};

/**
 * 5. calculateNetProceeds
 */
const calculateNetProceeds = async ({ observationId, quantityKg, transportPaise = 0, labourPaise = 0, packagingPaise = 0, commissionPct = 0, otherPaise = 0 }) => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');
  const doc = await db.collection('mandiObservations').doc(observationId).get();
  if (!doc.exists) throw new Error('Mandi observation not found');
  const obs = { id: doc.id, ...doc.data() };
  const qKg = parseFloat(quantityKg);
  if (isNaN(qKg) || qKg <= 0) throw new Error('Valid quantityKg required');
  const qQtl = qKg / 100;
  const gross = Math.round((obs.modalPricePaise || 0) * qQtl);
  const commPct = parseFloat(commissionPct) || 0;
  const commPaise = Math.round(gross * commPct / 100);
  const tP = parseInt(transportPaise) || 0, lP = parseInt(labourPaise) || 0, pP = parseInt(packagingPaise) || 0, oP = parseInt(otherPaise) || 0;
  const totalDeductions = tP + lP + pP + commPaise + oP;
  const net = gross - totalDeductions;
  return {
    observation: { id: obs.id, market: obs.market, district: obs.district, state: obs.state, commodity: obs.commodity, modalPricePaise: obs.modalPricePaise, observationDate: obs.observationDate },
    quantityKg: qKg, quantityInQuintals: qQtl, grossAmountPaise: gross,
    deductions: { transportPaise: tP, labourPaise: lP, packagingPaise: pP, commissionPct: commPct, commissionPaise: commPaise, otherPaise: oP, totalDeductionsPaise: totalDeductions },
    netAmountPaise: net, effectivePricePerKgPaise: qKg > 0 ? Math.round(net / qKg) : 0
  };
};

module.exports = { fetchFromDataGov, importFromCSV, getObservations, compareMarkets, calculateNetProceeds };
