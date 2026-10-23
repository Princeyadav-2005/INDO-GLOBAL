const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const toObj = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// POST /register
router.post('/register', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { name, email, password, phone, language, role, state, district } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (!existingSnap.empty) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
      language: language || 'hi',
      role: role || 'farmer',
      state: state || null,
      district: district || null,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('users').add(userData);
    const user = { id: ref.id, ...userData };
    delete user.password;

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        token,
        user
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /login
router.post('/login', async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();

    if (snap.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password || '');
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = { id: userDoc.id, ...userData };
    delete user.password;

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = toObj(doc);
    delete user.password;

    return res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /me
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const allowedUpdates = ['name', 'phone', 'language', 'state', 'district'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    updates.updatedAt = new Date().toISOString();

    await db.collection('users').doc(req.user.id).update(updates);

    const updatedDoc = await db.collection('users').doc(req.user.id).get();
    const user = toObj(updatedDoc);
    delete user.password;

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// POST /change-password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, doc.data().password || '');
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.collection('users').doc(req.user.id).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
