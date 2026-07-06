// Profile screen: displays database integration status (OMDB, TMDB, Google Sheets) and exports archive backups in CSV/JSON formats.
import React, { useEffect, useState } from 'react';
import { getStatus, getTitles } from '../services/api';
import Toast from '../components/Toast';
import { getTodayDateString, exportToCsv, exportToJson } from '../utils/exportUtils';

// Main Profile page component: handles connection checks, statistics calculations, and backup exports
export default function Profile() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Titles stats states
  const [titles, setTitles] = useState([]);
  const [titlesLoading, setTitlesLoading] = useState(true);

  // Export states
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      // 1. Fetch connection status
      try {
        setLoading(true);
        setError(false);
        const statusData = await getStatus();
        if (active) {
          setStatus(statusData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }

      // 2. Fetch full titles list
      try {
        setTitlesLoading(true);
        const titlesData = await getTitles();
        if (active) {
          setTitles(titlesData);
          setTitlesLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch titles:', err);
        if (active) {
          setTitlesLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  // Compute Stats
  const computeStats = () => {
    if (!titles || titles.length === 0) {
      return {
        total: 0,
        avgRating: '—',
        topGenre: '—',
        topPlatform: '—',
        moviesCount: 0,
        seriesCount: 0,
      };
    }

    const total = titles.length;

    // Avg Rating (across myRating > 0)
    const ratings = titles.filter((t) => t.myRating && t.myRating > 0).map((t) => t.myRating);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : '—';

    // Top Genre (most frequent)
    const genreCounts = {};
    titles.forEach((t) => {
      if (Array.isArray(t.genre)) {
        t.genre.forEach((g) => {
          if (g && g.trim()) {
            const cleanG = g.trim();
            genreCounts[cleanG] = (genreCounts[cleanG] || 0) + 1;
          }
        });
      }
    });
    let topGenre = '—';
    let maxGenreCount = 0;
    Object.entries(genreCounts).forEach(([g, count]) => {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        topGenre = g;
      }
    });

    // Top Platform (excluding empty)
    const platformCounts = {};
    titles.forEach((t) => {
      if (t.watchedOn && t.watchedOn.trim()) {
        const cleanP = t.watchedOn.trim();
        platformCounts[cleanP] = (platformCounts[cleanP] || 0) + 1;
      }
    });
    let topPlatform = '—';
    let maxPlatformCount = 0;
    Object.entries(platformCounts).forEach(([p, count]) => {
      if (count > maxPlatformCount) {
        maxPlatformCount = count;
        topPlatform = p;
      }
    });

    // Movies vs Series Count
    let moviesCount = 0;
    let seriesCount = 0;
    titles.forEach((t) => {
      const typeClean = (t.type || '').toLowerCase();
      if (typeClean === 'movie') {
        moviesCount++;
      } else if (typeClean === 'series' || typeClean === 'tv') {
        seriesCount++;
      }
    });

    return {
      total,
      avgRating,
      topGenre,
      topPlatform,
      moviesCount,
      seriesCount,
    };
  };

  const stats = computeStats();
  const totalShare = stats.moviesCount + stats.seriesCount;
  const moviePct = totalShare > 0 ? (stats.moviesCount / totalShare) * 100 : 0;
  const seriesPct = totalShare > 0 ? (stats.seriesCount / totalShare) * 100 : 0;

  // Helpers to get indicator color and text
  const getStatusInfo = (present, isErrorState = false) => {
    if (error || isErrorState) {
      return {
        color: 'var(--outline)',
        text: 'Unknown',
      };
    }
    if (present) {
      return {
        color: '#4caf50',
        text: 'Connected',
      };
    }
    return {
      color: 'var(--error)',
      text: 'Missing',
    };
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const titlesData = await getTitles();
      const filename = `mystubs-export-${getTodayDateString()}.csv`;
      exportToCsv(titlesData, filename);
      setToastMessage('Export downloaded');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setToastMessage('Failed to export — check your connection');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setExportingJson(true);
      const titlesData = await getTitles();
      const filename = `mystubs-export-${getTodayDateString()}.json`;
      exportToJson(titlesData, filename);
      setToastMessage('Export downloaded');
    } catch (err) {
      console.error('Failed to export JSON:', err);
      setToastMessage('Failed to export — check your connection');
    } finally {
      setExportingJson(false);
    }
  };

  const omdbInfo = getStatusInfo(status?.omdbKeyPresent);
  const tmdbInfo = getStatusInfo(status?.tmdbKeyPresent);
  const sheetsInfo = getStatusInfo(status?.sheetsConnected, error ? false : !status?.sheetsConnected);

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
        Profile
      </h1>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '18px',
          margin: '0 0 32px 0',
          fontFamily: 'Hanken Grotesk',
        }}
      >
        Manage your connection settings and backend integration status.
      </p>

      {loading ? (
        <div className="loading-text">LOADING STATUS...</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            marginTop: '24px',
          }}
        >
          {/* Left Column: Connection Status & Export Archive */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div className="detail-section-label" style={{ marginBottom: '16px' }}>
                Connection Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* OMDb API Key */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--outline-variant)',
                    padding: '16px 20px',
                    borderRadius: '0px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', color: 'var(--text)' }}>
                      OMDb API Key
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: omdbInfo.color,
                        }}
                      />
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>
                        {omdbInfo.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TMDB API Key */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--outline-variant)',
                    padding: '16px 20px',
                    borderRadius: '0px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', color: 'var(--text)' }}>
                      TMDB API Key
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: tmdbInfo.color,
                        }}
                      />
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>
                        {tmdbInfo.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Sheets */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--outline-variant)',
                    padding: '16px 20px',
                    borderRadius: '0px',
                    gap: !sheetsInfo.present && status?.sheetsError ? '8px' : '0px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', color: 'var(--text)' }}>
                      Google Sheets
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: sheetsInfo.color,
                        }}
                      />
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>
                        {sheetsInfo.text}
                      </span>
                    </div>
                  </div>
                  {!error && !status?.sheetsConnected && status?.sheetsError && (
                    <div
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        lineHeight: '1.4',
                        marginTop: '4px',
                      }}
                    >
                      Error: {status.sheetsError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="detail-section-label" style={{ marginBottom: '16px' }}>
                Export Archive
              </div>
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--outline-variant)',
                  padding: '24px',
                  borderRadius: '0px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: '15px',
                    color: 'var(--text-muted)',
                    margin: '0 0 20px 0',
                    lineHeight: '1.5',
                  }}
                >
                  Download a personal backup of your archive, independent of Google Sheets.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="detail-secondary-button"
                    disabled={exportingCsv || exportingJson}
                    onClick={handleExportCsv}
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '16px',
                      letterSpacing: '1px',
                      cursor: exportingCsv || exportingJson ? 'not-allowed' : 'pointer',
                      opacity: exportingCsv || exportingJson ? 0.6 : 1,
                      minWidth: '140px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {exportingCsv ? 'Exporting...' : 'Export as CSV'}
                  </button>
                  <button
                    type="button"
                    className="detail-secondary-button"
                    disabled={exportingCsv || exportingJson}
                    onClick={handleExportJson}
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '16px',
                      letterSpacing: '1px',
                      cursor: exportingCsv || exportingJson ? 'not-allowed' : 'pointer',
                      opacity: exportingCsv || exportingJson ? 0.6 : 1,
                      minWidth: '140px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {exportingJson ? 'Exporting...' : 'Export as JSON'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Archive Stats & Illustration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div className="detail-section-label" style={{ marginBottom: '16px' }}>
                Archive Stats
              </div>
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--outline-variant)',
                  padding: '24px',
                  borderRadius: '0px',
                }}
              >
                {/* 2x2 Grid of stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px 20px',
                    marginBottom: '12px',
                  }}
                >
                  {/* Total Titles */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '36px',
                        color: 'var(--primary)',
                        lineHeight: '1',
                      }}
                    >
                      {titlesLoading ? '...' : stats.total}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '4px',
                      }}
                    >
                      Total Titles
                    </div>
                  </div>

                  {/* Avg Rating */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '36px',
                        color: 'var(--primary)',
                        lineHeight: '1',
                      }}
                    >
                      {titlesLoading ? '...' : stats.avgRating}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '4px',
                      }}
                    >
                      Avg Rating
                    </div>
                  </div>

                  {/* Top Genre */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '36px',
                        color: 'var(--primary)',
                        lineHeight: '1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={stats.topGenre}
                    >
                      {titlesLoading ? '...' : stats.topGenre}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '4px',
                      }}
                    >
                      Top Genre
                    </div>
                  </div>

                  {/* Top Platform */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '36px',
                        color: 'var(--primary)',
                        lineHeight: '1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={stats.topPlatform}
                    >
                      {titlesLoading ? '...' : stats.topPlatform}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '4px',
                      }}
                    >
                      Top Platform
                    </div>
                  </div>
                </div>

                {/* Dashed Divider */}
                <div
                  style={{
                    borderTop: '1px dashed var(--outline-variant)',
                    margin: '20px 0',
                  }}
                />

                {/* Media Type Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Movies */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '13px',
                        color: 'var(--text)',
                        marginBottom: '6px',
                      }}
                    >
                      <span>Movies</span>
                      <span style={{ fontWeight: '700' }}>
                        {titlesLoading ? '...' : `${stats.moviesCount} (${moviePct.toFixed(0)}%)`}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        backgroundColor: 'var(--surface-hover)',
                        width: '100%',
                        borderRadius: '0px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--primary)',
                          width: `${titlesLoading ? 0 : moviePct}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Series */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: '13px',
                        color: 'var(--text)',
                        marginBottom: '6px',
                      }}
                    >
                      <span>Series &amp; TV</span>
                      <span style={{ fontWeight: '700' }}>
                        {titlesLoading ? '...' : `${stats.seriesCount} (${seriesPct.toFixed(0)}%)`}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        backgroundColor: 'var(--surface-hover)',
                        width: '100%',
                        borderRadius: '0px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--primary)',
                          width: `${titlesLoading ? 0 : seriesPct}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Film Reel Illustration */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                marginTop: '16px',
              }}
            >
              <svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                fill="none"
                stroke="var(--outline-variant)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.6 }}
              >
                {/* Outer Film Reel Circle */}
                <circle cx="50" cy="40" r="30" />
                {/* Center hole */}
                <circle cx="50" cy="40" r="6" />
                {/* Spokes */}
                <line x1="50" y1="10" x2="50" y2="34" />
                <line x1="24" y1="55" x2="45" y2="43" />
                <line x1="76" y1="55" x2="55" y2="43" />
                {/* Sprocket holes */}
                <circle cx="50" cy="20" r="3.5" fill="none" />
                <circle cx="67" cy="30" r="3.5" fill="none" />
                <circle cx="67" cy="50" r="3.5" fill="none" />
                <circle cx="50" cy="60" r="3.5" fill="none" />
                <circle cx="33" cy="50" r="3.5" fill="none" />
                <circle cx="33" cy="30" r="3.5" fill="none" />

                {/* Film strip rectangle below */}
                <rect x="20" y="80" width="60" height="12" rx="1" />
                {/* Film ticks */}
                <line x1="25" y1="80" x2="25" y2="92" strokeDasharray="2 2" />
                <line x1="35" y1="80" x2="35" y2="92" strokeDasharray="2 2" />
                <line x1="45" y1="80" x2="45" y2="92" strokeDasharray="2 2" />
                <line x1="55" y1="80" x2="55" y2="92" strokeDasharray="2 2" />
                <line x1="65" y1="80" x2="65" y2="92" strokeDasharray="2 2" />
                <line x1="75" y1="80" x2="75" y2="92" strokeDasharray="2 2" />
              </svg>
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '14px',
                  color: 'var(--outline-variant)',
                  letterSpacing: '3px',
                  marginTop: '12px',
                }}
              >
                EST. 2026
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
