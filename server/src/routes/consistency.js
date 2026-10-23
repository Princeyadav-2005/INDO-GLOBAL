'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { runConsistencyChecks } = require('../utils/consistencyEngine');

const router = express.Router();
router.use(authenticate);

// GET /:seasonId
router.get('/:seasonId', async (req, res, next) => {
  try {
    const issues = await runConsistencyChecks(req.params.seasonId, req.user.id);
    return res.json({ success: true, data: { seasonId: req.params.seasonId, issues, checkedAt: new Date().toISOString() } });
  } catch (err) { next(err); }
});

// POST /:seasonId/run
router.post('/:seasonId/run', async (req, res, next) => {
  try {
    const issues = await runConsistencyChecks(req.params.seasonId, req.user.id);
    const blocking = issues.filter(i => i.isBlocking);
    return res.json({
      success: true,
      message: `${issues.length} issue(s) found, ${blocking.length} blocking.`,
      data: { seasonId: req.params.seasonId, issues, checkedAt: new Date().toISOString(), blockingCount: blocking.length }
    });
  } catch (err) { next(err); }
});

module.exports = router;
