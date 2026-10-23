const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');

const toObj = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);
const toDocs = (snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

/**
 * 1. generatePassportQR
 */
const generatePassportQR = async ({ seasonId, userId, accessLevel = 'stakeholders_only', expiresInDays = 30 }) => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');

  const seasonDoc = await db.collection('seasons').doc(seasonId).get();
  if (!seasonDoc.exists) {
    throw new Error('Season not found');
  }

  const season = toObj(seasonDoc);
  const token = `${uuidv4()}${crypto.randomBytes(8).toString('hex')}`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const qrUrl = `${frontendUrl}/passport/${token}`;

  const qrDataUrl = await qrcode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2
  });

  const expiresAt = expiresInDays
    ? new Date(Date.now() + parseInt(expiresInDays, 10) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const targetFarmId = season.farmId || season.farm || '';

  const passportData = {
    seasonId: season.id,
    season: season.id,
    farmId: targetFarmId,
    farm: targetFarmId,
    token,
    qrCodeDataUrl: qrDataUrl,
    accessLevel,
    createdBy: userId,
    expiresAt,
    accessLog: [],
    createdAt: new Date().toISOString()
  };

  const ref = await db.collection('qrPassports').add(passportData);
  const passport = { id: ref.id, ...passportData };

  await logAudit({
    entityType: 'qr_passport',
    entityId: ref.id,
    action: 'generate_qr',
    changedBy: userId,
    reason: 'Generated QR passport for season',
    metadata: { token, accessLevel, seasonId }
  });

  return {
    token,
    qrUrl,
    qrDataUrl,
    passport
  };
};

/**
 * 2. getPassportData
 */
const getPassportData = async (token, accessDetails = {}) => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');

  const snap = await db.collection('qrPassports')
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error('QR Passport not found or invalid token');
  }

  const passportDoc = snap.docs[0];
  const passport = toObj(passportDoc);

  if (passport.revokedAt) {
    const revokedDate = new Date(passport.revokedAt).toISOString().split('T')[0];
    throw new Error(`This QR passport was revoked on ${revokedDate}. Reason: ${passport.revocationReason || 'Not specified'}`);
  }

  if (passport.expiresAt && new Date(passport.expiresAt) < new Date()) {
    throw new Error('This QR passport has expired.');
  }

  // Record access log
  if (accessDetails.ip || accessDetails.userAgent) {
    const accessLog = Array.isArray(passport.accessLog) ? [...passport.accessLog] : [];
    accessLog.push({
      accessedAt: new Date().toISOString(),
      ip: accessDetails.ip || 'Unknown',
      userAgent: accessDetails.userAgent || 'Unknown'
    });

    await passportDoc.ref.update({ accessLog });
  }

  const targetSeasonId = passport.seasonId || passport.season;
  const targetFarmId = passport.farmId || passport.farm;

  const [seasonDoc, farmDoc, harvSnap1, harvSnap2, setSnap1, setSnap2, expSnap1, expSnap2] = await Promise.all([
    db.collection('seasons').doc(targetSeasonId).get(),
    db.collection('farms').doc(targetFarmId).get(),
    db.collection('harvestRecords').where('seasonId', '==', targetSeasonId).limit(1).get(),
    db.collection('harvestRecords').where('season', '==', targetSeasonId).limit(1).get(),
    db.collection('settlements').where('seasonId', '==', targetSeasonId).limit(1).get(),
    db.collection('settlements').where('season', '==', targetSeasonId).limit(1).get(),
    db.collection('expenses').where('seasonId', '==', targetSeasonId).get(),
    db.collection('expenses').where('season', '==', targetSeasonId).get()
  ]);

  const season = seasonDoc.exists ? toObj(seasonDoc) : null;
  const farm = farmDoc.exists ? toObj(farmDoc) : null;

  let plotName = 'Plot';
  if (season && (season.plotId || season.plot)) {
    const plotDoc = await db.collection('plots').doc(season.plotId || season.plot).get();
    if (plotDoc.exists) {
      plotName = plotDoc.data().name || 'Plot';
    }
  }

  const harvList = [...toDocs(harvSnap1), ...toDocs(harvSnap2)];
  const harvest = harvList.length > 0 ? harvList[0] : null;

  const setList = [...toDocs(setSnap1), ...toDocs(setSnap2)];
  const settlement = setList.length > 0 ? setList[0] : null;

  const expMap = new Map();
  [...toDocs(expSnap1), ...toDocs(expSnap2)].forEach((e) => expMap.set(e.id, e));
  const expenses = Array.from(expMap.values());

  const categoryMap = {};
  let totalExpensesPaise = 0;

  expenses.forEach((e) => {
    const amt = parseInt(e.amountPaise, 10) || 0;
    totalExpensesPaise += amt;
    const cat = e.category || 'other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, totalPaise: 0, count: 0 };
    }
    categoryMap[cat].totalPaise += amt;
    categoryMap[cat].count += 1;
  });

  const expenseSummaryList = Object.values(categoryMap).sort((a, b) => b.totalPaise - a.totalPaise);

  return {
    passport: {
      token: passport.token,
      accessLevel: passport.accessLevel,
      createdAt: passport.createdAt,
      expiresAt: passport.expiresAt
    },
    farm: {
      name: farm ? farm.name : 'Unknown Farm',
      village: farm ? farm.village : '',
      district: farm ? farm.district : '',
      state: farm ? farm.state : '',
      totalArea: farm ? farm.totalArea : 0,
      areaUnit: farm ? farm.areaUnit : 'bigha'
    },
    season: season ? {
      id: season.id,
      crop: season.crop,
      variety: season.variety,
      startDate: season.startDate,
      expectedHarvestDate: season.expectedHarvestDate,
      actualHarvestDate: season.actualHarvestDate,
      status: season.status,
      plotName
    } : null,
    expenseSummary: {
      totalExpensesPaise,
      byCategory: expenseSummaryList
    },
    harvest: harvest ? {
      harvestDate: harvest.harvestDate,
      quantityKg: harvest.quantityKg,
      qualityGrade: harvest.qualityGrade
    } : null,
    settlement: settlement ? {
      status: settlement.status,
      grossSalePaise: settlement.grossSalePaise,
      netSalePaise: settlement.netSalePaise,
      totalExpensesPaise: settlement.totalExpensesPaise,
      calculatedOwnerSharePaise: settlement.calculatedOwnerSharePaise,
      calculatedOperatorSharePaise: settlement.calculatedOperatorSharePaise
    } : null
  };
};

/**
 * 3. revokePassport
 */
const revokePassport = async (token, userId, reason = 'Revoked by user') => {
  const db = getDb();
  if (!db) throw new Error('Database service unavailable');

  const snap = await db.collection('qrPassports')
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error('QR Passport not found');
  }

  const doc = snap.docs[0];
  const updates = {
    revokedAt: new Date().toISOString(),
    revokedBy: userId,
    revocationReason: reason,
    updatedAt: new Date().toISOString()
  };

  await doc.ref.update(updates);
  const updatedPassport = { id: doc.id, ...doc.data(), ...updates };

  await logAudit({
    entityType: 'qr_passport',
    entityId: doc.id,
    action: 'revoke_qr',
    changedBy: userId,
    reason,
    metadata: { token }
  });

  return updatedPassport;
};

module.exports = {
  generatePassportQR,
  getPassportData,
  revokePassport
};
