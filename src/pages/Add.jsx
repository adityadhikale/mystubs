// Add screen: Allows searching for movies/TV shows via API, viewing details, and adding them to the spreadsheet.
import { useState, useEffect } from 'react';
import {
  searchTitles,
  getTitleDetail,
  addTitle,
  getTrending,
  getTitles,
} from '../services/api';
import Toast from '../components/Toast';
import TicketStubCard from '../components/TicketStubCard';
import { formatReleaseDate, isUpcoming } from '../utils/dateUtils';

// Renders a search result preview as a clickable ticket stub
function SearchResultCard({ item, onClick }) {
  return (
    <article
      className="ticket-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="ticket-card-poster-wrap" style={{ position: 'relative' }}>
        {item.source && (
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
            {item.source.toUpperCase()}
          </span>
        )}
        {item.Poster && item.Poster !== 'N/A' ? (
          <img
            src={item.Poster}
            alt={item.Title}
            className="ticket-card-poster"
          />
        ) : (
          <div className="ticket-card-poster-fallback">
            <span>{item.Title}</span>
          </div>
        )}
      </div>

      <div className="ticket-card-body">
        <span
          aria-hidden="true"
          className="ticket-card-notch-left perforation-notch-left perforation-notch-top"
        />
        <span
          aria-hidden="true"
          className="ticket-card-notch-right perforation-notch-right perforation-notch-top"
        />

        <div className="ticket-card-title">{item.Title}</div>

        <div className="ticket-card-meta ticket-card-meta-main">
          <div className="ticket-card-meta-chips">
            <span className="ticket-card-chip">{item.Year}</span>
            <span
              className="ticket-card-chip"
              style={{ textTransform: 'uppercase' }}
            >
              {item.Type}
            </span>
          </div>
          {item.imdbRating && item.imdbRating !== 'N/A' && Number(item.imdbRating) > 0 && (
            <span className="ticket-card-imdb">
              <span className="rating-value">{item.imdbRating}</span>
              <span className="rating-label">IMDB</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// Modal overlay displaying detailed metadata for a selected title, with options to add it to the archive (handling duplicate checking)
function DetailModal({ imdbID, existingSourceIds, onClose, onSuccess }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Write operation states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showConfirmDuplicate, setShowConfirmDuplicate] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTitleDetail(imdbID);
        if (active) {
          setDetails(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load details.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchDetails();
    return () => {
      active = false;
    };
  }, [imdbID]);

  const handlePrintStub = async () => {
    if (!details) return;

    if (!showConfirmDuplicate && existingSourceIds.has(imdbID)) {
      setShowConfirmDuplicate(true);
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      await addTitle({
        ...details,
        sourceId: imdbID,
        releaseDate: details.Released || '',
        watchedOn: details.suggestedPlatform || '',
      });
      onSuccess(details.Title, imdbID);
    } catch (err) {
      setSaveError(err.message || "Couldn't add this title. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2
            className="modal-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span>{loading ? 'Loading Details...' : details?.Title}</span>
            {!loading && details && isUpcoming(details.Released) && (
              <span
                className="detail-chip"
                style={{
                  fontSize: '11px',
                  color: 'var(--primary)',
                  borderColor: 'var(--primary)',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  fontWeight: 'bold',
                }}
              >
                Upcoming
              </span>
            )}
          </h2>
          <button
            className="modal-close-button"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            &times;
          </button>
        </div>

        <span className="modal-perforation-notch-left" />
        <span className="modal-perforation-notch-right" />

        <div className="modal-body">
          {loading && (
            <div className="loading-text">RETRIEVING ARCHIVE FILE...</div>
          )}
          {error && <div className="error-text">{error}</div>}

          {!loading && !error && details && (
            <>
              <div
                style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}
              >
                {details.Poster && details.Poster !== 'N/A' ? (
                  <img
                    src={details.Poster}
                    alt={details.Title}
                    style={{
                      width: '120px',
                      height: '178px',
                      objectFit: 'cover',
                      border: '1px solid var(--outline-variant)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '178px',
                      backgroundColor: 'var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--outline-variant)',
                      padding: '10px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '18px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      NO IMAGE
                    </span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span className="detail-chip">{details.Year}</span>
                    <span
                      className="detail-chip"
                      style={{ textTransform: 'uppercase' }}
                    >
                      {details.Type}
                    </span>
                    <span className="detail-chip">
                      {details.imdbRatingSource === 'tmdb' ? 'TMDB' : 'IMDb'}{' '}
                      {details.imdbRating}
                    </span>
                    <span className="detail-chip">{details.Runtime}</span>
                  </div>

                  <div>
                    <div className="detail-section-label">Genre</div>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                    >
                      {details.Genre && details.Genre.length > 0 ? (
                        details.Genre.map((g) => (
                          <span key={g} className="detail-chip">
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="detail-chip">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <div className="detail-section-label">Release Date</div>
                  <div style={{ color: 'var(--text)' }}>
                    {!details.Released || details.Released === 'N/A'
                      ? 'N/A'
                      : formatReleaseDate(details.Released)}
                  </div>
                </div>
                {details.suggestedPlatform &&
                  details.suggestedPlatform.trim() !== '' && (
                    <div>
                      <div className="detail-section-label">
                        Suggested Platform
                      </div>
                      <div style={{ color: 'var(--text)' }}>
                        {details.suggestedPlatform}
                      </div>
                    </div>
                  )}
                <div>
                  <div className="detail-section-label">Director</div>
                  <div style={{ color: 'var(--text)' }}>
                    {details.Director || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="detail-section-label">Cast</div>
                  <div style={{ color: 'var(--text)' }}>
                    {details.Actors && details.Actors.length > 0
                      ? details.Actors.join(', ')
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="detail-section-label">Plot</div>
                  <div
                    style={{
                      lineHeight: 1.6,
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    {details.Plot || 'No plot summary available.'}
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="error-text" style={{ marginTop: '20px' }}>
                  {saveError}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ width: '100%' }}>
          {showConfirmDuplicate ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
              }}
            >
              <div
                style={{
                  fontFamily: 'Hanken Grotesk',
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                This title is already in your archive. Add it again anyway?
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowConfirmDuplicate(false)}
                  className="detail-secondary-button"
                  disabled={saving}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintStub}
                  className="detail-primary-button"
                  disabled={saving}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  {saving ? 'Adding...' : 'Yes, Add Anyway'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="detail-secondary-button"
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                className="detail-primary-button"
                type="button"
                disabled={loading || error || !details || saving}
                onClick={handlePrintStub}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  opacity: loading || error || !details || saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Adding...' : 'Print Stub'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Add page component: orchestrates search input, loading of existing IDs (to detect duplicates), and trending list suggestions
export default function Add() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImdbId, setSelectedImdbId] = useState(null);
  const [existingSourceIds, setExistingSourceIds] = useState(new Set());

  // Success toast state
  const [toastMessage, setToastMessage] = useState(null);

  // Trending movies state
  const [trending, setTrending] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);

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

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    let active = true;
    async function fetchTrending() {
      try {
        setTrendingLoading(true);
        const data = await getTrending();
        if (active) {
          setTrending(data);
        }
      } catch {
        if (active) {
          setTrending([]);
        }
      } finally {
        if (active) {
          setTrendingLoading(false);
        }
      }
    }
    fetchTrending();
    return () => {
      active = false;
    };
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchTitles(searchQuery);
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while searching.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (titleName, newSourceId) => {
    setToastMessage(`Added "${titleName}" to your archive`);
    setSearchQuery('');
    setResults(null);
    setSelectedImdbId(null);
    if (newSourceId) {
      setExistingSourceIds((prev) => {
        const updated = new Set(prev);
        updated.add(newSourceId);
        return updated;
      });
    }
  };

  return (
    <div className="page-shell">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <div
        className="add-page-header"
        style={{ textAlign: 'center', marginBottom: '32px', marginTop: '12px' }}
      >
        <h1
          className="archive-title"
          style={{ margin: '0 0 8px 0', fontSize: '54px' }}
        >
          Expand Your Archive
        </h1>
        <p
          className="add-page-subtext"
          style={{
            color: 'var(--text-muted)',
            fontSize: '15px',
            margin: 0,
            fontFamily: 'Hanken Grotesk',
            fontWeight: '400',
            lineSpacing: '1.5',
          }}
        >
          Every cinema experience deserves a physical memory. Search for your
          next entry below.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="add-search-row">
        <div className="add-search-input-wrapper">
          <svg
            className="add-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--outline)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search for a movie or TV show..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="theme-control add-search-input"
            aria-label="Search title"
          />
        </div>
        <button
          type="submit"
          className="detail-primary-button add-search-button"
        >
          Search
        </button>
      </form>

      {loading && <div className="loading-text">SEARCHING ...</div>}

      {error && <div className="error-text">{error}</div>}

      {!loading && !error && results !== null && (
        <>
          {results.length > 0 ? (
            <div className="archive-grid">
              {results.map((item) => (
                <SearchResultCard
                  key={item.imdbID}
                  item={item}
                  onClick={() => setSelectedImdbId(item.imdbID)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">No matching titles found.</div>
          )}
        </>
      )}

      {!loading && !error && results === null && (
        <div className="add-empty-state" style={{ paddingTop: '10px' }}>
          {trendingLoading && (
            <div className="loading-text" style={{ marginTop: '20px' }}>
              RETRIEVING TRENDING MOVIE RELEASES...
            </div>
          )}

          {!trendingLoading && trending && trending.length > 0 && (
            <>
              <div className="add-suggestions-label">Suggestions</div>
              <div className="archive-grid">
                {trending.map((item) => (
                  <TicketStubCard
                    key={item.title}
                    title={item}
                    onClick={() => {
                      setSearchQuery(item.title);
                      setSelectedImdbId(item.id);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedImdbId && (
        <DetailModal
          imdbID={selectedImdbId}
          existingSourceIds={existingSourceIds}
          onClose={() => setSelectedImdbId(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
