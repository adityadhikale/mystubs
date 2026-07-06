// Search Router: Provides API endpoints to perform unified parallel searches and retrieve details across OMDB and TMDB services.
const express = require('express');
const router = express.Router();
const omdbService = require('../services/omdb');
const tmdbService = require('../services/tmdb');

// Performs a parallel search query on both OMDB and TMDB APIs, combining results
router.get('/', async (req, res) => {
  const { title } = req.query;

  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ error: 'Query parameter "title" is required' });
  }

  const queryTitle = title.trim();

  // Run both OMDb search and TMDB search in parallel using Promise.allSettled
  const results = await Promise.allSettled([
    omdbService.searchTitles(queryTitle),
    tmdbService.searchTMDB(queryTitle),
  ]);

  const omdbResult = results[0];
  const tmdbResult = results[1];

  let combined = [];

  // Parse OMDb results
  if (omdbResult.status === 'fulfilled' && Array.isArray(omdbResult.value)) {
    const omdbMapped = omdbResult.value.map((item) => ({
      ...item,
      source: 'omdb',
    }));
    combined = combined.concat(omdbMapped);
  } else if (omdbResult.status === 'rejected') {
    console.log(
      'OMDb search failed or returned no results:',
      omdbResult.reason.message || omdbResult.reason,
    );
  }

  // Parse TMDB results
  if (tmdbResult.status === 'fulfilled' && Array.isArray(tmdbResult.value)) {
    const tmdbMapped = tmdbResult.value.map((item) => ({
      ...item,
      source: 'tmdb',
    }));
    combined = combined.concat(tmdbMapped);
  } else if (tmdbResult.status === 'rejected') {
    console.log(
      'TMDB search failed or returned no results:',
      tmdbResult.reason.message || tmdbResult.reason,
    );
  }

  // Handle fatal OMDb errors if we have zero combined results
  if (combined.length === 0) {
    if (omdbResult.status === 'rejected') {
      const errMessage = omdbResult.reason.message || '';
      if (errMessage.includes('API key is not configured')) {
        return res
          .status(503)
          .json({ error: 'OMDb API key is not configured on the server' });
      }
      if (errMessage.includes('Too many results')) {
        return res.status(400).json({
          error: 'Too many results. Please refine your search query.',
        });
      }
    }
  }

  return res.json(combined);
});

// Retrieves detailed metadata for a given ID, routing dynamically to TMDB or OMDB based on ID prefix
router.get('/:imdbId', async (req, res) => {
  const { imdbId } = req.params;

  if (!imdbId || !imdbId.trim()) {
    return res.status(400).json({ error: 'ID parameter is required' });
  }

  const queryId = imdbId.trim();

  // 1. Check if the ID is a TMDB-sourced ID
  if (queryId.startsWith('tmdb-')) {
    try {
      const parts = queryId.split('-');
      const mediaType = parts[1]; // 'movie' or 'tv'
      const cleanId = parts.slice(2).join('-');

      const details = await tmdbService.getTMDBDetails(cleanId, mediaType);

      // Fetch watch providers and map them to platform options
      const providers = await tmdbService.getWatchProviders(cleanId, mediaType);
      details.suggestedPlatform = tmdbService.mapProviderToPlatform(providers);

      return res.json(details);
    } catch (error) {
      console.error('TMDB details router error:', error.message);
      if (error.message.includes('not configured')) {
        return res
          .status(503)
          .json({ error: 'TMDB API key is not configured on the server' });
      }
      return res.status(404).json({ error: 'Title detail not found on TMDB' });
    }
  }

  // 2. Otherwise, fetch from OMDb
  try {
    const details = await omdbService.getTitleDetail(queryId);
    // Explicitly mark OMDb source rating
    details.imdbRatingSource = 'omdb';
    details.suggestedPlatform = null;
    return res.json(details);
  } catch (error) {
    console.error('OMDb details router error:', error.message);

    if (error.message.includes('API key is not configured')) {
      return res
        .status(503)
        .json({ error: 'OMDb API key is not configured on the server' });
    }
    if (
      error.message.includes('Incorrect IMDb ID') ||
      error.message.includes('not found')
    ) {
      return res.status(404).json({ error: 'Title detail not found' });
    }

    return res.status(500).json({
      error:
        error.message ||
        'An error occurred while retrieving details from OMDb.',
    });
  }
});

module.exports = router;
