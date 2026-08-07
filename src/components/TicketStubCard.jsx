// TicketStubCard component: displays metadata of a title as a visual movie ticket stub, with selection mode support.
import { Link } from 'react-router-dom';

// Helper component to render stars for a rating out of 5
function StarRating({ rating }) {
  if (rating === 0) {
    return <span style={{ opacity: 0.45 }}>Not rated</span>;
  }

  return (
    <span style={{ color: 'var(--accent-color)' }}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function getStatusIcon(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="18" height="12" rx="1" />
        <path d="M3 9l2 -5h4l-2 5" />
        <path d="M9 9l2 -5h4l-2 5" />
        <path d="M15 9l2 -5h3l-1 5" />
        <path d="M3 9h18" />
      </svg>
    );
  }
  if (normalized === 'watching') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (normalized === 'watchlist') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 19l-5-3.5-5 3.5V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return null;
}

// Renders an individual title as a retro ticket stub card, linking to its details page or triggering selection toggles
export default function TicketStubCard({ title, onClick, selectionMode = false, selected = false }) {
  const CardContent = (
    <article
      className="ticket-card"
      style={{
        borderColor: selected ? 'var(--primary)' : undefined,
        backgroundColor: selected ? 'var(--surface-hover)' : undefined,
      }}
    >
      <div className="ticket-card-poster-wrap">
        {selectionMode && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 10,
              width: '18px',
              height: '18px',
              backgroundColor: selected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.5)',
              border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--text-muted)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {selected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--on-primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
        {title.status && (
          <span className="ticket-card-status">
            <span className="ticket-card-status-icon" aria-hidden="true">
              {getStatusIcon(title.status)}
            </span>
            <span className="ticket-card-status-text">{title.status}</span>
          </span>
        )}
        <div className="ticket-card-poster-inner">
          <img
            src={title.posterUrl}
            alt={title.title}
            className="ticket-card-poster"
          />
        </div>
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

        <div className="ticket-card-title">{title.title}</div>

        <div className="ticket-card-meta ticket-card-meta-main">
          <div className="ticket-card-meta-chips">
            <span className="ticket-card-chip">{title.year}</span>
            <span
              className="ticket-card-chip"
              style={{ textTransform: 'uppercase' }}
            >
              {title.type}
            </span>
          </div>
          {title.imdbRating && title.imdbRating !== 'N/A' && (
            <span className="ticket-card-imdb">
              <span className="rating-value">{title.imdbRating}</span>
              <span className="rating-label"> IMDB</span>
            </span>
          )}
        </div>

        {title.genre && title.genre.length > 0 && (
          <div
            className="ticket-card-genres"
            style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              marginBottom: '10px',
              marginTop: '8px',
            }}
          >
            {title.genre.slice(0, 2).map((g) => (
              <span
                key={g}
                className="ticket-card-chip"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {title.myRating !== undefined && title.myRating !== null && (
          <div className="ticket-card-rating">
            <StarRating rating={title.myRating} />
          </div>
        )}
      </div>
    </article>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ticket-card-link"
        style={{
          display: 'block',
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {CardContent}
      </button>
    );
  }

  return (
    <Link
      to={`/title/${title.id}`}
      aria-label={`Open details for ${title.title}`}
      className="ticket-card-link"
    >
      {CardContent}
    </Link>
  );
}
