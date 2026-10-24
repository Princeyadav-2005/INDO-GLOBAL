'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const dbCheck = (res) => {
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, message: 'Database unavailable' });
    return null;
  }
  return db;
};

// Global settlement formatter
const formatSettlement = (data) => {
  if (!data) return null;
  return {
    ...data,
    totalExpenses: data.totalExpensesPaise != null ? data.totalExpensesPaise : (data.totalExpenses || 0),
    totalExpensesPaise: data.totalExpensesPaise != null ? data.totalExpensesPaise : (data.totalExpenses || 0),
    grossSales: data.grossSalePaise != null ? data.grossSalePaise : (data.grossSales || 0),
    grossSalePaise: data.grossSalePaise != null ? data.grossSalePaise : (data.grossSales || 0),
    netProfit: data.netSalePaise != null ? data.netSalePaise : (data.netProfit || 0),
    netSalePaise: data.netSalePaise != null ? data.netSalePaise : (data.netProfit || 0),
    ownerShare: data.calculatedOwnerSharePaise != null ? data.calculatedOwnerSharePaise : (data.ownerShare || 0),
    calculatedOwnerSharePaise: data.calculatedOwnerSharePaise != null ? data.calculatedOwnerSharePaise : (data.ownerShare || 0),
    operatorShare: data.calculatedOperatorSharePaise != null ? data.calculatedOperatorSharePaise : (data.operatorShare || 0),
    calculatedOperatorSharePaise: data.calculatedOperatorSharePaise != null ? data.calculatedOperatorSharePaise : (data.operatorShare || 0),
    isPaise: true
  };
};

// Compute and save settlement helper
const computeSettlement = async (db, seasonId) => {
  const [expSnap, saleSnap, disputeSnap, seasonDoc] = await Promise.all([
    db.collection('expenses').where('seasonId', '==', seasonId).get(),
    db.collection('saleTransactions').where('seasonId', '==', seasonId).get(),
    db.collection('disputes').where('seasonId', '==', seasonId).get(),
    db.collection('seasons').doc(seasonId).get()
  ]);

  if (!seasonDoc.exists) return null;
  const season = { id: seasonDoc.id, ...seasonDoc.data() };
  const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sales = saleSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const totalExpensesPaise = expenses.reduce((s, e) => s + (e.amountPaise || 0), 0);
  const acknowledged = expenses.filter(e => e.reviewStatus === 'acknowledged' || e.reviewStatus === 'approved');
  const disputed = expenses.filter(e => e.reviewStatus === 'disputed');
  const pending = expenses.filter(e => e.reviewStatus === 'pending');
  const grossSalePaise = sales.reduce((s, t) => s + (t.grossAmountPaise || 0), 0);
  const saleDeductionsPaise = sales.reduce((s, t) => s + (t.deductions || []).reduce((ds, d) => ds + (d.amountPaise || 0), 0), 0);
  const netSalePaise = sales.reduce((s, t) => s + (t.netAmountPaise || 0), 0);
  const terms = season.agreementTerms || {};
  const ownerPct = (terms.ownerShare != null ? terms.ownerShare : 50) / 100;
  const operatorPct = (terms.operatorShare != null ? terms.operatorShare : 50) / 100;

  const settlData = {
    seasonId,
    farmId: season.farmId || '',
    totalExpensesPaise,
    acknowledgedExpensesPaise: acknowledged.reduce((s, e) => s + (e.amountPaise || 0), 0),
    disputedExpensesPaise: disputed.reduce((s, e) => s + (e.amountPaise || 0), 0),
    pendingExpensesPaise: pending.reduce((s, e) => s + (e.amountPaise || 0), 0),
    advancesPaidPaise: 0,
    grossSalePaise,
    saleDeductionsPaise,
    netSalePaise,
    calculatedOwnerSharePaise: Math.round(netSalePaise * ownerPct),
    calculatedOperatorSharePaise: Math.round(netSalePaise * operatorPct),
    agreedSharingTerms: terms,
    status: 'draft',
    acknowledgements: [],
    lastCalculatedAt: new Date().toISOString(),
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

  return { id: settlId, ...settlData };
};

// GET /:seasonId
router.get('/:seasonId', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId } = req.params;
    const settlSnap = await db.collection('settlements').where('seasonId', '==', seasonId).limit(1).get();

    if (!settlSnap.empty) {
      const settlement = { id: settlSnap.docs[0].id, ...settlSnap.docs[0].data() };
      return res.json({ success: true, data: formatSettlement(settlement) });
    }

    const calculated = await computeSettlement(db, seasonId);
    if (!calculated) return res.status(404).json({ success: false, message: 'Season not found.' });

    return res.json({ success: true, data: formatSettlement(calculated) });
  } catch (err) { next(err); }
});

// POST /:seasonId/calculate
router.post('/:seasonId/calculate', async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { seasonId } = req.params;
    const updated = await computeSettlement(db, seasonId);
    if (!updated) return res.status(404).json({ success: false, message: 'Season not found.' });

    return res.json({
      success: true,
      message: 'Settlement calculated.',
      data: formatSettlement(updated)
    });
  } catch (err) { next(err); }
});

// Acknowledge handler function (supports both POST and PATCH)
const handleAcknowledge = async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    let snap = await db.collection('settlements').where('seasonId', '==', req.params.seasonId).limit(1).get();

    if (snap.empty) {
      // Auto-compute settlement first if not already saved
      await computeSettlement(db, req.params.seasonId);
      snap = await db.collection('settlements').where('seasonId', '==', req.params.seasonId).limit(1).get();
    }

    if (snap.empty) return res.status(404).json({ success: false, message: 'Settlement not found.' });

    const doc = snap.docs[0];
    const sett = doc.data();
    const { status: ackStatus, comment, role } = req.body || {};

    const entry = {
      party: req.user.id,
      userName: req.user.name || '',
      role: role || 'farmer',
      status: ackStatus || 'accepted',
      comment: comment || '',
      timestamp: new Date().toISOString()
    };

    const acknowledgements = [...(sett.acknowledgements || []).filter(a => a.party !== req.user.id), entry];
    const updates = { acknowledgements, updatedAt: new Date().toISOString() };

    // If both owner and operator acknowledged, status finalized
    const hasOwner = acknowledgements.some(a => a.role === 'owner' && a.status === 'accepted');
    const hasOperator = acknowledgements.some(a => a.role === 'operator' && a.status === 'accepted');
    if (hasOwner && hasOperator) updates.status = 'finalized';
    else if (acknowledgements.length > 0) updates.status = 'acknowledged';

    await doc.ref.update(updates);
    const updated = { id: doc.id, ...sett, ...updates };

    return res.json({
      success: true,
      message: 'Settlement acknowledged.',
      data: formatSettlement(updated)
    });
  } catch (err) { next(err); }
};

// Route handlers for acknowledge (both POST and PATCH)
router.post('/:seasonId/acknowledge', handleAcknowledge);
router.patch('/:seasonId/acknowledge', handleAcknowledge);

module.exports = router;
