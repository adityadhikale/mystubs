const API_BASE_URL = 'http://localhost:4000/api';

/**
 * Helper to perform HTTP GET requests to the backend API.
 * Handles parsing and throws formatted error messages.
 */
async function apiGet(path) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    console.error(`API GET error for path ${path}:`, error.message);
    throw error;
  }
}

/**
 * Helper to perform HTTP POST requests to the backend API.
 * Handles headers, payload stringification, and parses JSON results.
 */
async function apiPost(path, body) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    console.error(`API POST error for path ${path}:`, error.message);
    throw error;
  }
}

/**
 * Helper to perform HTTP PATCH requests to the backend API.
 * Handles headers, payload stringification, and parses JSON results.
 */
async function apiPatch(path, body) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    console.error(`API PATCH error for path ${path}:`, error.message);
    throw error;
  }
}

/**
 * Helper to perform HTTP DELETE requests to the backend API.
 * Handles parsing and throws formatted error messages.
 */
async function apiDelete(path) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    console.error(`API DELETE error for path ${path}:`, error.message);
    throw error;
  }
}

/**
 * Search OMDb for titles matching the query.
 * @param {string} title Query string
 * @returns {Promise<Array>} Array of normalized search results
 */
export async function searchTitles(title) {
  if (!title || !title.trim()) {
    return [];
  }
  return apiGet(`/search?title=${encodeURIComponent(title.trim())}`);
}

/**
 * Get detailed metadata for a specific title by IMDb ID.
 * @param {string} imdbId IMDb ID
 * @returns {Promise<Object>} Full detailed metadata object
 */
export async function getTitleDetail(imdbId) {
  if (!imdbId || !imdbId.trim()) {
    throw new Error('IMDb ID is required');
  }
  return apiGet(`/search/${encodeURIComponent(imdbId.trim())}`);
}

/**
 * Retrieve all movie/TV title records from the Google Sheets database.
 * @returns {Promise<Array>} List of title objects
 */
export async function getTitles() {
  return apiGet('/titles');
}

/**
 * Create/Append a new movie or TV show stub in the Google Sheets database.
 * @param {Object} titleData Mapped OMDb title details
 * @returns {Promise<Object>} Mapped created record
 */
export async function addTitle(titleData) {
  return apiPost('/titles', titleData);
}

/**
 * Update user notes and status fields on a database entry by ID.
 * @param {string} id Unique title UUID
 * @param {Object} updates Changed fields
 * @returns {Promise<Object>} Mapped updated record
 */
export async function updateTitle(id, updates) {
  return apiPatch(`/titles/${encodeURIComponent(id)}`, updates);
}

/**
 * Delete a movie/TV show stub record from the database.
 * @param {string} id Unique title UUID
 * @returns {Promise<Object>} Success message payload
 */
export async function deleteTitle(id) {
  return apiDelete(`/titles/${encodeURIComponent(id)}`);
}

/**
 * Retrieve the trending movies of the week from TMDB via our backend.
 * @returns {Promise<Array>} Normalized trending movie objects
 */
export async function getTrending() {
  return apiGet('/trending');
}

/**
 * Retrieve backend status and API keys availability.
 * @returns {Promise<Object>} Status payload
 */
export async function getStatus() {
  return apiGet('/status');
}
