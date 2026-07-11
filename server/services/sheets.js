// Sheets Service: Integrates with Google Sheets API to read, append, update, and delete title rows using a dynamic column header mapping.
const { google } = require('googleapis');
const env = require('../config/env');
const crypto = require('crypto');

// Setup Google Sheets API client with Service Account authentication
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = env.GOOGLE_SHEETS_SPREADSHEET_ID;

const HEADERS = [
  'id',
  'sourceId',
  'title',
  'year',
  'posterUrl',
  'genre',
  'type',
  'imdbRating',
  'runtime',
  'director',
  'cast',
  'plot',
  'status',
  'myRating',
  'notes',
  'dateWatched',
  'rewatchCount',
  'watchedOn',
  'releaseDate',
  'suggestedPlatform',
];

/**
 * Helper to fetch the metadata of the spreadsheet's first sheet tab.
 * Dynamically gets sheet name (title) and sheetId for deletion.
 */
async function getSheetInfo() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const firstSheet = response.data.sheets[0];
    return {
      title: firstSheet.properties.title,
      sheetId: firstSheet.properties.sheetId,
    };
  } catch (error) {
    console.error(
      'Failed to get spreadsheet info. Check sheet ID and service account access permissions:',
      error.message,
    );
    throw error;
  }
}

/**
 * Reads all rows from the spreadsheet and parses them into a list of normalized title objects.
 * Initializes headers if the spreadsheet is completely empty.
 */
async function getAllTitles() {
  const { title } = await getSheetInfo();
  const range = `${title}!A:T`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    // If the spreadsheet is empty, initialize it with headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [HEADERS] },
    });
    return [];
  }

  // Map headers to their column indices so we can extract fields by name rather than hardcoding column letters.
  // This prevents breakage if the columns in the Google Sheet are reordered.
  const headers = rows[0];
  const headerMap = {};
  HEADERS.forEach((h) => {
    headerMap[h] = headers.indexOf(h);
  });

  const dataRows = rows.slice(1);
  return dataRows.map((row) => {
    const getVal = (field) => {
      const idx = headerMap[field];
      return idx !== undefined && idx !== -1 && row[idx] !== undefined
        ? row[idx]
        : '';
    };

    const genreRaw = getVal('genre');
    const castRaw = getVal('cast');

    return {
      id: getVal('id'),
      sourceId: getVal('sourceId'),
      title: getVal('title'),
      year: getVal('year'),
      posterUrl: getVal('posterUrl'),
      genre: genreRaw ? genreRaw.split(', ') : [],
      type: getVal('type'),
      imdbRating: getVal('imdbRating'),
      runtime: getVal('runtime'),
      director: getVal('director'),
      cast: castRaw ? castRaw.split(', ') : [],
      plot: getVal('plot'),
      status: getVal('status') || 'Watchlist',
      myRating: parseInt(getVal('myRating') || '0', 10),
      notes: getVal('notes'),
      dateWatched: getVal('dateWatched'),
      rewatchCount: parseInt(getVal('rewatchCount') || '0', 10),
      watchedOn: getVal('watchedOn'),
      releaseDate: getVal('releaseDate'),
      suggestedPlatform: getVal('suggestedPlatform'),
    };
  });
}

/**
 * Appends a new title row to the spreadsheet.
 * Automatically generates a UUID for the record.
 */
async function addTitle(titleObject) {
  const { title } = await getSheetInfo();

  // Read headers to determine column indices
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A1:T1`,
  });

  let headers = headerResponse.data.values
    ? headerResponse.data.values[0]
    : null;
  if (!headers) {
    // If somehow headers are missing, write them
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [HEADERS] },
    });
    headers = HEADERS;
  } else {
    // Add missing schema headers dynamically. If a user is running an older spreadsheet,
    // this auto-upgrades their sheet header row with newer fields without breaking data.
    let updatedHeaders = false;
    ['sourceId', 'releaseDate', 'suggestedPlatform'].forEach((h) => {
      if (!headers.includes(h)) {
        headers.push(h);
        updatedHeaders = true;
      }
    });
    if (updatedHeaders) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!1:1`,
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });
    }
  }

  const id = titleObject.id || crypto.randomUUID();
  const newTitle = {
    ...titleObject,
    id,
    status: titleObject.status || 'Watchlist',
    myRating: titleObject.myRating || 0,
    rewatchCount: titleObject.rewatchCount || 0,
  };

  // Map values to row array according to column header layout
  const row = headers.map((h) => {
    const val = newTitle[h];
    if (Array.isArray(val)) {
      return val.join(', ');
    }
    return val !== undefined && val !== null ? String(val) : '';
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A:T`,
    valueInputOption: 'RAW',
    resource: { values: [row] },
  });

  return newTitle;
}

/**
 * Finds a row by ID and updates user-editable columns in place.
 */
async function updateTitle(id, updates) {
  const { title } = await getSheetInfo();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A:T`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    throw new Error('Spreadsheet database is empty');
  }

  const headers = rows[0];
  const idColIdx = headers.indexOf('id');
  if (idColIdx === -1) {
    throw new Error('ID column was not found in database headers');
  }

  const rowIdx = rows.findIndex((row) => row[idColIdx] === id);
  if (rowIdx === -1) {
    throw new Error(`Record with ID ${id} was not found`);
  }

  const targetRowNumber = rowIdx + 1; // 1-indexed row number
  const existingRow = rows[rowIdx];

  // Map existing array values to object properties
  const rowObj = {};
  headers.forEach((h, idx) => {
    rowObj[h] = existingRow[idx] !== undefined ? existingRow[idx] : '';
  });

  // Apply updates only to user-editable fields
  const editableFields = [
    'status',
    'myRating',
    'notes',
    'dateWatched',
    'rewatchCount',
    'watchedOn',
  ];
  editableFields.forEach((field) => {
    if (updates[field] !== undefined) {
      let val = updates[field];
      if (Array.isArray(val)) {
        val = val.join(', ');
      }
      rowObj[field] = String(val);
    }
  });

  // Convert updated object back to array mapping
  const updatedRow = headers.map((h) => rowObj[h]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A${targetRowNumber}:T${targetRowNumber}`,
    valueInputOption: 'RAW',
    resource: { values: [updatedRow] },
  });

  const genreRaw = rowObj.genre;
  const castRaw = rowObj.cast;

  return {
    id: rowObj.id,
    sourceId: rowObj.sourceId,
    title: rowObj.title,
    year: rowObj.year,
    posterUrl: rowObj.posterUrl,
    genre: genreRaw ? genreRaw.split(', ') : [],
    type: rowObj.type,
    imdbRating: rowObj.imdbRating,
    runtime: rowObj.runtime,
    director: rowObj.director,
    cast: castRaw ? castRaw.split(', ') : [],
    plot: rowObj.plot,
    status: rowObj.status,
    myRating: parseInt(rowObj.myRating || '0', 10),
    notes: rowObj.notes,
    dateWatched: rowObj.dateWatched,
    rewatchCount: parseInt(rowObj.rewatchCount || '0', 10),
    watchedOn: rowObj.watchedOn,
    releaseDate: rowObj.releaseDate,
    suggestedPlatform: rowObj.suggestedPlatform,
  };
}

/**
 * Finds a row by ID and deletes it via batchUpdate deleteDimension.
 * Shifts rows below it up to avoid blank row gaps.
 */
async function deleteTitle(id) {
  const { title, sheetId } = await getSheetInfo();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A:T`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    throw new Error('Spreadsheet database is empty');
  }

  const headers = rows[0];
  const idColIdx = headers.indexOf('id');
  if (idColIdx === -1) {
    throw new Error('ID column was not found in database headers');
  }

  const rowIdx = rows.findIndex((row) => row[idColIdx] === id);
  if (rowIdx === -1) {
    throw new Error(`Record with ID ${id} was not found`);
  }

  // batchUpdate expects 0-indexed row range: startIndex inclusive, endIndex exclusive
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx,
              endIndex: rowIdx + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}

/**
 * Reads a setting value from the "Settings" tab in the spreadsheet.
 * The Settings tab is expected to have headers "Key" and "Value".
 */
async function getSettingValue(key) {
  try {
    const range = 'Settings!A:B';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Settings sheet is empty');
    }

    const headers = rows[0];
    const keyColIdx = headers.indexOf('Key');
    const valColIdx = headers.indexOf('Value');

    if (keyColIdx === -1 || valColIdx === -1) {
      throw new Error('Required headers "Key" and "Value" are missing in the Settings sheet');
    }

    const dataRows = rows.slice(1);
    const matchRow = dataRows.find((row) => row[keyColIdx] === key);
    if (!matchRow || matchRow[valColIdx] === undefined) {
      return null;
    }
    return matchRow[valColIdx];
  } catch (error) {
    // If range is invalid, it usually means the Settings sheet does not exist
    if (error.message && (error.message.includes('range') || error.message.includes('400') || error.message.includes('Requested entity was not found'))) {
      throw new Error('Settings tab not found in the spreadsheet');
    }
    throw error;
  }
}

/**
 * Checks if the Settings tab exists and is readable.
 */
async function checkSettingsTabReadable() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const settingsSheet = response.data.sheets.find(
      (sheet) => sheet.properties.title === 'Settings'
    );
    if (!settingsSheet) return false;

    // Try reading headers
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Settings!A1:B1',
    });
    return !!(readResponse.data.values && readResponse.data.values.length > 0);
  } catch (error) {
    return false;
  }
}

module.exports = {
  getAllTitles,
  addTitle,
  updateTitle,
  deleteTitle,
  getSheetInfo,
  getSettingValue,
  checkSettingsTabReadable,
};
