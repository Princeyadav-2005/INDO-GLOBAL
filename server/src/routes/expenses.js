'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { uploadReceipt } = require('../middleware/upload');
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

// GET /summary
router.get('/summary', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId, farmId } = req.query;
    let query = db.collection('expenses');
    if (seasonId) query = query.where('seasonId', '==', seasonId);
    else if (farmId) query = query.where('farmId', '==', farmId);
    else return res.status(400).json({ success: false, message: 'seasonId or farmId required.' });

    const snap = await query.get();
    const expenses = toDocs(snap);
    const categoryMap = {};
    let withReceipt = 0, withoutReceipt = 0;

    expenses.forEach(e => {
      const cat = e.category || 'other';
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, totalAmountPaise: 0, count: 0 };
      categoryMap[cat].totalAmountPaise += e.amountPaise || 0;
      categoryMap[cat].count++;
      if (e.attachmentIds && e.attachmentIds.length > 0) withReceipt++; else withoutReceipt++;
    });

    return res.json({ success: true, data: {
      totalPaise: expenses.reduce((s, e) => s + (e.amountPaise || 0), 0),
      totalCount: expenses.length, withReceiptCount: withReceipt, withoutReceiptCount: withoutReceipt,
      byCategory: Object.values(categoryMap).sort((a, b) => b.totalAmountPaise - a.totalAmountPaise)
    }});
  } catch (err) { next(err); }
});

// GET /
router.get('/', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId, farmId, category, dateFrom, dateTo, reviewStatus } = req.query;
    let query = db.collection('expenses');

    if (seasonId) query = query.where('seasonId', '==', seasonId);
    else if (farmId) query = query.where('farmId', '==', farmId);
    else return res.status(400).json({ success: false, message: 'seasonId or farmId required.' });

    const snap = await query.get();
    let expenses = toDocs(snap);

    if (category) expenses = expenses.filter(e => e.category === category);
    if (reviewStatus) expenses = expenses.filter(e => e.reviewStatus === reviewStatus);
    if (dateFrom) expenses = expenses.filter(e => e.date >= new Date(dateFrom).toISOString());
    if (dateTo) expenses = expenses.filter(e => e.date <= new Date(dateTo).toISOString());
    expenses.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

    return res.json({ success: true, data: expenses, total: expenses.length });
  } catch (err) { next(err); }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId, farmId, category, description, amountRupees, amountPaise, date, paymentMethod, quantity, unit, notes, voiceTranscript, dataSource } = req.body;
    if (!seasonId || !farmId || !category || !description || (!amountRupees && !amountPaise)) {
      return res.status(400).json({ success: false, message: 'seasonId, farmId, category, description, and amount are required.' });
    }

    const paise = amountPaise != null ? Math.round(Number(amountPaise)) : Math.round(parseFloat(amountRupees || 0) * 100);
    const data = {
      seasonId, farmId, category, description: description.trim(),
      amountPaise: paise, date: date ? new Date(date).toISOString() : new Date().toISOString(),
      paymentMethod: paymentMethod || 'cash',
      quantity: quantity != null ? parseFloat(quantity) : null, unit: unit || null,
      notes: notes || '', voiceTranscript: voiceTranscript || null,
      dataSource: dataSource || 'manual', reviewStatus: 'pending',
      attachmentIds: [], editHistory: [], createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('expenses').add(data);
    const expense = { id: ref.id, ...data };
    await logAudit({ entityType: 'expense', entityId: ref.id, action: 'create', after: expense, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Expense recorded.', data: expense });
  } catch (err) { next(err); }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const expense = toObj(doc);
    // Fetch attachments
    if (expense.attachmentIds && expense.attachmentIds.length > 0) {
      const attSnaps = await Promise.all(expense.attachmentIds.map(aid => db.collection('attachments').doc(aid).get()));
      expense.attachments = attSnaps.map(toObj).filter(Boolean);
    } else {
      const attSnap = await db.collection('attachments').where('entityType', '==', 'expense').where('entityId', '==', req.params.id).get();
      expense.attachments = toDocs(attSnap);
    }
    return res.json({ success: true, data: expense });
  } catch (err) { next(err); }
});

// PATCH /:id
router.patch('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const expense = toObj(doc);

    const allowed = ['category', 'description', 'amountRupees', 'amountPaise', 'date', 'paymentMethod', 'quantity', 'unit', 'notes'];
    const updates = { updatedAt: new Date().toISOString() };
    const historyEntry = { changedBy: req.user.id, changedAt: new Date().toISOString(), reason: req.body.reason || '', fields: [] };

    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        let newVal = req.body[f];
        if (f === 'amountRupees') { updates.amountPaise = Math.round(parseFloat(newVal) * 100); historyEntry.fields.push({ field: 'amountPaise', oldValue: expense.amountPaise, newValue: updates.amountPaise }); return; }
        if (f === 'amountPaise') { updates.amountPaise = Math.round(Number(newVal)); historyEntry.fields.push({ field: f, oldValue: expense[f], newValue: updates[f] }); return; }
        if (f === 'date') newVal = new Date(newVal).toISOString();
        if (expense[f] !== newVal) historyEntry.fields.push({ field: f, oldValue: expense[f], newValue: newVal });
        updates[f] = newVal;
      }
    });

    const editHistory = [...(expense.editHistory || []), historyEntry];
    updates.editHistory = editHistory;

    await db.collection('expenses').doc(req.params.id).update(updates);
    const updated = toObj(await db.collection('expenses').doc(req.params.id).get());
    await logAudit({ entityType: 'expense', entityId: req.params.id, action: 'update', before: expense, after: updated, changedBy: req.user.id, reason: req.body.reason });
    return res.json({ success: true, message: 'Expense updated.', data: updated });
  } catch (err) { next(err); }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const expense = toObj(doc);
    if (expense.reviewStatus !== 'pending') return res.status(400).json({ success: false, message: 'Only pending expenses can be deleted.' });
    await db.collection('expenses').doc(req.params.id).delete();
    await logAudit({ entityType: 'expense', entityId: req.params.id, action: 'delete', before: expense, changedBy: req.user.id });
    return res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) { next(err); }
});

// POST /:id/attachments
router.post('/:id/attachments', uploadReceipt, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });

    const attData = {
      filename: req.file.filename, originalName: req.file.originalname,
      mimeType: req.file.mimetype, sizeBytes: req.file.size,
      filePath: req.file.path.replace(/\\/g, '/'),
      uploadedBy: req.user.id, entityType: 'expense', entityId: req.params.id,
      reviewStatus: 'pending', createdAt: new Date().toISOString()
    };
    const attRef = await db.collection('attachments').add(attData);
    const expense = toObj(doc);
    const attachmentIds = [...(expense.attachmentIds || []), attRef.id];
    await db.collection('expenses').doc(req.params.id).update({ attachmentIds, updatedAt: new Date().toISOString() });
    await logAudit({ entityType: 'expense', entityId: req.params.id, action: 'upload', after: { attachmentId: attRef.id }, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Attachment uploaded.', data: { id: attRef.id, ...attData } });
  } catch (err) { next(err); }
});

// GET /:id/attachments
router.get('/:id/attachments', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('attachments').where('entityType', '==', 'expense').where('entityId', '==', req.params.id).get();
    return res.json({ success: true, data: toDocs(snap) });
  } catch (err) { next(err); }
});

// POST /:id/review
router.post('/:id/review', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { reviewStatus } = req.body;
    const valid = ['pending', 'acknowledged', 'approved'];
    if (!valid.includes(reviewStatus)) return res.status(400).json({ success: false, message: 'Invalid reviewStatus.' });
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const before = { reviewStatus: doc.data().reviewStatus };
    await db.collection('expenses').doc(req.params.id).update({ reviewStatus, updatedAt: new Date().toISOString() });
    await logAudit({ entityType: 'expense', entityId: req.params.id, action: 'review', before, after: { reviewStatus }, changedBy: req.user.id });
    return res.json({ success: true, message: `Expense marked as ${reviewStatus}.` });
  } catch (err) { next(err); }
});

// POST /:id/dispute
router.post('/:id/dispute', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Dispute description is required.' });
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const expense = toObj(doc);

    const disputeData = {
      expenseId: req.params.id, seasonId: expense.seasonId || '', raisedBy: req.user.id,
      description, evidence: [], status: 'open', responses: [], resolution: null,
      createdAt: new Date().toISOString()
    };
    const dRef = await db.collection('disputes').add(disputeData);
    await db.collection('expenses').doc(req.params.id).update({ reviewStatus: 'disputed', updatedAt: new Date().toISOString() });
    await logAudit({ entityType: 'expense', entityId: req.params.id, action: 'dispute', after: { disputeId: dRef.id }, changedBy: req.user.id });
    return res.status(201).json({ success: true, message: 'Dispute raised.', data: { id: dRef.id, ...disputeData } });
  } catch (err) { next(err); }
});

module.exports = router;
