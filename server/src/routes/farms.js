const express = require('express');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticate);

const toObj = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);
const toDocs = (snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

const checkFarmAccess = async (db, farmId, userId) => {
  const doc = await db.collection('farms').doc(farmId).get();
  if (!doc.exists) {
    const error = new Error('Farm not found');
    error.status = 404;
    throw error;
  }

  const farm = toObj(doc);
  const ownerId = farm.ownerId || farm.owner;
  const operators = farm.operatorIds || farm.operators || [];

  const isOwner = String(ownerId) === String(userId);
  const isOperator = Array.isArray(operators) && operators.some((op) => String(op) === String(userId));

  if (!isOwner && !isOperator) {
    const error = new Error('You do not have permission to access this farm.');
    error.status = 403;
    throw error;
  }

  return { farm, isOwner, isOperator };
};

// GET /: list farms where user is owner or operator
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { includeInactive } = req.query;

    const [ownerSnap1, ownerSnap2, opSnap1, opSnap2] = await Promise.all([
      db.collection('farms').where('ownerId', '==', req.user.id).get(),
      db.collection('farms').where('owner', '==', req.user.id).get(),
      db.collection('farms').where('operatorIds', 'array-contains', req.user.id).get(),
      db.collection('farms').where('operators', 'array-contains', req.user.id).get()
    ]);

    const farmMap = new Map();
    [...toDocs(ownerSnap1), ...toDocs(ownerSnap2), ...toDocs(opSnap1), ...toDocs(opSnap2)].forEach((farm) => {
      farmMap.set(farm.id, farm);
    });

    let farms = Array.from(farmMap.values());

    if (includeInactive !== 'true') {
      farms = farms.filter((f) => f.status !== 'inactive');
    }

    farms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({
      success: true,
      data: farms
    });
  } catch (err) {
    next(err);
  }
});

// POST /: create farm
router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const {
      name,
      operators,
      operatorIds,
      village,
      district,
      state,
      coordinates,
      totalArea,
      areaUnit,
      soilType,
      waterSource
    } = req.body;

    if (!name || !district || !state || totalArea === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, district, state, and totalArea are required.'
      });
    }

    const ops = Array.isArray(operatorIds) ? operatorIds : (Array.isArray(operators) ? operators : []);

    const farmData = {
      name,
      ownerId: req.user.id,
      owner: req.user.id,
      operatorIds: ops,
      operators: ops,
      village: village || '',
      district,
      state,
      coordinates: coordinates || null,
      totalArea: parseFloat(totalArea),
      areaUnit: areaUnit || 'bigha',
      soilType: soilType || '',
      waterSource: waterSource || '',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('farms').add(farmData);
    const createdFarm = { id: ref.id, ...farmData };

    await logAudit({
      entityType: 'farm',
      entityId: ref.id,
      action: 'create',
      after: createdFarm,
      changedBy: req.user.id,
      reason: 'Created new farm record'
    });

    return res.status(201).json({
      success: true,
      message: 'Farm created successfully.',
      data: createdFarm
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id: get single farm
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { farm } = await checkFarmAccess(db, req.params.id, req.user.id);

    return res.json({
      success: true,
      data: farm
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// PATCH /:id: update farm (owner only)
router.patch('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { farm, isOwner } = await checkFarmAccess(db, req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the farm owner can update farm details.'
      });
    }

    const allowedUpdates = [
      'name',
      'operators',
      'operatorIds',
      'village',
      'district',
      'state',
      'coordinates',
      'totalArea',
      'areaUnit',
      'soilType',
      'waterSource',
      'status'
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.operatorIds || updates.operators) {
      const ops = updates.operatorIds || updates.operators;
      updates.operatorIds = Array.isArray(ops) ? ops : [];
      updates.operators = updates.operatorIds;
    }

    if (updates.totalArea !== undefined) {
      updates.totalArea = parseFloat(updates.totalArea);
    }

    updates.updatedAt = new Date().toISOString();

    await db.collection('farms').doc(req.params.id).update(updates);

    const updatedDoc = await db.collection('farms').doc(req.params.id).get();
    const updatedFarm = toObj(updatedDoc);

    await logAudit({
      entityType: 'farm',
      entityId: req.params.id,
      action: 'update',
      before: farm,
      after: updatedFarm,
      changedBy: req.user.id,
      reason: 'Farm details updated'
    });

    return res.json({
      success: true,
      message: 'Farm updated successfully.',
      data: updatedFarm
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// DELETE /:id: soft delete farm (owner only)
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { farm, isOwner } = await checkFarmAccess(db, req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the farm owner can deactivate a farm.'
      });
    }

    const updates = {
      status: 'inactive',
      updatedAt: new Date().toISOString()
    };

    await db.collection('farms').doc(req.params.id).update(updates);

    await logAudit({
      entityType: 'farm',
      entityId: req.params.id,
      action: 'delete',
      before: farm,
      after: { ...farm, ...updates },
      changedBy: req.user.id,
      reason: 'Farm deactivated (soft-deleted)'
    });

    return res.json({
      success: true,
      message: 'Farm deactivated successfully.'
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// POST /:id/plots: create plot under farm
router.post('/:id/plots', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { farm } = await checkFarmAccess(db, req.params.id, req.user.id);
    const { name, area, areaUnit, soilType, irrigationType, coordinates, notes, status } = req.body;

    if (!name || area === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Plot name and area are required.'
      });
    }

    const plotData = {
      farmId: farm.id,
      farm: farm.id,
      name,
      area: parseFloat(area),
      areaUnit: areaUnit || farm.areaUnit || 'bigha',
      soilType: soilType || farm.soilType || '',
      irrigationType: irrigationType || '',
      coordinates: coordinates || null,
      notes: notes || '',
      status: status || 'active',
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('plots').add(plotData);
    const plot = { id: ref.id, ...plotData };

    await logAudit({
      entityType: 'plot',
      entityId: ref.id,
      action: 'create',
      after: plot,
      changedBy: req.user.id,
      reason: 'Created new plot under farm'
    });

    return res.status(201).json({
      success: true,
      message: 'Plot created successfully.',
      data: plot
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// GET /:id/plots: list plots of farm
router.get('/:id/plots', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    await checkFarmAccess(db, req.params.id, req.user.id);

    const [plotsSnap1, plotsSnap2] = await Promise.all([
      db.collection('plots').where('farmId', '==', req.params.id).get(),
      db.collection('plots').where('farm', '==', req.params.id).get()
    ]);

    const plotMap = new Map();
    [...toDocs(plotsSnap1), ...toDocs(plotsSnap2)].forEach((p) => {
      plotMap.set(p.id, p);
    });

    const plots = Array.from(plotMap.values());
    plots.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({
      success: true,
      data: plots
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// PATCH /:id/plots/:plotId: update plot
router.patch('/:id/plots/:plotId', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    await checkFarmAccess(db, req.params.id, req.user.id);

    const plotDoc = await db.collection('plots').doc(req.params.plotId).get();
    if (!plotDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found.'
      });
    }

    const plot = toObj(plotDoc);
    if (String(plot.farmId) !== String(req.params.id) && String(plot.farm) !== String(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found under this farm.'
      });
    }

    const allowedUpdates = ['name', 'area', 'areaUnit', 'soilType', 'irrigationType', 'coordinates', 'notes', 'status'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.area !== undefined) {
      updates.area = parseFloat(updates.area);
    }

    updates.updatedAt = new Date().toISOString();

    await db.collection('plots').doc(req.params.plotId).update(updates);

    const updatedDoc = await db.collection('plots').doc(req.params.plotId).get();
    const updatedPlot = toObj(updatedDoc);

    await logAudit({
      entityType: 'plot',
      entityId: req.params.plotId,
      action: 'update',
      before: plot,
      after: updatedPlot,
      changedBy: req.user.id,
      reason: 'Plot details updated'
    });

    return res.json({
      success: true,
      message: 'Plot updated successfully.',
      data: updatedPlot
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
