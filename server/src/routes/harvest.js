'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticate);

const toObj = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);
const dbCheck = (res) => { const db = getDb(); if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; } return db; };

// POST /: create harvest record
router.post('/', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId, farmId, harvestDate, quantityKg, qualityGrade, notes } = req.body;
    if (!seasonId || !farmId || !harvestDate || quantityKg == null) {
      return res.status(400).json({ success: false, message: 'seasonId, farmId, harvestDate, and quantityKg are required.' });
    }
    const data = {
      seasonId, farmId, harvestDate: new Date(harvestDate).toISOString(),
      quantityKg: parseFloat(quantityKg), qualityGrade: qualityGrade || '',
      notes: notes || '', attachmentIds: [], createdBy: req.user.id, createdAt: new Date().toISOString()
    };
    const ref = await db.collection('harvestRecords').add(data);
    await db.collection('seasons').doc(seasonId).update({ status: 'harvested', actualHarvestDate: data.harvestDate, updatedAt: new Date().toISOString() }).catch(() => {});
    const harvest = { id: ref.id, ...data };
    await logAudit({ entityType: 'harvest', entityId: ref.id, action: 'create', after: harvest, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Harvest recorded.', data: harvest });
  } catch (err) { next(err); }
});

// GET /:seasonId
router.get('/:seasonId', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('harvestRecords').where('seasonId', '==', req.params.seasonId).get();
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// PATCH /:id
router.patch('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('harvestRecords').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Harvest record not found.' });
    const before = toObj(doc);
    const allowed = ['harvestDate', 'quantityKg', 'qualityGrade', 'notes'];
    const updates = { updatedAt: new Date().toISOString() };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = f === 'harvestDate' ? new Date(req.body[f]).toISOString() : f === 'quantityKg' ? parseFloat(req.body[f]) : req.body[f]; });
    await db.collection('harvestRecords').doc(req.params.id).update(updates);
    const updated = toObj(await db.collection('harvestRecords').doc(req.params.id).get());
    await logAudit({ entityType: 'harvest', entityId: req.params.id, action: 'update', before, after: updated, changedBy: req.user.id });
    return res.json({ success: true, message: 'Harvest record updated.', data: updated });
  } catch (err) { next(err); }
});

// POST /:id/sale
router.post('/:id/sale', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const harvestDoc = await db.collection('harvestRecords').doc(req.params.id).get();
    if (!harvestDoc.exists) return res.status(404).json({ success: false, message: 'Harvest record not found.' });
    const harvest = toObj(harvestDoc);

    const { saleDate, buyerName, buyerPhone, marketName, marketDistrict, marketState, quantitySoldKg, pricePerQuintalPaise, deductions, paymentMethod, paymentReference, notes } = req.body;
    if (!saleDate || quantitySoldKg == null || pricePerQuintalPaise == null) {
      return res.status(400).json({ success: false, message: 'saleDate, quantitySoldKg, and pricePerQuintalPaise are required.' });
    }

    const qKg = parseFloat(quantitySoldKg);
    const pricePQ = Math.round(Number(pricePerQuintalPaise));
    const grossPaise = Math.round(pricePQ * (qKg / 100));
    const deductionList = Array.isArray(deductions) ? deductions : [];
    const deductionTotal = deductionList.reduce((s, d) => s + (d.amountPaise || 0), 0);
    const netPaise = grossPaise - deductionTotal;

    const saleData = {
      harvestId: req.params.id, seasonId: harvest.seasonId || '', farmId: harvest.farmId || '',
      saleDate: new Date(saleDate).toISOString(), buyerName: buyerName || '', buyerPhone: buyerPhone || '',
      marketName: marketName || '', marketDistrict: marketDistrict || '', marketState: marketState || '',
      quantitySoldKg: qKg, pricePerQuintalPaise: pricePQ,
      grossAmountPaise: grossPaise, deductions: deductionList, netAmountPaise: netPaise,
      paymentMethod: paymentMethod || '', paymentReference: paymentReference || '',
      notes: notes || '', createdBy: req.user.id, createdAt: new Date().toISOString()
    };

    const ref = await db.collection('saleTransactions').add(saleData);
    // Update settlement gross amounts
    const seasonId = harvest.seasonId;
    if (seasonId) {
      const settlSnap = await db.collection('settlements').where('seasonId', '==', seasonId).limit(1).get();
      if (!settlSnap.empty) {
        const settlDoc = settlSnap.docs[0];
        const sett = settlDoc.data();
        await settlDoc.ref.update({
          grossSalePaise: (sett.grossSalePaise || 0) + grossPaise,
          netSalePaise: (sett.netSalePaise || 0) + netPaise,
          updatedAt: new Date().toISOString()
        });
      }
    }
    await logAudit({ entityType: 'saleTransaction', entityId: ref.id, action: 'create', after: { id: ref.id, ...saleData }, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Sale transaction recorded.', data: { id: ref.id, ...saleData } });
  } catch (err) { next(err); }
});

// GET /:id/sale
router.get('/:id/sale', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('saleTransactions').where('harvestId', '==', req.params.id).get();
    return res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) { next(err); }
});

module.exports = router;
