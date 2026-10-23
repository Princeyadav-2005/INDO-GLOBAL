'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /:entityType/:entityId
router.get('/:entityType/:entityId', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ success: false, message: 'Database unavailable' });
    const { entityType, entityId } = req.params;
    const snap = await db.collection('auditEvents')
      .where('entityType', '==', entityType)
      .where('entityId', '==', entityId)
      .get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return res.json({ success: true, data: events, total: events.length });
  } catch (err) { next(err); }
});

module.exports = router;
