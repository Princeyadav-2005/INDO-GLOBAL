'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { generatePassportQR, getPassportData, revokePassport } = require('../services/qrService');

const router = express.Router();

const dbCheck = (res) => { const db = getDb(); if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; } return db; };

// POST /:seasonId/generate
router.post('/:seasonId/generate', authenticate, async (req, res, next) => {
  try {
    const { accessLevel, expiresInDays, expiryDays } = req.body || {};
    const days = expiresInDays !== undefined ? expiresInDays : expiryDays;
    const result = await generatePassportQR({
      seasonId: req.params.seasonId,
      userId: req.user.id,
      accessLevel: accessLevel || 'public_summary',
      expiresInDays: days ? parseInt(days, 10) : null
    });
    if (result.error) return res.status(500).json({ success: false, message: result.error });
    return res.status(201).json({ success: true, message: 'QR Passport generated.', data: result });
  } catch (err) { next(err); }
});

// GET /list/:seasonId
router.get('/list/:seasonId', authenticate, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const snap = await db.collection('qrPassports').where('seasonId', '==', req.params.seasonId).get();
    const passports = snap.docs.map(d => {
      const p = { id: d.id, ...d.data() };
      delete p.qrCodeDataUrl; // strip large data for list
      return p;
    });
    return res.json({ success: true, data: passports });
  } catch (err) { next(err); }
});

// GET /:token/passport (public)
router.get('/:token/passport', optionalAuth, async (req, res, next) => {
  try {
    const result = await getPassportData(req.params.token);
    if (result.error) return res.status(result.status || 404).json({ success: false, message: result.error });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /:token/revoke
router.post('/:token/revoke', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await revokePassport(req.params.token, req.user.id, reason);
    if (result.error) return res.status(result.status || 400).json({ success: false, message: result.error });
    return res.json({ success: true, message: 'QR Passport revoked.', data: result });
  } catch (err) { next(err); }
});

module.exports = router;
