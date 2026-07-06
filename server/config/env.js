const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Extract bare spreadsheet ID from URL if full link is supplied
const rawSheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
let parsedSheetId = rawSheetId;
if (rawSheetId.startsWith('http')) {
  const match = rawSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    parsedSheetId = match[1];
  }
}

// Clean private key string from quotes and process literal newlines
let rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
// Strip leading/trailing quotes (single, double, or double-double quotes)
rawPrivateKey = rawPrivateKey.replace(/^["']+|["']+$/g, '');
const parsedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

const config = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  OMDB_API_KEY: process.env.OMDB_API_KEY || '',
  GOOGLE_SHEETS_SPREADSHEET_ID: parsedSheetId,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_PRIVATE_KEY: parsedPrivateKey,
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
};

// Validate credentials loading status (without exposing secrets)
const hasEmail = !!config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const hasKey =
  !!config.GOOGLE_PRIVATE_KEY &&
  config.GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY');
const hasSheetId = !!config.GOOGLE_SHEETS_SPREADSHEET_ID;
const hasTmdbKey = !!config.TMDB_API_KEY;

console.log(`========================================`);
console.log(`  Credentials Load Status:`);
console.log(
  `  - Service Account Email: ${hasEmail ? 'LOADED ✓' : 'MISSING ✗'}`,
);
console.log(`  - Private Key:           ${hasKey ? 'LOADED ✓' : 'MISSING ✗'}`);
console.log(
  `  - Spreadsheet ID:        ${hasSheetId ? config.GOOGLE_SHEETS_SPREADSHEET_ID : 'MISSING ✗'}`,
);
console.log(
  `  - TMDB API Key:          ${hasTmdbKey ? 'LOADED ✓' : 'MISSING ✗'}`,
);
console.log(`========================================`);

module.exports = config;
