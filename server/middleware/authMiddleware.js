const jwt = require('jsonwebtoken');
const sheetsService = require('../services/sheets');

// Cache variables for PASSWORD_UPDATED_AT timestamp
let cachedPasswordUpdatedAt = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

async function getCachedPasswordUpdatedAt() {
  const now = Date.now();
  if (!cachedPasswordUpdatedAt || (now - cacheTimestamp) > CACHE_TTL_MS) {
    try {
      const value = await sheetsService.getSettingValue('PASSWORD_UPDATED_AT');
      if (value) {
        cachedPasswordUpdatedAt = value;
        cacheTimestamp = now;
      }
    } catch (err) {
      console.error('[Middleware Cache Error] Failed to refresh PASSWORD_UPDATED_AT:', err.message);
      // Fallback to existing cached value if available, otherwise propagate error
      if (!cachedPasswordUpdatedAt) {
        throw err;
      }
    }
  }
  return cachedPasswordUpdatedAt;
}

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Expect format "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid token format. Expected Bearer <token>' });
  }

  const token = parts[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('[Middleware Error] JWT_SECRET is not configured in environment variables.');
    return res.status(500).json({ error: 'Server authentication configuration error' });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      const currentPasswordVersion = await getCachedPasswordUpdatedAt();
      
      if (!decoded || !decoded.passwordVersion || decoded.passwordVersion !== currentPasswordVersion) {
        return res.status(401).json({ error: 'Session expired, please log in again' });
      }
    } catch (error) {
      console.error('[Middleware Error] Error verifying password version:', error.message);
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }

    // Attach decoded info to request if we ever want to inspect it
    req.user = decoded;
    return next();
  });
};
