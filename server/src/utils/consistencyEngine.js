'use strict';
const { getDb } = require('../config/firebase');

const toObj = (doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null);
const toDocs = (snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

async function runConsistencyChecks(seasonId, userId) {
  const db = getDb();
  const issues = [];
  if (!db || !seasonId) return issues;

  try {
    const [seasonDoc, expSnap, disputeSnap, settlSnap, harvestSnap] = await Promise.all([
      db.collection('seasons').doc(seasonId).get(),
      db.collection('expenses').where('seasonId', '==', seasonId).get(),
      db.collection('disputes').where('seasonId', '==', seasonId).get(),
      db.collection('settlements').where('seasonId', '==', seasonId).limit(1).get(),
      db.collection('harvestRecords').where('seasonId', '==', seasonId).limit(1).get()
    ]);

    const season = toObj(seasonDoc);
    if (!season) return issues;

    const expenses = toDocs(expSnap);
    const disputes = toDocs(disputeSnap);
    const settlement = settlSnap.docs.length ? { id: settlSnap.docs[0].id, ...settlSnap.docs[0].data() } : null;
    const harvest = harvestSnap.docs.length ? { id: harvestSnap.docs[0].id, ...harvestSnap.docs[0].data() } : null;

    // 1. DUPLICATE_EXPENSE
    const seen = new Map();
    const dupes = [];
    expenses.forEach((e) => {
      const key = `${e.category}|${e.date ? e.date.substring(0, 10) : ''}`;
      if (seen.has(key)) {
        const prev = seen.get(key);
        const diff = Math.abs((e.amountPaise || 0) - (prev.amountPaise || 0));
        const avg = ((e.amountPaise || 0) + (prev.amountPaise || 0)) / 2;
        if (avg > 0 && diff / avg <= 0.1) dupes.push(e.id, prev.id);
      } else {
        seen.set(key, e);
      }
    });
    if (dupes.length > 0) {
      issues.push({
        checkType: 'DUPLICATE_EXPENSE', severity: 'WARNING', isBlocking: false,
        title: 'Possible Duplicate Expenses',
        description: 'Two expenses in the same category, same date, and within 10% of each other amount.',
        affectedRecords: [...new Set(dupes)],
        suggestedAction: 'Review and remove duplicate entries if any.'
      });
    }

    // 2. MISSING_RECEIPT (> ₹500)
    const missingReceipt = expenses.filter((e) => (e.amountPaise || 0) > 50000 && !(e.attachmentIds && e.attachmentIds.length > 0));
    if (missingReceipt.length > 0) {
      issues.push({
        checkType: 'MISSING_RECEIPT', severity: 'INFO', isBlocking: false,
        title: 'Expenses Without Receipts',
        description: `${missingReceipt.length} expense(s) over ₹500 have no attached receipt.`,
        affectedRecords: missingReceipt.map((e) => e.id),
        suggestedAction: 'Attach bills or receipts as evidence.'
      });
    }

    // 3. SEASON_DATE_MISMATCH
    const startDate = season.startDate ? new Date(season.startDate) : null;
    const endDate = season.expectedHarvestDate ? new Date(season.expectedHarvestDate) : null;
    if (startDate && endDate) {
      const outOfRange = expenses.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d < startDate || d > endDate;
      });
      if (outOfRange.length > 0) {
        issues.push({
          checkType: 'SEASON_DATE_MISMATCH', severity: 'WARNING', isBlocking: false,
          title: 'Expenses Outside Season Dates',
          description: `${outOfRange.length} expense(s) are dated outside the season period.`,
          affectedRecords: outOfRange.map((e) => e.id),
          suggestedAction: 'Verify dates or adjust season start/end dates.'
        });
      }
    }

    // 4. LARGE_AMOUNT_NO_RECEIPT (> ₹5000)
    const largeNoReceipt = expenses.filter((e) => (e.amountPaise || 0) > 500000 && !(e.attachmentIds && e.attachmentIds.length > 0));
    if (largeNoReceipt.length > 0) {
      issues.push({
        checkType: 'LARGE_AMOUNT_NO_RECEIPT', severity: 'WARNING', isBlocking: false,
        title: 'Large Expenses Without Evidence',
        description: `${largeNoReceipt.length} expense(s) above ₹5,000 have no receipt.`,
        affectedRecords: largeNoReceipt.map((e) => e.id),
        suggestedAction: 'Upload receipt or invoice for large expenses.'
      });
    }

    // 5. STALE_MANDI_DATA
    if (season.crop) {
      try {
        const mandiSnap = await db.collection('mandiObservations')
          .where('commodity', '==', season.crop)
          .orderBy('observationDate', 'desc')
          .limit(1)
          .get();
        if (mandiSnap.docs.length > 0) {
          const latest = mandiSnap.docs[0].data();
          const obsDate = latest.observationDate ? new Date(latest.observationDate) : null;
          if (obsDate && (Date.now() - obsDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {
            issues.push({
              checkType: 'STALE_MANDI_DATA', severity: 'INFO', isBlocking: false,
              title: 'Mandi Data is Outdated',
              description: `Latest price data for ${season.crop} is more than 7 days old.`,
              affectedRecords: [mandiSnap.docs[0].id],
              suggestedAction: 'Fetch fresh mandi prices from Smart Mandi page.'
            });
          }
        }
      } catch (_) { /* orderBy may need index; skip */ }
    }

    // 6. SETTLEMENT_MISMATCH
    if (settlement) {
      const actualTotal = expenses.reduce((sum, e) => sum + (e.amountPaise || 0), 0);
      if (Math.abs((settlement.totalExpensesPaise || 0) - actualTotal) > 100) {
        issues.push({
          checkType: 'SETTLEMENT_MISMATCH', severity: 'ERROR', isBlocking: true,
          title: 'Settlement Total Mismatch',
          description: `Settlement shows ₹${((settlement.totalExpensesPaise || 0) / 100).toFixed(2)} but actual expenses total ₹${(actualTotal / 100).toFixed(2)}.`,
          affectedRecords: [settlement.id],
          suggestedAction: 'Recalculate settlement from the Khet Hisab page.'
        });
      }
    }

    // 7. UNRESOLVED_DISPUTES
    const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');
    if (openDisputes.length > 0) {
      issues.push({
        checkType: 'UNRESOLVED_DISPUTES', severity: 'WARNING', isBlocking: false,
        title: 'Unresolved Disputes',
        description: `${openDisputes.length} dispute(s) are still open or under review.`,
        affectedRecords: openDisputes.map((d) => d.id),
        suggestedAction: 'Resolve all disputes before finalizing settlement.'
      });
    }

    // 8. MISSING_HARVEST
    if (season.status === 'harvested' && !harvest) {
      issues.push({
        checkType: 'MISSING_HARVEST', severity: 'ERROR', isBlocking: true,
        title: 'Missing Harvest Record',
        description: 'Season is marked harvested but no harvest record exists.',
        affectedRecords: [seasonId],
        suggestedAction: 'Add harvest details from the Khet Hisab page.'
      });
    }
  } catch (err) {
    console.error('[ConsistencyEngine] Error:', err.message);
  }

  return issues;
}

module.exports = { runConsistencyChecks };
