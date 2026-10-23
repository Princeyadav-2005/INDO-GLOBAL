const jwt = require('jsonwebtoken');
const { getDb } = require('../config/firebase');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable.'
      });
    }

    const userDoc = await db.collection('users').doc(decoded.id).get();
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or invalid token.'
      });
    }

    const userData = userDoc.data();
    req.user = {
      id: userDoc.id,
      email: userData.email || decoded.email,
      name: userData.name || decoded.name,
      role: userData.role || decoded.role,
      state: userData.state || null,
      district: userData.district || null,
      phone: userData.phone || null,
      language: userData.language || 'hi'
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDb();
      if (db) {
        const userDoc = await db.collection('users').doc(decoded.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          req.user = {
            id: userDoc.id,
            email: userData.email || decoded.email,
            name: userData.name || decoded.name,
            role: userData.role || decoded.role,
            state: userData.state || null,
            district: userData.district || null,
            phone: userData.phone || null,
            language: userData.language || 'hi'
          };
        } else {
          req.user = null;
        }
      } else {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role
        };
      }
    } catch (error) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
