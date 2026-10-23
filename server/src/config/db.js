const mongoose = require('mongoose');

let dbReady = false;
let retryTimer = null;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    dbReady = true;
    if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
    console.log(`[MongoDB] Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.log('[MongoDB] Server will still start. Retrying DB every 15s...');
    // Retry in background — do NOT call process.exit
    if (!retryTimer) {
      retryTimer = setInterval(async () => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(retryTimer);
          retryTimer = null;
          return;
        }
        console.log('[MongoDB] Retrying connection...');
        try {
          await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
          });
          dbReady = true;
          clearInterval(retryTimer);
          retryTimer = null;
          console.log('[MongoDB] Reconnected successfully.');
        } catch (e) {
          console.error('[MongoDB] Retry failed:', e.message);
        }
      }, 15000);
    }
  }
};

const isDbReady = () => mongoose.connection.readyState === 1;

mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Mongoose connected.');
  dbReady = true;
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Mongoose disconnected.');
  dbReady = false;
});

process.on('SIGINT', async () => {
  if (retryTimer) clearInterval(retryTimer);
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed on SIGINT.');
  } catch (err) {
    console.error('[MongoDB] SIGINT close error:', err.message);
  }
  process.exit(0);
});

module.exports = connectDB;
module.exports.isDbReady = isDbReady;
