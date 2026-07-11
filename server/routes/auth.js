const express = require('express');
// Auth Router configuration
const jwt = require('jsonwebtoken');
const sheetsService = require('../services/sheets');
const router = express.Router();

router.post('/login', async (req, res, next) => {
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

    // Sign JWT with payload { authenticated: true } and 30 days expiration
    const token = jwt.sign(
      { authenticated: true },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
