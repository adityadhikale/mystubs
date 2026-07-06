// Titles Router: Exposes CRUD endpoints to retrieve, add, update, and delete movie stubs from the Google Sheets database.
const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');

// Retrieves all titles stored in the spreadsheet database
router.get('/', async (req, res) => {
  try {
    const titles = await sheetsService.getAllTitles();
    return res.json(titles);
  } catch (error) {
    console.error('GET /api/titles error:', error.message);
    return res.status(500).json({
      error: 'Failed to retrieve titles from Google Sheets database.',
    });
  }
});

// Appends a new title stub, handling resilient mapping of parameters from either OMDb or standard formats
router.post('/', async (req, res) => {
  try {
    const {
      Title,
      Year,
      Poster,
      Genre,
      Type,
      imdbRating,
      Runtime,
      Director,
      Actors,
      Plot,
      sourceId,
      Released,
      releaseDate,
      suggestedPlatform,
    } = req.body;

    // Accept both TitleCase keys (from raw OMDB API search results) and camelCase keys (from client form states)
    // to keep the frontend payload submission logic simple and resilient to API response structures.
    // Resilient parameter matching (supporting both OMDb capitals and standard lowercased payloads)
    const titleVal = Title || req.body.title || '';
    const yearVal = Year || req.body.year || '';
    const posterVal = Poster || req.body.posterUrl || '';
    const genreVal = Genre || req.body.genre || [];
    const typeVal = Type || req.body.type || '';
    const ratingVal = imdbRating || req.body.imdbRating || '';
    const runtimeVal = Runtime || req.body.runtime || '';
    const directorVal = Director || req.body.director || '';
    const castVal = Actors || req.body.cast || [];
    const plotVal = Plot || req.body.plot || '';
    const sourceIdVal = sourceId || req.body.sourceId || '';
    const releaseDateVal =
      Released || releaseDate || req.body.releaseDate || '';
    const suggestedPlatformVal =
      suggestedPlatform || req.body.suggestedPlatform || '';

    if (!titleVal) {
      return res
        .status(400)
        .json({ error: 'Property "title" is required to add a record' });
    }

    const titleObject = {
      sourceId: sourceIdVal,
      title: titleVal,
      year: yearVal,
      posterUrl: posterVal,
      genre: genreVal,
      type: typeVal,
      imdbRating: ratingVal,
      runtime: runtimeVal,
      director: directorVal,
      cast: castVal,
      plot: plotVal,
      releaseDate: releaseDateVal,
      suggestedPlatform: suggestedPlatformVal,
      status: req.body.status || 'Watchlist',
      myRating:
        req.body.myRating !== undefined ? parseInt(req.body.myRating, 10) : 0,
      notes: req.body.notes || '',
      dateWatched: req.body.dateWatched || '',
      rewatchCount:
        req.body.rewatchCount !== undefined
          ? parseInt(req.body.rewatchCount, 10)
          : 0,
      watchedOn: req.body.watchedOn || '',
    };

    const createdRecord = await sheetsService.addTitle(titleObject);
    return res.status(201).json(createdRecord);
  } catch (error) {
    console.error('POST /api/titles error:', error.message);
    return res
      .status(500)
      .json({ error: 'Failed to add title to Google Sheets database.' });
  }
});

// Updates user-modifiable fields (status, rating, notes, platform, etc.) for a specific title by ID
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!id || !id.trim()) {
    return res
      .status(400)
      .json({ error: 'ID parameter is required to update a title.' });
  }

  try {
    const updatedRecord = await sheetsService.updateTitle(id.trim(), updates);
    return res.json(updatedRecord);
  } catch (error) {
    console.error(`PATCH /api/titles/${id} error:`, error.message);
    if (
      error.message.includes('was not found') ||
      error.message.includes('empty')
    ) {
      return res.status(404).json({ error: error.message });
    }
    return res
      .status(500)
      .json({ error: 'Failed to update title in Google Sheets database.' });
  }
});

// Removes a title row permanently from the database sheet by its unique ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || !id.trim()) {
    return res
      .status(400)
      .json({ error: 'ID parameter is required to delete a title.' });
  }

  try {
    await sheetsService.deleteTitle(id.trim());
    return res.json({ message: `Successfully deleted title with ID ${id}` });
  } catch (error) {
    console.error(`DELETE /api/titles/${id} error:`, error.message);
    if (
      error.message.includes('was not found') ||
      error.message.includes('empty')
    ) {
      return res.status(404).json({ error: error.message });
    }
    return res
      .status(500)
      .json({ error: 'Failed to delete title from Google Sheets database.' });
  }
});

module.exports = router;
