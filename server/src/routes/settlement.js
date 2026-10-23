'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const dbCheck = (res) => { const db = getDb(); if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; } return db; };

// GET /:seasonId
router.get('/:seasonId', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId } = req.params;
    const [expSnap, saleSnap, settlSnap, seasonDoc] = await Promise.all([
      db.collection('expenses').where('seasonId', '==', seasonId).get(),
      db.collection('saleTransactions').where('seasonId', '==', seasonId).get(),
      db.collection('settlements').where('seasonId', '==', seasonId).limit(1).get(),
      db.collection('seasons').doc(seasonId).get()
    ]);

    if (!seasonDoc.exists) return res.status(404).json({ success: false, message: 'Season not found.' });
    const season = { id: seasonDoc.id, ...seasonDoc.data() };
    const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sales = saleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const settlement = settlSnap.empty ? null : { id: settlSnap.docs[0].id, ...settlSnap.docs[0].data() };

    if (settlement) return res.json({ success: true, data: settlement });

    // Return computed draft
    const totalExpensesPaise = expenses.reduce((s, e) => s + (e.amountPaise || 0), 0);
    const grossSalePaise = sales.reduce((s, t) => s + (t.grossAmountPaise || 0), 0);
    const netSalePaise = sales.reduce((s, t) => s + (t.netAmountPaise || 0), 0);
    const terms = season.agreementTerms || {};
    const ownerPct = (terms.ownerShare || 100) / 100;
    const operatorPct = (terms.operatorShare || 0) / 100;

    return res.json({ success: true, data: {
      seasonId, farmId: season.farmId, status: 'draft',
      totalExpensesPaise, grossSalePaise, netSalePaise,
      calculatedOwnerSharePaise: Math.round(netSalePaise * ownerPct),
      calculatedOperatorSharePaise: Math.round(netSalePaise * operatorPct),
      agreedSharingTerms: terms, lastCalculatedAt: new Date().toISOString()
    }});
  } catch (err) { next(err); }
});

// POST /:seasonId/calculate
router.post('/:seasonId/calculate', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId } = req.params;
    const [expSnap, saleSnap, disputeSnap, seasonDoc] = await Promise.all([
      db.collection('expenses').where('seasonId', '==', seasonId).get(),
      db.collection('saleTransactions').where('seasonId', '==', seasonId).get(),
      db.collection('disputes').where('seasonId', '==', seasonId).get(),
      db.collection('seasons').doc(seasonId).get()
    ]);

    if (!seasonDoc.exists) return res.status(404).json({ success: false, message: 'Season not found.' });
    const season = { id: seasonDoc.id, ...seasonDoc.data() };
    const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sales = saleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const disputes = disputeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalExpensesPaise = expenses.reduce((s, e) => s + (e.amountPaise || 0), 0);
    const acknowledged = expenses.filter(e => e.reviewStatus === 'acknowledged' || e.reviewStatus === 'approved');
    const disputed = expenses.filter(e => e.reviewStatus === 'disputed');
    const pending = expenses.filter(e => e.reviewStatus === 'pending');
    const grossSalePaise = sales.reduce((s, t) => s + (t.grossAmountPaise || 0), 0);
    const saleDeductionsPaise = sales.reduce((s, t) => s + (t.deductions || []).reduce((ds, d) => ds + (d.amountPaise || 0), 0), 0);
    const netSalePaise = sales.reduce((s, t) => s + (t.netAmountPaise || 0), 0);
    const terms = season.agreementTerms || {};
    const ownerPct = (terms.ownerShare || 100) / 100;
    const operatorPct = (terms.operatorShare || 0) / 100;

    const settlData = {
      seasonId, farmId: season.farmId || '',
      totalExpensesPaise, acknowledgedExpensesPaise: acknowledged.reduce((s, e) => s + (e.amountPaise || 0), 0),
      disputedExpensesPaise: disputed.reduce((s, e) => s + (e.amountPaise || 0), 0),
      pendingExpensesPaise: pending.reduce((s, e) => s + (e.amountPaise || 0), 0),
      advancesPaidPaise: 0, grossSalePaise, saleDeductionsPaise, netSalePaise,
      calculatedOwnerSharePaise: Math.round(netSalePaise * ownerPct),
      calculatedOperatorSharePaise: Math.round(netSalePaise * operatorPct),
      agreedSharingTerms: terms, status: 'draft',
      acknowledgements: [], lastCalculatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existing = await db.collection('settlements').where('seasonId', '==', seasonId).limit(1).get();
    let settlId;
    if (existing.empty) {
      settlData.createdAt = new Date().toISOString();
      const ref = await db.collection('settlements').add(settlData);
      settlId = ref.id;
    } else {
      settlId = existing.docs[0].id;
      await existing.docs[0].ref.update(settlData);
    }

    return res.json({ success: true, message: 'Settlement calculated.', data: { id: settlId, ...settlData } });
  } catch (err) { next(err); }
});

// PATCH /:seasonId/acknowledge
router.patch('/:seasonId/acknowledge', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('settlements').where('seasonId', '==', req.params.seasonId).limit(1).get();
    if (snap.empty) return res.status(404).json({ success: false, message: 'Settlement not found.' });
    const doc = snap.docs[0];
    const sett = doc.data();
    const { status: ackStatus, comment, role } = req.body;

    const entry = { party: req.user.id, role: role || 'farmer', status: ackStatus || 'accepted', comment: comment || '', timestamp: new Date().toISOString() };
    const acknowledgements = [...(sett.acknowledgements || []).filter(a => a.party !== req.user.id), entry];
    const allAccepted = acknowledgements.every(a => a.status === 'accepted');
    await doc.ref.update({ acknowledgements, status: allAccepted ? 'acknowledged' : 'under_review', updatedAt: new Date().toISOString() });

    return res.json({ success: true, message: 'Acknowledgement recorded.', data: { id: doc.id, acknowledgements, status: allAccepted ? 'acknowledged' : 'under_review' } });
  } catch (err) { next(err); }
});

module.exports = router;
