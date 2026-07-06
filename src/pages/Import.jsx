// Bulk Import screen: parses copy-pasted movie list, queries TMDB/OMDB APIs, ranks matches by string similarity, and saves them to the archive.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchTitles, getTitles, addTitle, getTitleDetail } from '../services/api';

// Simplifies strings by lowering case, removing punctuation, and filtering out common articles for more accurate text matching
function normalizeString(str) {
  if (!str) return '';
  const cleaned = str
    .toLowerCase()
    .replace(/[.,/#!$%^&*Limit;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const filtered = cleaned
    .split(' ')
    .filter((word) => word !== 'the' && word !== 'a' && word !== 'and')
    .join(' ')
    .trim();

  return filtered || cleaned;
}

// Standard Levenshtein distance algorithm: calculates the minimum number of single-character edits to transform one string into another
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Calculates a normalized similarity score between 0 (completely different) and 1 (identical) based on Levenshtein distance
function stringSimilarity(str1, str2) {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return (maxLen - dist) / maxLen;
}

// Main Bulk Import component: manages pasted text inputs, parsed rows, batch API lookups, user overrides/selections, and final batch execution
export default function Import() {
  const navigate = useNavigate();

  const [rawText, setRawText] = useState('');
  const [parsedLines, setParsedLines] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingSourceIds, setExistingSourceIds] = useState(new Set());
  const [lastParsedText, setLastParsedText] = useState('');

  // Batch import states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importSummary, setImportSummary] = useState(null);

  // Load existing database titles once on mount for duplicate checks
  useEffect(() => {
    async function loadExistingIds() {
      try {
        const data = await getTitles();
        const ids = data.map((t) => t.sourceId).filter(Boolean);
        setExistingSourceIds(new Set(ids));
      } catch (err) {
        console.error(
          'Failed to load existing titles for duplicate check:',
          err,
        );
      }
    }
    loadExistingIds();
  }, []);

  // Keep a reference to the latest parsedLines state so our async search loop
  // always has access to the most up-to-date values (including deletions).
  const parsedLinesRef = useRef(parsedLines);
  useEffect(() => {
    parsedLinesRef.current = parsedLines;
  }, [parsedLines]);

  const handleParse = () => {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .map((line) => line.replace(/^\d+[.)-]\s*/, '').trim())
      .filter((line) => line.length > 0);

    const mapped = lines.map((text, index) => ({
      id: `${Date.now()}-${index}-${Math.random()}`,
      text,
      status: 'idle', // 'idle' | 'searching' | 'matched' | 'unmatched'
      result: null,
      alternates: [],
      showSwapPicker: false,
      showManualForm: false,
      manualFormState: null,
    }));
    setParsedLines(mapped);
    setLastParsedText(rawText);
  };

  const handleDeleteRow = (id) => {
    setParsedLines((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleSwapPicker = (id) => {
    setParsedLines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
            ...r,
            showSwapPicker: !r.showSwapPicker,
            showManualForm: false,
          }
          : r,
      ),
    );
  };

  const handleToggleManualForm = (id) => {
    setParsedLines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const show = !r.showManualForm;
        return {
          ...r,
          showManualForm: show,
          showSwapPicker: false,
          manualFormState: show
            ? r.manualFormState || {
              title: r.result ? r.result.Title : r.text,
              year: r.result ? r.result.Year : '',
              type: r.result ? r.result.Type : 'movie',
              poster:
                r.result && r.result.Poster !== 'N/A' ? r.result.Poster : '',
              genre: r.result ? r.result.Genre : '',
              status: r.result ? r.result.status : 'Watchlist',
            }
            : r.manualFormState,
        };
      }),
    );
  };

  const handleUpdateManualField = (id, field, value) => {
    setParsedLines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          manualFormState: {
            ...r.manualFormState,
            [field]: value,
          },
        };
      }),
    );
  };

  const handleSaveManual = (id) => {
    setParsedLines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const form = r.manualFormState;
        if (!form || !form.title.trim()) return r;

        return {
          ...r,
          status: 'matched',
          showManualForm: false,
          result: {
            imdbID: `manual-${r.id}`,
            Title: form.title,
            Year: form.year,
            Type: form.type,
            Poster: form.poster.trim() || 'N/A',
            Genre: form.genre,
            status: form.status,
            source: 'manual',
          },
        };
      }),
    );
  };

  const handleSelectAlternate = (rowId, alternate) => {
    setParsedLines((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
            ...r,
            status: 'matched',
            result: alternate,
            showSwapPicker: false,
          }
          : r,
      ),
    );
  };

  // Loops through parsed rows sequentially to perform API searches, ranking results based on similarity scoring
  const handleSearchAll = async () => {
    if (isSearching) return;
    setIsSearching(true);

    while (true) {
      // Find the first row that is currently 'idle'
      const currentLines = parsedLinesRef.current;
      const nextRow = currentLines.find(
        (r) => !r.status || r.status === 'idle',
      );

      // If no idle rows remain, we are done
      if (!nextRow) {
        break;
      }

      // Mark this row as currently searching
      setParsedLines((prev) =>
        prev.map((r) =>
          r.id === nextRow.id ? { ...r, status: 'searching' } : r,
        ),
      );

      try {
        const results = await searchTitles(nextRow.text);

        // Check if this row was deleted during the network call
        if (!parsedLinesRef.current.some((r) => r.id === nextRow.id)) {
          continue;
        }

        // Score results by similarity
        let scoredResults = [];
        if (Array.isArray(results) && results.length > 0) {
          scoredResults = results.map((item) => ({
            ...item,
            similarityScore: stringSimilarity(nextRow.text, item.Title),
          }));

          // Sort by similarity score descending
          scoredResults.sort((a, b) => b.similarityScore - a.similarityScore);
        }

        // Pick top ranked result using similarity score
        let pickedResult = null;
        if (scoredResults.length > 0) {
          pickedResult = scoredResults[0];

          if (scoredResults.length >= 2) {
            const r0 = scoredResults[0];
            const r1 = scoredResults[1];
            // If the top two matches are extremely close in spelling similarity,
            // default to TMDB source since it usually has better high-quality metadata/poster links than OMDB.
            if (Math.abs(r0.similarityScore - r1.similarityScore) <= 0.1) {
              if (r1.source === 'tmdb' && r0.source !== 'tmdb') {
                pickedResult = r1;
              }
            }
          }
        }

        setParsedLines((prev) =>
          prev.map((r) => {
            if (r.id !== nextRow.id) return r;
            if (pickedResult) {
              return {
                ...r,
                status: 'matched',
                result: pickedResult,
                alternates: scoredResults,
              };
            } else {
              return {
                ...r,
                status: 'unmatched',
                alternates: scoredResults,
              };
            }
          }),
        );
      } catch (err) {
        console.error(`Search failed for "${nextRow.text}":`, err);

        // Check if this row was deleted during the network call
        if (!parsedLinesRef.current.some((r) => r.id === nextRow.id)) {
          continue;
        }

        setParsedLines((prev) =>
          prev.map((r) =>
            r.id === nextRow.id
              ? { ...r, status: 'unmatched', alternates: [] }
              : r,
          ),
        );
      }
    }

    setIsSearching(false);
  };

  // Performs sequential database additions for all matched rows to prevent API rate limiting, then displays an import summary
  const handleConfirmImport = async () => {
    if (isImporting) return;

    // Filter qualifying rows
    const qualifyingRows = parsedLines.filter(
      (r) =>
        r.status === 'matched' &&
        r.result &&
        !existingSourceIds.has(r.result.imdbID),
    );

    const totalToImport = qualifyingRows.length;
    if (totalToImport === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportTotal(totalToImport);
    setImportSummary(null);

    // Save summary stats before clearing/modifying state
    const duplicateCountBefore = duplicateCount;
    const unmatchedCountBefore = unmatchedCount;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < totalToImport; i++) {
      setImportProgress(i + 1);
      const row = qualifyingRows[i];
      try {
        let detailData = {};
        if (row.result.source !== 'manual') {
          try {
            detailData = await getTitleDetail(row.result.imdbID);
          } catch (err) {
            console.warn(`Failed to fetch title details for "${row.result.Title}" (${row.result.imdbID}):`, err);
          }
        }

        const payload = {
          ...row.result,
          ...detailData,
          sourceId: row.result.imdbID,
          status: 'Completed',
        };
        await addTitle(payload);
        successCount++;
      } catch (err) {
        console.error(`Failed to import "${row.result.Title}":`, err);
        failCount++;
      }
    }

    // Set summary report
    setImportSummary({
      imported: successCount,
      skippedDuplicates: duplicateCountBefore,
      skippedUnmatched: unmatchedCountBefore,
      failed: failCount,
    });

    setIsImporting(false);

    // Clear state back to empty on success
    setRawText('');
    setParsedLines([]);
    setLastParsedText('');
  };

  // Stat Strip counts
  const matchedCount = parsedLines.filter(
    (l) => l.status === 'matched' && !existingSourceIds.has(l.result?.imdbID),
  ).length;

  const duplicateCount = parsedLines.filter(
    (l) =>
      l.status === 'matched' &&
      l.result &&
      existingSourceIds.has(l.result.imdbID),
  ).length;

  const unmatchedCount = parsedLines.filter(
    (l) => l.status === 'unmatched',
  ).length;

  const allCompleted =
    parsedLines.length > 0 &&
    parsedLines.every(
      (line) => line.status === 'matched' || line.status === 'unmatched',
    );

  const hasUnparsedChanges =
    rawText.trim() !== '' && rawText !== lastParsedText;

  const hasImportableRow = parsedLines.some(
    (r) =>
      r.status === 'matched' &&
      r.result &&
      !existingSourceIds.has(r.result.imdbID),
  );

  return (
    <div className="page-shell">
      <h1
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '54px',
          color: 'var(--accent-color)',
          margin: '0 0 8px 0',
          letterSpacing: '2px',
        }}
      >
        Bulk Import
      </h1>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '18px',
          margin: '0 0 32px 0',
          fontFamily: 'Hanken Grotesk',
        }}
      >
        Paste a list of movies or TV shows to import them into your archive in
        bulk.
      </p>

      {/* Success Summary Panel */}
      {importSummary && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--outline-variant)',
            padding: '24px',
            marginBottom: '32px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Perforation notches on the sides */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '-10px',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--bg)',
              clipPath: 'circle(50% at 50% 50%)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              right: '-10px',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--bg)',
              clipPath: 'circle(50% at 50% 50%)',
            }}
          />

          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '16px' }}
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>

          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              color: 'var(--primary)',
              margin: '0 0 12px 0',
              letterSpacing: '1px',
            }}
          >
            Import Completed
          </h2>

          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'var(--text)',
              marginBottom: '24px',
              maxWidth: '500px',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
              {importSummary.imported}{' '}
              {importSummary.imported === 1 ? 'title' : 'titles'} successfully
              imported.
            </p>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {importSummary.skippedDuplicates > 0 && (
                <div>
                  {importSummary.skippedDuplicates} skipped (already in
                  archive).
                </div>
              )}
              {importSummary.skippedUnmatched > 0 && (
                <div>{importSummary.skippedUnmatched} skipped (unmatched).</div>
              )}
              {importSummary.failed > 0 && (
                <div style={{ color: 'var(--error)', marginTop: '6px' }}>
                  {importSummary.failed} failed — check your connection and
                  retry that title from Add.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="detail-primary-button"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '16px',
                letterSpacing: '1px',
                padding: '8px 20px',
              }}
            >
              Go to Archive
            </button>
            <button
              type="button"
              onClick={() => setImportSummary(null)}
              className="detail-secondary-button"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '16px',
                letterSpacing: '1px',
                padding: '8px 20px',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Importing Progress Panel */}
      {isImporting && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--outline-variant)',
            padding: '32px 24px',
            marginBottom: '32px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Perforation notches on the sides */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '-10px',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--bg)',
              clipPath: 'circle(50% at 50% 50%)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              right: '-10px',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--bg)',
              clipPath: 'circle(50% at 50% 50%)',
            }}
          />

          <div
            className="ticket-punch-container"
            style={{ marginBottom: '16px' }}
          >
            <svg
              className="ticket-punch-svg"
              viewBox="0 0 100 60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <mask id="import-ticket-mask">
                  <rect x="0" y="0" width="100" height="60" fill="white" />
                  <circle
                    className="punch-hole-mask"
                    cx="18"
                    cy="30"
                    r="5"
                    fill="black"
                  />
                </mask>
              </defs>

              <g mask="url(#import-ticket-mask)">
                <path
                  d="M 10,5 H 90 A 5,5 0 0,1 95,10 V 24 A 6,6 0 0,0 95,36 V 50 A 5,5 0 0,1 90,55 H 10 A 5,5 0 0,1 5,50 V 36 A 6,6 0 0,0 5,24 V 10 A 5,5 0 0,1 10,5 Z"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <line
                  x1="32"
                  y1="6"
                  x2="32"
                  y2="54"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              </g>

              <circle
                className="punch-hole-edge"
                cx="18"
                cy="30"
                r="5"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
              />
              <circle
                className="punch-particle particle-1"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
              <circle
                className="punch-particle particle-2"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
              <circle
                className="punch-particle particle-3"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              color: 'var(--primary)',
              margin: '0 0 8px 0',
              letterSpacing: '1.5px',
            }}
          >
            Importing...
          </h2>
          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '15px',
              color: 'var(--text-muted)',
              fontWeight: '500',
            }}
          >
            Importing {importProgress} of {importTotal}...
          </div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <div className="detail-section-label">Paste Your List</div>
        <textarea
          className="theme-control"
          placeholder="Paste your titles here, one per line..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          style={{
            width: '100%',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: '18px',
            lineHeight: 1.6,
          }}
        />
        <button
          type="button"
          className="detail-primary-button"
          disabled={!hasUnparsedChanges || isSearching || isImporting}
          onClick={handleParse}
          style={{
            marginTop: '16px',
            opacity:
              hasUnparsedChanges && !isSearching && !isImporting ? 1 : 0.5,
            cursor:
              hasUnparsedChanges && !isSearching && !isImporting
                ? 'pointer'
                : 'not-allowed',
          }}
        >
          Parse List
        </button>
      </div>

      {parsedLines.length > 0 && (
        <div style={{ marginTop: '32px', width: '100%', maxWidth: 'none' }}>
          {/* Search All Actions Panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--outline-variant)',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Hanken Grotesk',
                  fontSize: '18px',
                  color: 'var(--text-muted)',
                  fontWeight: '500',
                }}
              >
                {parsedLines.length}{' '}
                {parsedLines.length === 1 ? 'title' : 'titles'} ready to search
              </span>
              <button
                className="detail-primary-button"
                onClick={handleSearchAll}
                disabled={isSearching || allCompleted || isImporting}
                style={{
                  opacity: isSearching || allCompleted || isImporting ? 0.5 : 1,
                  cursor:
                    isSearching || allCompleted || isImporting
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isSearching ? 'Searching...' : 'Search All'}
              </button>
            </div>

            {/* Summary Stat Cards Strip */}
            <div
              className="archive-stats"
              style={{
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                marginTop: '8px',
                marginBottom: 0,
              }}
            >
              <div className="archive-stat" style={{ gridColumn: 'auto' }}>
                <div className="archive-stat-value">
                  {matchedCount}
                </div>
                <div className="archive-stat-label">
                  Matched
                </div>
              </div>
              <div className="archive-stat" style={{ gridColumn: 'auto' }}>
                <div className="archive-stat-value">
                  {unmatchedCount}
                </div>
                <div className="archive-stat-label">
                  Unmatched
                </div>
              </div>
              <div
                className="archive-stat"
                style={{ borderLeftColor: 'var(--error)', gridColumn: 'auto' }}
              >
                <div
                  className="archive-stat-value"
                  style={{ color: 'var(--error)' }}
                >
                  {duplicateCount}
                </div>
                <div className="archive-stat-label">
                  Already in Archive
                </div>
              </div>
            </div>
          </div>

          <div
            className="detail-section-label"
            style={{ marginBottom: '16px' }}
          >
            Parsed Titles
          </div>          {/* Grid of Parsed Titles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 220px))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {parsedLines.map((item, index) => {
              const hasPanel = item.showSwapPicker || item.showManualForm;
              return (
                <React.Fragment key={item.id}>
                  {/* Card Container */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--outline-variant)',
                      position: 'relative',
                      borderRadius: '0px',
                      overflow: 'hidden',
                      height: '100%',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Poster Area */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '2/3',
                        position: 'relative',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--outline-variant)',
                        backgroundColor: 'var(--surface-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Row Number Badge (top-left) */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          color: 'var(--primary)',
                          padding: '2px 6px',
                          fontSize: '14px',
                          fontFamily: "'Bebas Neue', sans-serif",
                          letterSpacing: '0.5px',
                          lineHeight: 1,
                          zIndex: 1,
                        }}
                      >
                        #{index + 1}
                      </span>

                      {/* Rendering states inside poster */}
                      {item.status === 'searching' && (
                        <div
                          className="ticket-punch-container"
                          style={{ width: '80px', height: '48px', margin: 0, zIndex: 1 }}
                        >
                          <svg
                            className="ticket-punch-svg"
                            viewBox="0 0 100 60"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <defs>
                              <mask id={`ticket-mask-${item.id}`}>
                                <rect
                                  x="0"
                                  y="0"
                                  width="100"
                                  height="60"
                                  fill="white"
                                />
                                <circle
                                  className="punch-hole-mask"
                                  cx="18"
                                  cy="30"
                                  r="5"
                                  fill="black"
                                />
                              </mask>
                            </defs>

                            <g mask={`url(#ticket-mask-${item.id})`}>
                              <path
                                d="M 10,5 H 90 A 5,5 0 0,1 95,10 V 24 A 6,6 0 0,0 95,36 V 50 A 5,5 0 0,1 90,55 H 10 A 5,5 0 0,1 5,50 V 36 A 6,6 0 0,0 5,24 V 10 A 5,5 0 0,1 10,5 Z"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="2.5"
                              />
                              <line
                                x1="32"
                                y1="6"
                                x2="32"
                                y2="54"
                                stroke="var(--primary)"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                opacity="0.6"
                              />
                            </g>

                            <circle
                              className="punch-hole-edge"
                              cx="18"
                              cy="30"
                              r="5"
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="1.5"
                            />
                            <circle
                              className="punch-particle particle-1"
                              cx="18"
                              cy="30"
                              r="1.2"
                              fill="var(--primary)"
                            />
                            <circle
                              className="punch-particle particle-2"
                              cx="18"
                              cy="30"
                              r="1.2"
                              fill="var(--primary)"
                            />
                            <circle
                              className="punch-particle particle-3"
                              cx="18"
                              cy="30"
                              r="1.2"
                              fill="var(--primary)"
                            />
                          </svg>
                        </div>
                      )}

                      {(item.status === 'idle' || !item.status) && (
                        <span
                          style={{
                            fontSize: '16px',
                            fontFamily: "'Bebas Neue', sans-serif",
                            color: 'var(--text-muted)',
                            zIndex: 1,
                          }}
                        >
                          PENDING
                        </span>
                      )}

                      {item.status === 'unmatched' && (
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--error)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ zIndex: 1 }}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}

                      {item.status === 'matched' && item.result && (
                        <>
                          {/* Source Tag (top-right) */}
                          <span
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              display: 'inline-block',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontFamily: "'Bebas Neue', sans-serif",
                              letterSpacing: '0.5px',
                              backgroundColor: 'var(--primary)',
                              color: 'var(--on-primary)',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                              zIndex: 1,
                            }}
                          >
                            {item.result.source === 'tmdb'
                              ? 'TMDB'
                              : item.result.source === 'omdb'
                                ? 'OMDB'
                                : 'MANUAL'}
                          </span>

                          {/* Already in Archive bottom tag */}
                          {existingSourceIds.has(item.result.imdbID) && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                right: '8px',
                                display: 'block',
                                textAlign: 'center',
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontFamily: "'Bebas Neue', sans-serif",
                                letterSpacing: '0.5px',
                                border: '1px solid var(--error)',
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                color: 'var(--error)',
                                textTransform: 'uppercase',
                                lineHeight: 1.2,
                                zIndex: 1,
                                boxSizing: 'border-box',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                              }}
                            >
                              Already in Archive
                            </span>
                          )}

                          {item.result.Poster && item.result.Poster !== 'N/A' ? (
                            <img
                              src={item.result.Poster}
                              alt={item.result.Title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: '16px',
                                fontFamily: "'Bebas Neue', sans-serif",
                                color: 'var(--text-muted)',
                              }}
                            >
                              NO IMG
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Details area below poster */}
                    <div
                      style={{
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                      }}
                    >
                      {/* Text content container */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.status === 'searching' && (
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'var(--text-muted)',
                              fontFamily: "'Hanken Grotesk', sans-serif",
                            }}
                          >
                            Searching...
                          </span>
                        )}

                        {(item.status === 'idle' || !item.status) && (
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'var(--text)',
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.text}
                          </span>
                        )}

                        {item.status === 'unmatched' && (
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'var(--error)',
                              fontFamily: "'Hanken Grotesk', sans-serif",
                            }}
                          >
                            No match found
                          </span>
                        )}

                        {item.status === 'matched' && item.result && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: 'var(--text)',
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                lineHeight: '1.2',
                                wordBreak: 'break-word',
                              }}
                            >
                              {item.result.Title}
                              {item.result.Year && (
                                <span
                                  style={{
                                    fontSize: '14px',
                                    color: 'var(--text-muted)',
                                    fontWeight: '400',
                                    marginLeft: '6px',
                                    fontFamily: "'Hanken Grotesk', sans-serif",
                                  }}
                                >
                                  ({item.result.Year})
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Pasted source text */}
                        <span
                          style={{
                            fontSize: '14px',
                            color: 'var(--text-muted)',
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            marginTop: '2px',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          Pasted: "{item.text}"
                        </span>
                      </div>

                      {/* Actions footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        {item.status === 'matched' && item.result && (
                          <>
                            {item.result.source === 'manual' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleManualForm(item.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--primary)',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '15px',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '500',
                                }}
                              >
                                {item.showManualForm ? 'Close' : 'Edit manual info'}
                              </button>
                            ) : (
                              item.alternates &&
                              item.alternates.filter(
                                (alt) => alt.imdbID !== item.result?.imdbID,
                              ).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSwapPicker(item.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    color: 'var(--primary)',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontFamily: "'Hanken Grotesk', sans-serif",
                                    fontWeight: '500',
                                  }}
                                >
                                  {item.showSwapPicker ? 'Close' : 'Not this one?'}
                                </button>
                              )
                            )}
                          </>
                        )}

                        {item.status === 'unmatched' && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {item.alternates && item.alternates.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleToggleSwapPicker(item.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--primary)',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '15px',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '500',
                                }}
                              >
                                {item.showSwapPicker ? 'Close' : 'Choose match'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleManualForm(item.id)}
                              style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--primary)',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '15px',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '500',
                              }}
                            >
                              {item.showManualForm ? 'Cancel' : 'Fill manually'}
                            </button>
                          </div>
                        )}

                        {/* Space placeholder if no left elements to align right trash bin */}
                        {item.status !== 'matched' && item.status !== 'unmatched' && <div />}

                        <button
                          type="button"
                          onClick={() => handleDeleteRow(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          aria-label="Remove title"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Grid Panel for Swap Picker or Manual Form */}
                  {hasPanel && (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        marginTop: '12px',
                        padding: '20px',
                        backgroundColor: 'var(--bg)',
                        border: '1px dashed var(--outline-variant)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {item.showSwapPicker && item.alternates && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div
                            style={{
                              fontSize: '18px',
                              textTransform: 'uppercase',
                              fontFamily: "'Bebas Neue', sans-serif",
                              color: 'var(--text-muted)',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Alternate Matches
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: '16px',
                              width: '100%',
                            }}
                          >
                            {item.alternates
                              .filter((alt) => alt.imdbID !== item.result?.imdbID)
                              .slice(0, 5)
                              .map((alt) => (
                                <button
                                  key={alt.imdbID}
                                  type="button"
                                  onClick={() => handleSelectAlternate(item.id, alt)}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--outline-variant)',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'var(--text)',
                                    borderRadius: '0px',
                                    gap: '6px',
                                    transition: 'border-color 0.18s ease',
                                  }}
                                >
                                  {alt.Poster && alt.Poster !== 'N/A' ? (
                                    <img
                                      src={alt.Poster}
                                      alt={alt.Title}
                                      style={{
                                        width: '100%',
                                        aspectRatio: '2/3',
                                        objectFit: 'cover',
                                        border: '1px solid var(--outline-variant)',
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: '100%',
                                        aspectRatio: '2/3',
                                        backgroundColor: 'var(--surface-hover)',
                                        border: '1px solid var(--outline-variant)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontFamily: "'Bebas Neue', sans-serif",
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        NO IMG
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      width: '100%',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        fontFamily: "'Hanken Grotesk', sans-serif",
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={alt.Title}
                                    >
                                      {alt.Title}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        fontFamily: "'Hanken Grotesk', sans-serif",
                                      }}
                                    >
                                      ({alt.Year})
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          padding: '2px 4px',
                                          fontSize: '9px',
                                          fontFamily: "'Bebas Neue', sans-serif",
                                          letterSpacing: '0.5px',
                                          backgroundColor: 'var(--primary)',
                                          color: 'var(--on-primary)',
                                          textTransform: 'uppercase',
                                          lineHeight: 1,
                                        }}
                                      >
                                        {alt.source === 'tmdb' ? 'TMDB' : 'OMDB'}
                                      </span>
                                      {existingSourceIds.has(alt.imdbID) && (
                                        <span
                                          style={{
                                            display: 'inline-block',
                                            padding: '2px 4px',
                                            fontSize: '9px',
                                            fontFamily: "'Bebas Neue', sans-serif",
                                            letterSpacing: '0.5px',
                                            border: '1px solid var(--error)',
                                            color: 'var(--error)',
                                            textTransform: 'uppercase',
                                            lineHeight: 1,
                                          }}
                                        >
                                          In Archive
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {item.showManualForm && item.manualFormState && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '18px',
                              textTransform: 'uppercase',
                              fontFamily: "'Bebas Neue', sans-serif",
                              color: 'var(--primary)',
                              letterSpacing: '0.5px',
                              marginBottom: '4px',
                            }}
                          >
                            Fill Info Manually
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <label
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '600',
                                }}
                              >
                                TITLE *
                              </label>
                              <input
                                type="text"
                                value={item.manualFormState.title}
                                onChange={(e) =>
                                  handleUpdateManualField(
                                    item.id,
                                    'title',
                                    e.target.value,
                                  )
                                }
                                className="theme-control"
                                placeholder="Title"
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <label
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '600',
                                }}
                              >
                                YEAR
                              </label>
                              <input
                                type="text"
                                value={item.manualFormState.year}
                                onChange={(e) =>
                                  handleUpdateManualField(
                                    item.id,
                                    'year',
                                    e.target.value,
                                  )
                                }
                                className="theme-control"
                                placeholder="e.g. 2026"
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <label
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '600',
                                }}
                              >
                                TYPE
                              </label>
                              <select
                                value={item.manualFormState.type}
                                onChange={(e) =>
                                  handleUpdateManualField(
                                    item.id,
                                    'type',
                                    e.target.value,
                                  )
                                }
                                className="theme-select"
                                style={{ width: '100%' }}
                              >
                                <option value="movie">Movie</option>
                                <option value="series">Series</option>
                              </select>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <label
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  fontWeight: '600',
                                }}
                              >
                                STATUS
                              </label>
                              <select
                                value={item.manualFormState.status}
                                onChange={(e) =>
                                  handleUpdateManualField(
                                    item.id,
                                    'status',
                                    e.target.value,
                                  )
                                }
                                className="theme-select"
                                style={{ width: '100%' }}
                              >
                                <option value="Watchlist">Watchlist</option>
                                <option value="Watching">Watching</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontWeight: '600',
                              }}
                            >
                              POSTER URL (OPTIONAL)
                            </label>
                            <input
                              type="text"
                              value={item.manualFormState.poster}
                              onChange={(e) =>
                                handleUpdateManualField(
                                  item.id,
                                  'poster',
                                  e.target.value,
                                )
                              }
                              className="theme-control"
                              placeholder="https://example.com/poster.jpg"
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontWeight: '600',
                              }}
                            >
                              GENRE (COMMA-SEPARATED)
                            </label>
                            <input
                              type="text"
                              value={item.manualFormState.genre}
                              onChange={(e) =>
                                handleUpdateManualField(
                                  item.id,
                                  'genre',
                                  e.target.value,
                                )
                              }
                              className="theme-control"
                              placeholder="e.g. Drama, Thriller"
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '8px',
                              marginTop: '8px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleManualForm(item.id)}
                              className="detail-secondary-button"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveManual(item.id)}
                              disabled={!item.manualFormState.title.trim()}
                              className="detail-primary-button"
                              style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                opacity: item.manualFormState.title.trim() ? 1 : 0.5,
                                cursor: item.manualFormState.title.trim()
                                  ? 'pointer'
                                  : 'not-allowed',
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Confirm & Import Row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--outline-variant)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                className="detail-primary-button"
                onClick={handleConfirmImport}
                disabled={!hasImportableRow || isImporting || isSearching}
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '20px',
                  letterSpacing: '1px',
                  padding: '12px 28px',
                  opacity:
                    hasImportableRow && !isImporting && !isSearching ? 1 : 0.5,
                  cursor:
                    hasImportableRow && !isImporting && !isSearching
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                {isImporting ? 'Importing...' : 'Confirm & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
