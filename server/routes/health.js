// Health Router: Provides a simple status endpoint to verify the backend server is running.
const express = require('express');
const router = express.Router();

// Returns a basic HTTP 200 health response with a timestamp
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
