// Status Router: Provides an endpoint to check the configuration and connection status of OMDB, TMDB, and Google Sheets integrations.
const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');

// Validates API credentials exist and tests connection to the Google Sheet, returning status object
router.get('/', async (req, res) => {
  const omdbKeyPresent = !!(process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim());
  const tmdbKeyPresent = !!(process.env.TMDB_API_KEY && process.env.TMDB_API_KEY.trim());

  let sheetsConnected = false;
  let sheetsError = null;

  try {
    await sheetsService.getSheetInfo();
    sheetsConnected = true;
  } catch (error) {
    sheetsError = error.message || String(error);
  }

  res.json({
    omdbKeyPresent,
    tmdbKeyPresent,
    sheetsConnected,
    sheetsError,
  });
});

module.exports = router;
