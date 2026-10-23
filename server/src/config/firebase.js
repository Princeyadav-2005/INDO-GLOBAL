const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db;
let isReady = false;

const initFirebase = () => {
  try {
    if (admin.apps.length) {
      db = admin.firestore();
      isReady = true;
      return;
    }
    const defaultPath = path.resolve(__dirname, '../../firebase-service-account.json');
    const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) : null;
    const resolvedPath = (customPath && fs.existsSync(customPath)) ? customPath : (fs.existsSync(path.resolve('./firebase-service-account.json')) ? path.resolve('./firebase-service-account.json') : defaultPath);

    const serviceAccount = require(resolvedPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    isReady = true;
    console.log('[Firebase] Firestore connected successfully.');
  } catch (err) {
    console.error('[Firebase] Init failed:', err.message);
    console.error('[Firebase] Place your service account JSON at: server/firebase-service-account.json');
    isReady = false;
  }
};

const getDb = () => db;
const getAdmin = () => admin;
const isDbReady = () => isReady;

module.exports = { initFirebase, getDb, getAdmin, isDbReady };
