const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initFirebase, isDbReady } = require('./config/firebase');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const farmRoutes = require('./routes/farms');
const seasonRoutes = require('./routes/seasons');
const expenseRoutes = require('./routes/expenses');
const mandiRoutes = require('./routes/mandi');
const harvestRoutes = require('./routes/harvest');
const settlementRoutes = require('./routes/settlement');
const qrRoutes = require('./routes/qr');
const consistencyRoutes = require('./routes/consistency');
const aiRoutes = require('./routes/ai');
const weatherRoutes = require('./routes/weather');
const schemeRoutes = require('./routes/schemes');
const marketplaceRoutes = require('./routes/marketplace');
const auditRoutes = require('./routes/audit');

const app = express();

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
const resolvedUploadDir = path.resolve(uploadPath);
if (!fs.existsSync(resolvedUploadDir)) {
  fs.mkdirSync(resolvedUploadDir, { recursive: true });
}

// Security headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or matching allowed origin
    if (!origin || origin === allowedOrigin || origin === 'http://localhost:5173') {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev if needed
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded files
app.use('/uploads', express.static(resolvedUploadDir));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiter on all API endpoints
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Farmer Connect 2.0 Backend API is operational',
    firebaseReady: isDbReady(),
    timestamp: new Date()
  });
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/harvest', harvestRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/consistency', consistencyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/audit', auditRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize Firebase and start server
initFirebase();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Farmer Connect 2.0 API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`[Server] Uploads at: http://localhost:${PORT}/uploads`);
  });
}

module.exports = app;
