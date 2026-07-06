// Title Detail screen: displays full metadata for a specific archive entry and allows modifying personal notes, rating, platform, status, or deleting the stub.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTitles, updateTitle, deleteTitle } from '../services/api';
import Toast from '../components/Toast';
import { formatReleaseDate, isUpcoming } from '../utils/dateUtils';

const statusOptions = ['Watchlist', 'Watching', 'Completed'];
const platformOptions = [
  'Netflix',
  'Prime Video',
  'Disney+ Hotstar',
  'JioCinema',
  'Theater',
  'YouTube',
  'SonyLIV',
  'ZEE5',
  'Torrent/Downloaded',
  'Other',
];

// Small label header style helper for details sections
function SectionLabel({ children }) {
  return <div className="detail-section-label">{children}</div>;
}

// Badged metadata pill (e.g. Year, Type, IMDb rating, Runtime)
function InfoPill({ children }) {
  return <span className="detail-chip">{children}</span>;
}

// Interactive 5-star rating picker using unicode stars
function StarPicker({ rating, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const active = value <= rating;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            style={{
              border: 'none',
              background: 'transparent',
              color: active
                ? 'var(--accent-color)'
                : 'rgba(242, 242, 242, 0.24)',
              fontSize: '26px',
              padding: 0,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

const bulbCoords = [
  [10, 6],
  [41.1, 6],
  [72.2, 6],
  [103.3, 6],
  [134.4, 6],
  [165.6, 6],
  [196.7, 6],
  [227.8, 6],
  [258.9, 6],
  [290, 6],
  [294, 41],
  [294, 76],
  [294, 111],
  [294, 146],
  [294, 181],
  [294, 264],
  [294, 299],
  [294, 334],
  [294, 369],
  [294, 404],
  [290, 439],
  [258.9, 439],
  [227.8, 439],
  [196.7, 439],
  [165.6, 439],
  [134.4, 439],
  [103.3, 439],
  [72.2, 439],
  [41.1, 439],
  [10, 439],
  [6, 404],
  [6, 369],
  [6, 334],
  [6, 299],
  [6, 264],
  [6, 181],
  [6, 146],
  [6, 111],
  [6, 76],
  [6, 41],
];

// Main Title Detail page component: handles loading detail from archive, form state initialization, updates, and deletion confirmation
export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Write operation states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [chaserIndex, setChaserIndex] = useState(0);
  const [ellipsis, setEllipsis] = useState('');

  const [formState, setFormState] = useState({
    status: 'Watchlist',
    watchedOn: '',
    otherWatchedOn: '',
    dateWatched: '',
    myRating: 0,
    rewatchCount: 0,
    notes: '',
  });

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setChaserIndex((prev) => (prev + 1) % 40);
    }, 80);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setEllipsis((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    setHasInitialized(false);
    let active = true;
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTitles();
        if (active) {
          const entry = data.find((t) => t.id === id);
          if (entry) {
            setTitle(entry);
          } else {
            setError('Title stub not found in archive.');
          }
        }
      } catch {
        if (active) {
          setError("Couldn't load title details. Is the backend running?");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadDetail();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!title || hasInitialized) {
      return;
    }

    const hasWatchedOn = title.watchedOn && title.watchedOn.trim() !== '';
    const isPreset = hasWatchedOn && platformOptions.includes(title.watchedOn);

    let watchedOnVal = '';
    let otherWatchedOnVal = '';

    if (hasWatchedOn) {
      watchedOnVal = isPreset ? title.watchedOn : 'Other';
      otherWatchedOnVal = isPreset ? '' : title.watchedOn;
    } else if (
      title.suggestedPlatform &&
      title.suggestedPlatform.trim() !== ''
    ) {
      const isSuggestedPreset = platformOptions.includes(
        title.suggestedPlatform,
      );
      watchedOnVal = isSuggestedPreset ? title.suggestedPlatform : 'Other';
      otherWatchedOnVal = isSuggestedPreset ? '' : title.suggestedPlatform;
    }

    setFormState({
      status: title.status ?? 'Watchlist',
      watchedOn: watchedOnVal,
      otherWatchedOn: otherWatchedOnVal,
      dateWatched: title.dateWatched ?? '',
      myRating: title.myRating ?? 0,
      rewatchCount: title.rewatchCount ?? 0,
      notes: title.notes ?? '',
    });
    setHasInitialized(true);
  }, [title, hasInitialized]);

  if (loading) {
    return (
      <div className="page-shell">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="detail-back-button"
          disabled
        >
          Back to Archive
        </button>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '65vh',
            padding: '24px',
          }}
        >
          <svg
            width="220"
            height="326"
            viewBox="0 0 300 445"
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Outer ticket stub shape */}
            <path
              d="M 0 0 H 300 V 212.5 A 10 10 0 0 0 300 232.5 V 445 H 0 V 232.5 A 10 10 0 0 0 0 212.5 Z"
              fill="var(--surface)"
              stroke="var(--outline-variant)"
              strokeWidth="1.5"
            />
            {/* Dashed inner border */}
            <path
              d="M 12 12 H 288 V 212.5 A 10 10 0 0 0 288 232.5 V 433 H 12 V 232.5 A 10 10 0 0 0 12 212.5 Z"
              fill="none"
              stroke="var(--outline-variant)"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            {/* Muted centered clapperboard icon */}
            <g
              transform="translate(120, 192.5) scale(2.5)"
              stroke="var(--outline-variant)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            >
              <path d="M20.2 6 17 11H3.8L7 6h13.2Z" />
              <path d="m4.5 11 10.5-8.75" />
              <path d="M9.5 11 20 2.25" />
              <path d="M2 11h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V11Z" />
              <path d="M12 11v12" />
            </g>
            {/* Marquee bulbs */}
            {bulbCoords.map((coord, index) => {
              const isLit =
                index === chaserIndex ||
                index === (chaserIndex - 1 + 40) % 40 ||
                index === (chaserIndex - 2 + 40) % 40;
              return (
                <circle
                  key={index}
                  cx={coord[0]}
                  cy={coord[1]}
                  r={isLit ? 4 : 2.5}
                  fill={isLit ? 'var(--primary)' : 'var(--outline-variant)'}
                  style={{
                    transition: 'fill 0.1s ease, r 0.1s ease',
                  }}
                />
              );
            })}
          </svg>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '32px',
              color: 'var(--primary)',
              letterSpacing: '3px',
              margin: '28px 0 4px 0',
              textTransform: 'uppercase',
            }}
          >
            Now Showing{ellipsis}
          </h2>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '15px',
              color: 'var(--text-muted)',
              margin: '0 0 28px 0',
            }}
          >
            Fetching your stub
          </p>
          {/* Skeleton bars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '180px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '10px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--outline-variant)',
              }}
            />
            <div
              style={{
                width: '60%',
                height: '10px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--outline-variant)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="page-shell">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="detail-back-button"
        >
          Back to Archive
        </button>
        <div className="state-view" style={{ minHeight: '35vh', padding: 0 }}>
          <div className="state-content error-box">
            <svg
              className="state-svg-icon error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="state-message">{error || 'Title not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const watchedOnValue = formState.watchedOn;
  const showOtherInput = watchedOnValue === 'Other';

  const updateField = (field, value) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);

      const payload = {
        status: formState.status,
        myRating: formState.myRating,
        notes: formState.notes,
        dateWatched: formState.dateWatched,
        rewatchCount: formState.rewatchCount,
        watchedOn:
          formState.watchedOn === 'Other'
            ? formState.otherWatchedOn
            : formState.watchedOn,
      };

      const updated = await updateTitle(id, payload);
      setTitle(updated);
      setToastMessage('Stub details updated successfully');
    } catch (err) {
      setSaveError(err.message || "Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      await deleteTitle(id);
      navigate('/');
    } catch (err) {
      setSaveError(err.message || 'Failed to delete title stub. Try again.');
      setShowConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="detail-back-button"
        disabled={saving}
      >
        Back to Archive
      </button>

      <section className="title-detail-top-section">
        <div>
          <img
            src={title.posterUrl}
            alt={title.title}
            className="title-detail-poster"
          />
        </div>

        <div className="title-detail-info">
          <div className="title-detail-name">{title.title}</div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <InfoPill>{title.year}</InfoPill>
            <InfoPill>{title.type}</InfoPill>
            <InfoPill>IMDb {title.imdbRating}</InfoPill>
            <InfoPill>{title.runtime}</InfoPill>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <SectionLabel>Genre</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {title.genre.map((genre) => (
                <span key={genre} className="detail-chip">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {title.releaseDate && title.releaseDate !== 'N/A' && (
              <div>
                <SectionLabel>Release Date</SectionLabel>
                <div
                  style={{
                    fontSize: '17px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span>{formatReleaseDate(title.releaseDate)}</span>
                  {isUpcoming(title.releaseDate) && (
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
                </div>
              </div>
            )}
            <div>
              <SectionLabel>Director</SectionLabel>
              <div style={{ fontSize: '17px' }}>{title.director}</div>
            </div>
            <div>
              <SectionLabel>Cast</SectionLabel>
              <div style={{ fontSize: '17px' }}>{title.cast.join(', ')}</div>
            </div>
            <div>
              <SectionLabel>Plot</SectionLabel>
              <div
                style={{
                  lineHeight: 1.7,
                  color: 'rgba(242, 242, 242, 0.8)',
                  fontSize: '17px',
                }}
              >
                {title.plot}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-edit-box">
        <span
          aria-hidden="true"
          className="detail-perforation-notch-center-top"
        />
        <span
          aria-hidden="true"
          className="detail-perforation-notch-center-bottom"
        />
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '34px',
            letterSpacing: '1.5px',
            marginBottom: '18px',
          }}
        >
          Your Notes
        </div>

        <div className="detail-edit-grid">
          <div className="detail-column detail-column-left detail-field-stack">
            <div className="detail-status-block">
              <div className="detail-section-label">Status</div>
              <div
                style={{
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  padding: '4px',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--outline-variant)',
                  gap: '4px',
                }}
              >
                {statusOptions.map((status) => {
                  const active = formState.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateField('status', status)}
                      disabled={saving}
                      style={{
                        border: '1px solid transparent',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        backgroundColor: active
                          ? 'var(--accent-color)'
                          : 'transparent',
                        color: active ? 'var(--bg-color)' : 'var(--text-color)',
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '20px',
                        letterSpacing: '1px',
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="detail-section-label">Platform / Watched On</div>
              <select
                value={watchedOnValue}
                onChange={(event) =>
                  updateField('watchedOn', event.target.value)
                }
                disabled={saving}
                className="theme-select"
                style={{ width: '100%' }}
              >
                <option value="">Select platform</option>
                {platformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {showOtherInput ? (
                <input
                  type="text"
                  value={formState.otherWatchedOn}
                  onChange={(event) =>
                    updateField('otherWatchedOn', event.target.value)
                  }
                  disabled={saving}
                  placeholder="Specify other platform"
                  className="theme-control"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    boxSizing: 'border-box',
                  }}
                />
              ) : null}
            </div>

            <div>
              <div className="detail-section-label">Date Watched</div>
              <input
                type="date"
                value={formState.dateWatched}
                onChange={(event) =>
                  updateField('dateWatched', event.target.value)
                }
                onClick={(event) => {
                  if (typeof event.target.showPicker === 'function') {
                    event.target.showPicker();
                  }
                }}
                disabled={saving}
                className="theme-control"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          <div className="detail-divider" />

          <div className="detail-column detail-column-right detail-field-stack">
            <div>
              <div className="detail-section-label">Personal</div>
              <div className="detail-note-card">
                <div style={{ marginBottom: '14px' }}>
                  <SectionLabel>My Rating</SectionLabel>
                  <StarPicker
                    rating={formState.myRating}
                    onChange={(value) => {
                      if (!saving) updateField('myRating', value);
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <SectionLabel>Rewatch Count</SectionLabel>
                  <div className="detail-rewatch-row">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        updateField(
                          'rewatchCount',
                          Math.max(0, Number(formState.rewatchCount) - 1),
                        )
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                        fontSize: '20px',
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={formState.rewatchCount}
                      onChange={(event) =>
                        updateField('rewatchCount', Number(event.target.value))
                      }
                      disabled={saving}
                      className="theme-control detail-rewatch-count"
                      style={{ boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        updateField(
                          'rewatchCount',
                          Number(formState.rewatchCount) + 1,
                        )
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                        fontSize: '20px',
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel>Notes</SectionLabel>
                  <textarea
                    value={formState.notes}
                    onChange={(event) =>
                      updateField('notes', event.target.value)
                    }
                    disabled={saving}
                    rows={5}
                    className="theme-control"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <div className="error-text" style={{ marginTop: '16px' }}>
                {saveError}
              </div>
            )}

            <div
              className="detail-action-row"
              style={{ display: 'flex', width: '100%', marginTop: '16px' }}
            >
              {showConfirmDelete ? (
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
                      color: 'var(--error)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    Are you sure you want to delete this title stub permanently?
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
                      onClick={() => setShowConfirmDelete(false)}
                      className="detail-secondary-button"
                      disabled={saving}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      No, Keep Stub
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="detail-delete-button"
                      disabled={saving}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      {saving ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="detail-delete-button"
                    disabled={saving}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="detail-primary-button"
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      opacity: saving ? 0.5 : 1,
                      marginLeft: 'auto',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
