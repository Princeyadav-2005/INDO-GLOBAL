'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticate);

const toObj = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);
const toDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const dbCheck = (res) => {
  const db = getDb();
  if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; }
  return db;
};

const verifyFarmAccess = async (db, farmId, userId) => {
  const doc = await db.collection('farms').doc(farmId).get();
  if (!doc.exists) { const e = new Error('Farm not found'); e.status = 404; throw e; }
  const farm = toObj(doc);
  const ownerId = farm.ownerId || farm.owner;
  const ops = farm.operatorIds || farm.operators || [];
  if (String(ownerId) !== String(userId) && !ops.some((o) => String(o) === String(userId))) {
    const e = new Error('Access denied to this farm.'); e.status = 403; throw e;
  }
  return farm;
};

// GET /
router.get('/', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { farmId, plotId, status } = req.query;
    let seasons = [];

    if (farmId) {
      await verifyFarmAccess(db, farmId, req.user.id);
      const snap = await db.collection('seasons').where('farmId', '==', farmId).get();
      seasons = toDocs(snap);
    } else {
      // Get all farms the user can access
      const [o1, o2, op1, op2] = await Promise.all([
        db.collection('farms').where('ownerId', '==', req.user.id).get(),
        db.collection('farms').where('owner', '==', req.user.id).get(),
        db.collection('farms').where('operatorIds', 'array-contains', req.user.id).get(),
        db.collection('farms').where('operators', 'array-contains', req.user.id).get()
      ]);
      const farmIds = new Set([...toDocs(o1), ...toDocs(o2), ...toDocs(op1), ...toDocs(op2)].map(f => f.id));
      const snaps = await Promise.all([...farmIds].map(fid => db.collection('seasons').where('farmId', '==', fid).get()));
      const map = new Map();
      snaps.forEach(s => toDocs(s).forEach(d => map.set(d.id, d)));
      seasons = [...map.values()];
    }

    if (plotId) seasons = seasons.filter(s => s.plotId === plotId || s.plot === plotId);
    if (status) seasons = seasons.filter(s => s.status === status);
    seasons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({ success: true, data: seasons });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { farmId, plotId, crop, variety, startDate, expectedHarvestDate, agreementTerms, participants, notes } = req.body;
    if (!farmId || !crop || !startDate) return res.status(400).json({ success: false, message: 'farmId, crop, and startDate are required.' });
    await verifyFarmAccess(db, farmId, req.user.id);

    const data = {
      farmId, farm: farmId, plotId: plotId || '', plot: plotId || '',
      crop: crop.trim(), variety: variety || '',
      startDate: new Date(startDate).toISOString(),
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate).toISOString() : null,
      actualHarvestDate: null,
      status: 'planning',
      agreementTerms: agreementTerms || { ownerShare: 100, operatorShare: 0, expenseResponsibility: 'shared' },
      participants: participants || [{ userId: req.user.id, role: 'owner' }],
      notes: notes || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('seasons').add(data);
    const season = { id: ref.id, ...data };
    await logAudit({ entityType: 'season', entityId: ref.id, action: 'create', after: season, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Season created.', data: season });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('seasons').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Season not found.' });
    const season = toObj(doc);
    if (season.farmId) await verifyFarmAccess(db, season.farmId, req.user.id).catch(() => {});
    return res.json({ success: true, data: season });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// PATCH /:id
router.patch('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('seasons').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Season not found.' });
    const season = toObj(doc);
    await verifyFarmAccess(db, season.farmId, req.user.id);

    const allowed = ['crop', 'variety', 'startDate', 'expectedHarvestDate', 'actualHarvestDate', 'status', 'agreementTerms', 'participants', 'notes'];
    const updates = { updatedAt: new Date().toISOString() };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.startDate) updates.startDate = new Date(updates.startDate).toISOString();
    if (updates.expectedHarvestDate) updates.expectedHarvestDate = new Date(updates.expectedHarvestDate).toISOString();

    await db.collection('seasons').doc(req.params.id).update(updates);
    const updated = toObj(await db.collection('seasons').doc(req.params.id).get());
    await logAudit({ entityType: 'season', entityId: req.params.id, action: 'update', before: season, after: updated, changedBy: req.user.id });
    return res.json({ success: true, message: 'Season updated.', data: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// GET /:id/summary
router.get('/:id/summary', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('seasons').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Season not found.' });
    const season = toObj(doc);

    const [expSnap, harvestSnap, settlSnap] = await Promise.all([
      db.collection('expenses').where('seasonId', '==', req.params.id).get(),
      db.collection('harvestRecords').where('seasonId', '==', req.params.id).limit(1).get(),
      db.collection('settlements').where('seasonId', '==', req.params.id).limit(1).get()
    ]);

    const expenses = toDocs(expSnap);
    const totalPaise = expenses.reduce((s, e) => s + (e.amountPaise || 0), 0);
    const categoryBreakdown = {};
    expenses.forEach(e => {
      if (!categoryBreakdown[e.category]) categoryBreakdown[e.category] = { totalPaise: 0, count: 0 };
      categoryBreakdown[e.category].totalPaise += e.amountPaise || 0;
      categoryBreakdown[e.category].count++;
    });

    return res.json({
      success: true,
      data: {
        season,
        expenses: {
          totalExpensePaise: totalPaise,
          count: expenses.length,
          withReceiptCount: expenses.filter(e => e.attachmentIds && e.attachmentIds.length > 0).length,
          withoutReceiptCount: expenses.filter(e => !e.attachmentIds || e.attachmentIds.length === 0).length,
          categoryBreakdown: Object.entries(categoryBreakdown).map(([cat, v]) => ({ category: cat, ...v }))
        },
        harvest: harvestSnap.empty ? null : { id: harvestSnap.docs[0].id, ...harvestSnap.docs[0].data() },
        settlement: settlSnap.empty ? null : { id: settlSnap.docs[0].id, ...settlSnap.docs[0].data() }
      }
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

module.exports = router;
