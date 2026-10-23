'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const mandiService = require('../services/mandiService');
const { authenticate } = require('../middleware/auth');
const { uploadCSV } = require('../middleware/upload');

const router = express.Router();

const toDocs = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const dbCheck = (res) => { const db = getDb(); if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; } return db; };

router.get('/states', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('mandiObservations').get();
    const states = [...new Set(toDocs(snap).map(d => d.state).filter(Boolean))].sort();
    return res.json({ success: true, data: states });
  } catch (err) { next(err); }
});

router.get('/mandis', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    let query = db.collection('mandiObservations');
    if (req.query.state) query = query.where('state', '==', req.query.state);
    if (req.query.district) query = query.where('district', '==', req.query.district);
    const snap = await query.get();
    const mandis = [...new Set(toDocs(snap).map(d => d.market).filter(Boolean))].sort();
    return res.json({ success: true, data: mandis });
  } catch (err) { next(err); }
});

router.get('/commodities', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('mandiObservations').get();
    const commodities = [...new Set(toDocs(snap).map(d => d.commodity).filter(Boolean))].sort();
    return res.json({ success: true, data: commodities });
  } catch (err) { next(err); }
});

router.get('/observations', authenticate, async (req, res, next) => {
  try {
    const result = await mandiService.getObservations(req.query);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/fetch', authenticate, async (req, res, next) => {
  try {
    const { state, commodity, dateFrom, dateTo } = req.body;
    const result = await mandiService.fetchFromDataGov({ state, commodity, dateFrom, dateTo });
    return res.json({ success: true, message: `Fetched ${result.fetched} records, stored ${result.imported}.`, data: result });
  } catch (err) { next(err); }
});

router.post('/import', authenticate, uploadCSV, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
    const result = await mandiService.importFromCSV(req.file.path);
    return res.json({ success: true, message: `CSV import: ${result.imported} imported, ${result.skipped} skipped.`, data: result });
  } catch (err) { next(err); }
});

router.get('/coverage', authenticate, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('mandiObservations').get();
    const map = {};
    toDocs(snap).forEach(d => {
      const key = `${d.state}|${d.commodity}`;
      if (!map[key]) map[key] = { state: d.state, commodity: d.commodity, count: 0, firstObservation: d.observationDate, latestObservation: d.observationDate, totalPrice: 0 };
      map[key].count++;
      map[key].totalPrice += d.modalPricePaise || 0;
      if (d.observationDate < map[key].firstObservation) map[key].firstObservation = d.observationDate;
      if (d.observationDate > map[key].latestObservation) map[key].latestObservation = d.observationDate;
    });
    const coverage = Object.values(map).map(c => ({ ...c, avgModalPricePaise: Math.round(c.totalPrice / c.count) }));
    return res.json({ success: true, data: coverage.sort((a, b) => a.state.localeCompare(b.state)) });
  } catch (err) { next(err); }
});

router.get('/compare', authenticate, async (req, res, next) => {
  try {
    const { commodity, markets, targetDate } = req.query;
    if (!commodity) return res.status(400).json({ success: false, message: 'commodity is required.' });
    const marketList = markets ? markets.split(',').map(m => m.trim()) : [];
    const result = await mandiService.compareMarkets({ commodity, markets: marketList, targetDate: targetDate ? new Date(targetDate) : new Date() });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/proceeds', authenticate, async (req, res, next) => {
  try {
    const { observationId, quantityKg, transportPaise = 0, labourPaise = 0, packagingPaise = 0, commissionPct = 0, otherPaise = 0 } = req.query;
    if (!observationId || !quantityKg) return res.status(400).json({ success: false, message: 'observationId and quantityKg are required.' });
    const result = await mandiService.calculateNetProceeds({ observationId, quantityKg, transportPaise, labourPaise, packagingPaise, commissionPct, otherPaise });
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
