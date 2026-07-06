// Trending Router: Serves weekly trending movie releases sourced from TMDB.
const express = require('express');
const router = express.Router();
const tmdbService = require('../services/tmdb');

// Retrieves cached weekly trending movies for frontend recommendations
router.get('/', async (req, res) => {
  try {
    const movies = await tmdbService.getTrendingMovies();
    res.json(movies);
  } catch (error) {
    console.error('Error fetching trending movies:', error.message);
    res
      .status(500)
      .json({ error: error.message || 'Failed to fetch trending movies' });
  }
});

module.exports = router;
