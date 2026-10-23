'use strict';
const { getDb } = require('../config/firebase');

const logAudit = async ({ entityType, entityId, action, before, after, changedBy, reason, metadata }) => {
  try {
    const db = getDb();
    if (!db) return null;
    const ref = await db.collection('auditEvents').add({
      entityType: String(entityType || ''),
      entityId: String(entityId || ''),
      action: String(action || ''),
      before: before || null,
      after: after || null,
      changedBy: String(changedBy || ''),
      reason: reason || null,
      metadata: metadata || null,
      createdAt: new Date().toISOString()
    });
    return { id: ref.id };
  } catch (e) {
    console.error('[Audit] Failed to log audit event:', e.message);
    return null;
  }
};

module.exports = { logAudit };
