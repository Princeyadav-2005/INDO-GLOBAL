const express = require('express');
const rateLimit = require('express-rate-limit');
const geminiService = require('../services/geminiService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rate limiter: 20 requests per hour
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many AI requests. Rate limit is 20 requests per hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(authenticate);
router.use(aiLimiter);

// POST /chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history, language } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.'
      });
    }

    const result = await geminiService.chat(message, history, language || req.user.language || 'hi');

    if (result.error && !result.response) {
      return res.status(502).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /crop-recommend
router.post('/crop-recommend', async (req, res, next) => {
  try {
    const { soil, ph, npk, rainfall, season, state } = req.body;

    const result = await geminiService.cropRecommend({
      soil,
      ph,
      npk,
      rainfall,
      season,
      state: state || req.user.state
    });

    if (result.error && (!result.recommendations || result.recommendations.length === 0)) {
      return res.status(502).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /disease
router.post('/disease', async (req, res, next) => {
  try {
    const { description, imageDescription } = req.body;

    if (!description && !imageDescription) {
      return res.status(400).json({
        success: false,
        message: 'Either description or imageDescription is required.'
      });
    }

    const result = await geminiService.identifyDisease({ description, imageDescription });

    if (result.error && (!result.symptoms || result.symptoms.length === 0)) {
      return res.status(502).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /voice-parse
router.post('/voice-parse', async (req, res, next) => {
  try {
    const { transcript, language } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required.'
      });
    }

    const result = await geminiService.parseVoiceExpense(
      transcript,
      language || req.user.language || 'hi'
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
