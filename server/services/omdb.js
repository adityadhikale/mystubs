// OMDB Service: Connects to the OMDb API to perform search queries and retrieve detailed metadata using an IMDb ID.
const env = require('../config/env');

/**
 * Searches OMDb for titles matching the query.
 * Uses the s= endpoint.
 * @param {string} title Query string
 * @returns {Promise<Array>} Normalized results array
 */
async function searchTitles(title) {
  const apiKey = env.OMDB_API_KEY;
  if (!apiKey || apiKey === 'your_omdb_api_key_here') {
    throw new Error('OMDb API key is not configured');
  }

  const url = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(title)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OMDb API responded with status ${response.status}`);
  }

  const data = await response.json();
  if (data.Response === 'False') {
    throw new Error(data.Error || 'Failed to fetch results from OMDb');
  }

  // Normalize results: imdbID, Title, Year, Poster, Type
  return (data.Search || []).map((item) => ({
    imdbID: item.imdbID || '',
    Title: item.Title || '',
    Year: item.Year || '',
    Poster: item.Poster || '',
    Type: item.Type || '',
  }));
}

/**
 * Gets detailed information for a specific title by IMDb ID.
 * Uses the i= endpoint.
 * @param {string} imdbId IMDb ID
 * @returns {Promise<Object>} Normalized detailed title object
 */
async function getTitleDetail(imdbId) {
  const apiKey = env.OMDB_API_KEY;
  if (!apiKey || apiKey === 'your_omdb_api_key_here') {
    throw new Error('OMDb API key is not configured');
  }

  const url = `http://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(imdbId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OMDb API responded with status ${response.status}`);
  }

  const data = await response.json();
  if (data.Response === 'False') {
    throw new Error(data.Error || 'Failed to fetch details from OMDb');
  }

  // Normalize detailed info: Title, Year, Poster, Genre (array), Plot, Runtime, imdbRating, Type, Director, Actors (array)
  return {
    Title: data.Title || '',
    Year: data.Year || '',
    Released: data.Released || '',
    Poster: data.Poster || '',
    Genre: data.Genre && data.Genre !== 'N/A' ? data.Genre.split(', ') : [],
    Plot: data.Plot || '',
    Runtime: data.Runtime || '',
    imdbRating: data.imdbRating || '',
    Type: data.Type || '',
    Director: data.Director || '',
    Actors: data.Actors && data.Actors !== 'N/A' ? data.Actors.split(', ') : [],
  };
}

module.exports = {
  searchTitles,
  getTitleDetail,
};
