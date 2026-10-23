'use strict';
const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const toDocs = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const dbCheck = (res) => { const db = getDb(); if (!db) { res.status(503).json({ success: false, message: 'Database unavailable' }); return null; } return db; };

// GET /listings
router.get('/listings', optionalAuth, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { crop, state, district, page = 1, limit = 20 } = req.query;
    let query = db.collection('marketplaceListings').where('status', '==', 'active');
    if (crop) query = query.where('crop', '==', crop);
    if (state) query = query.where('location.state', '==', state);

    const snap = await query.get();
    let listings = toDocs(snap);
    if (district) listings = listings.filter(l => l.location && l.location.district === district);
    listings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const start = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    return res.json({ success: true, data: listings.slice(start, start + parseInt(limit, 10)), total: listings.length });
  } catch (err) { next(err); }
});

// POST /listings
router.post('/listings', authenticate, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const { crop, variety, quantityKg, askingPricePerQuintalPaise, quality, location, availableFrom, availableUntil, description, contactPhone } = req.body;
    if (!crop || quantityKg == null || askingPricePerQuintalPaise == null) {
      return res.status(400).json({ success: false, message: 'crop, quantityKg, and askingPricePerQuintalPaise are required.' });
    }
    const data = {
      createdBy: req.user.id, crop: crop.trim(), variety: variety || '',
      quantityKg: parseFloat(quantityKg),
      askingPricePerQuintalPaise: Math.round(Number(askingPricePerQuintalPaise)),
      quality: quality || '', location: location || {},
      availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
      availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
      description: description || '', contactPhone: contactPhone || '',
      status: 'active', createdAt: new Date().toISOString()
    };
    const ref = await db.collection('marketplaceListings').add(data);
    return res.status(201).json({ success: true, message: 'Listing created.', data: { id: ref.id, ...data } });
  } catch (err) { next(err); }
});

// GET /listings/:id
router.get('/listings/:id', optionalAuth, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('marketplaceListings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Listing not found.' });
    return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) { next(err); }
});

// PATCH /listings/:id
router.patch('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('marketplaceListings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Listing not found.' });
    if (doc.data().createdBy !== req.user.id) return res.status(403).json({ success: false, message: 'Permission denied.' });
    const allowed = ['crop', 'variety', 'quantityKg', 'askingPricePerQuintalPaise', 'quality', 'location', 'availableFrom', 'availableUntil', 'description', 'contactPhone', 'status'];
    const updates = { updatedAt: new Date().toISOString() };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await db.collection('marketplaceListings').doc(req.params.id).update(updates);
    return res.json({ success: true, message: 'Listing updated.', data: { id: req.params.id, ...doc.data(), ...updates } });
  } catch (err) { next(err); }
});

// DELETE /listings/:id
router.delete('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const db = dbCheck(res); if (!db) return;
    const doc = await db.collection('marketplaceListings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Listing not found.' });
    if (doc.data().createdBy !== req.user.id) return res.status(403).json({ success: false, message: 'Permission denied.' });
    await db.collection('marketplaceListings').doc(req.params.id).update({ status: 'cancelled', updatedAt: new Date().toISOString() });
    return res.json({ success: true, message: 'Listing cancelled.' });
  } catch (err) { next(err); }
});

module.exports = router;
