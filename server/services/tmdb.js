// TMDB Service: Interface for the TMDB API to search movies/shows, fetch detailed metadata, retrieve trending lists, and check watch provider options.
const env = require('../config/env');

const MOVIE_GENRES = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

let cachedTrending = null;
let lastFetchTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Helper to perform authenticated HTTP requests to TMDB.
 * Handles v3 query parameters and v4 Authorization Bearer tokens.
 */
async function callTMDB(path, queryParams = {}) {
  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB API Key is not configured in environment variables');
  }

  const isV4Token = apiKey.includes('.');
  let url = `https://api.themoviedb.org${path}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  };

  const params = new URLSearchParams(queryParams);

  if (isV4Token) {
    // TMDB v4 Authorization (API Read Access Token Bearer)
    options.headers.authorization = `Bearer ${apiKey}`;
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }
  } else {
    // TMDB v3 Authorization (api_key Query Parameter)
    params.set('api_key', apiKey);
    url = `${url}?${params.toString()}`;
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.status_message ||
      `TMDB API request failed with status ${response.status}`,
    );
  }
  return response.json();
}

/**
 * Retrieve normalized weekly trending movies from TMDB with 6-hour caching.
 */
async function getTrendingMovies() {
  const now = Date.now();
  if (cachedTrending && now - lastFetchTime < CACHE_DURATION) {
    console.log('Returning trending movies from in-memory cache');
    return cachedTrending;
  }

  try {
    console.log('Fetching trending movies from TMDB API...');
    const data = await callTMDB('/3/trending/movie/week');
    const rawMovies = data.results || [];

    const normalized = rawMovies.slice(0, 20).map((movie) => {
      const year = movie.release_date ? movie.release_date.split('-')[0] : '';
      const genres = (movie.genre_ids || [])
        .map((id) => MOVIE_GENRES[id])
        .filter(Boolean);

      return {
        title: movie.title || movie.original_title || 'Untitled',
        year,
        posterUrl: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : 'N/A',
        imdbRating: movie.vote_average
          ? parseFloat(movie.vote_average.toFixed(1))
          : 0,
        genre: genres,
        type: 'movie',
        id: `tmdb-movie-${movie.id}`,
      };
    });

    cachedTrending = normalized;
    lastFetchTime = now;

    console.log(`TMDB trending fetch: success, ${normalized.length} results`);
    return normalized;
  } catch (error) {
    console.error(`TMDB trending fetch: failure - ${error.message}`);
    throw error;
  }
}

/**
 * Search TMDB for movie and TV titles matching the query.
 * Normalizes results to OMDb schema format.
 */
async function searchTMDB(title) {
  try {
    console.log(`Searching TMDB for query: "${title}"...`);
    const data = await callTMDB('/3/search/multi', { query: title });
    const rawResults = data.results || [];

    const normalized = rawResults
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => {
        const type = item.media_type === 'tv' ? 'series' : 'movie';
        const year = (
          type === 'movie' ? item.release_date : item.first_air_date
        )
          ? (type === 'movie' ? item.release_date : item.first_air_date).split(
            '-',
          )[0]
          : '';
        const posterUrl = item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : 'N/A';

        return {
          imdbID: `tmdb-${item.media_type}-${item.id}`,
          Title: item.title || item.name || item.original_title || 'Untitled',
          Year: year,
          Poster: posterUrl,
          Type: type,
          source: 'tmdb',
          imdbRating: item.vote_average
            ? parseFloat(item.vote_average.toFixed(1))
            : 0,
        };
      });

    console.log(
      `TMDB search success: found ${normalized.length} matching movies/series`,
    );
    return normalized;
  } catch (error) {
    console.error(`TMDB search failure - ${error.message}`);
    throw error;
  }
}

/**
 * Retrieve fully normalized details for a specific TMDB movie or TV series.
 */
async function getTMDBDetails(tmdbId, mediaType) {
  try {
    console.log(`Fetching TMDB details for ID ${tmdbId} (${mediaType})...`);
    // Normalize mediaType back to 'tv' or 'movie'
    const cleanType = mediaType === 'series' ? 'tv' : mediaType;
    const path = `/3/${cleanType}/${tmdbId}`;

    const details = await callTMDB(path, { append_to_response: 'credits' });

    const credits = details.credits || {};
    const cast = (credits.cast || []).slice(0, 5).map((member) => member.name);

    let director = 'N/A';
    if (cleanType === 'tv') {
      if (details.created_by && details.created_by.length > 0) {
        director = details.created_by.map((creator) => creator.name).join(', ');
      }
    } else {
      const dirMember = (credits.crew || []).find(
        (member) => member.job === 'Director',
      );
      if (dirMember) {
        director = dirMember.name;
      }
    }

    const year = (
      cleanType === 'tv' ? details.first_air_date : details.release_date
    )
      ? (cleanType === 'tv'
        ? details.first_air_date
        : details.release_date
      ).split('-')[0]
      : '';

    let runtime = 'N/A';
    if (cleanType === 'tv') {
      if (details.episode_run_time && details.episode_run_time.length > 0) {
        runtime = `${details.episode_run_time[0]} min`;
      }
    } else if (details.runtime) {
      runtime = `${details.runtime} min`;
    }

    const normalized = {
      imdbID: `tmdb-${cleanType}-${tmdbId}`,
      Title:
        details.title || details.name || details.original_title || 'Untitled',
      Year: year,
      Released: details.release_date || details.first_air_date || '',
      Poster: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : 'N/A',
      Genre: (details.genres || []).map((g) => g.name),
      Plot: details.overview || 'No plot summary available.',
      Runtime: runtime,
      imdbRating: details.vote_average
        ? parseFloat(details.vote_average.toFixed(1))
        : 0,
      imdbRatingSource: 'tmdb',
      Type: cleanType === 'tv' ? 'series' : 'movie',
      Director: director,
      Actors: cast,
    };

    console.log(`TMDB details load success for: "${normalized.Title}"`);
    return normalized;
  } catch (error) {
    console.error(`TMDB details load failure - ${error.message}`);
    throw error;
  }
}

/**
 * Retrieve watch providers from TMDB for the specified media item.
 */
async function getWatchProviders(tmdbId, mediaType) {
  try {
    console.log(
      `Fetching TMDB watch providers for ID ${tmdbId} (${mediaType})...`,
    );
    const cleanType = mediaType === 'series' ? 'tv' : mediaType;
    const path = `/3/${cleanType}/${tmdbId}/watch/providers`;
    const data = await callTMDB(path);

    const results = data.results || {};
    const inRegion = results.IN || {};
    const flatrate = inRegion.flatrate || [];

    const providers = flatrate.map((p) => p.provider_name).filter(Boolean);
    console.log(`TMDB watch providers for IN:`, providers);
    return providers;
  } catch (error) {
    console.error(`TMDB watch providers load failure - ${error.message}`);
    return [];
  }
}

/**
 * Map provider names returned by JustWatch/TMDB to local platform options.
 */
function mapProviderToPlatform(providers) {
  const PROVIDER_MAP = {
    Netflix: 'Netflix',
    'Amazon Prime Video': 'Prime Video',
    'Prime Video': 'Prime Video',
    'Disney Plus Hotstar': 'Disney+ Hotstar',
    'Disney+ Hotstar': 'Disney+ Hotstar',
    Hotstar: 'Disney+ Hotstar',
    JioCinema: 'JioCinema',
    'Sony Liv': 'SonyLIV',
    SonyLIV: 'SonyLIV',
    ZEE5: 'ZEE5',
  };

  for (const provider of providers) {
    if (PROVIDER_MAP[provider]) {
      return PROVIDER_MAP[provider];
    }
  }
  return null;
}

module.exports = {
  getTrendingMovies,
  searchTMDB,
  getTMDBDetails,
  getWatchProviders,
  mapProviderToPlatform,
};
