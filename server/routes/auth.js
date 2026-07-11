const express = require('express');
// Auth Router configuration
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sheetsService = require('../services/sheets');
const router = express.Router();

// Rate limiter specifically for login: max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per windowMs
  handler: (req, res) => {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Auth Error] JWT_SECRET is not configured in environment variables.');
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }

    let storedPassword;
    try {
      storedPassword = await sheetsService.getSettingValue('APP_PASSWORD');
      if (!storedPassword) {
        return res.status(500).json({ error: 'Password not configured in Settings sheet' });
      }
    } catch (err) {
      console.error('[Auth Error] Failed to retrieve password from Settings tab:', err.message);
      return res.status(500).json({ error: err.message || 'Password not configured in Settings sheet' });
    }

    // Direct plaintext string comparison
    if (password !== storedPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Fetch PASSWORD_UPDATED_AT to include in JWT payload
    let passwordVersion;
    try {
      passwordVersion = await sheetsService.getSettingValue('PASSWORD_UPDATED_AT');
      if (!passwordVersion) {
        return res.status(500).json({ error: 'PASSWORD_UPDATED_AT not configured in Settings sheet' });
      }
    } catch (err) {
      console.error('[Auth Error] Failed to retrieve PASSWORD_UPDATED_AT from Settings tab:', err.message);
      return res.status(500).json({ error: err.message || 'PASSWORD_UPDATED_AT not configured in Settings sheet' });
    }

    // Sign JWT with payload { authenticated: true, passwordVersion } and 30 days expiration
    const token = jwt.sign(
      { authenticated: true, passwordVersion },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
