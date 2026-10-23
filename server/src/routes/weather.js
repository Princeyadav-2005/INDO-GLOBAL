const express = require('express');
const { getWeather } = require('../services/weatherService');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /: optionally authenticate, call weatherService.getWeather
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    let { lat, lon, location } = req.query;

    if (!location && !lat && !lon && req.user) {
      if (req.user.district) {
        location = `${req.user.district}, ${req.user.state || ''}`.trim();
      } else if (req.user.state) {
        location = req.user.state;
      }
    }

    const weatherData = await getWeather({ lat, lon, location });

    if (weatherData.error) {
      return res.status(503).json({
        success: false,
        message: weatherData.error
      });
    }

    return res.json({
      success: true,
      data: weatherData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
