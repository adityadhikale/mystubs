import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

// Film strip scrolling background helper components
function FilmStrip({ top, bottom, transform }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: top,
        bottom: bottom,
        left: 0,
        width: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.32,
        transform: transform,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 'max-content',
          animation: 'scroll-strip 35s linear infinite',
        }}
      >
        <SprocketTrack />
        <SprocketTrack />
      </div>
    </div>
  );
}

function SprocketTrack() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '12px 20px',
        borderTop: '3px dashed var(--outline-variant)',
        borderBottom: '3px dashed var(--outline-variant)',
        backgroundColor: 'transparent',
      }}
    >
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '28px',
            height: '18px',
            border: '3px solid var(--outline-variant)',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const response = await login(password);
      if (response && response.token) {
        localStorage.setItem('mystubs_token', response.token);
        navigate('/', { replace: true });
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid passcode or network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Film Strips */}
      <FilmStrip top="12%" />
      <FilmStrip top="50%" transform="translateY(-50%)" />
      <FilmStrip bottom="12%" />

      {/* Login Card */}
      <div
        className="ticket-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '48px 40px 40px 40px',
          position: 'relative',
          cursor: 'default',
          border: '1px solid var(--outline-variant)',
          backgroundColor: 'var(--card-bg-color)',
          zIndex: 1,
        }}
      >
        {/* Ticket notched circles on left/right edges */}
        <span
          aria-hidden="true"
          className="perforation-notch-left perforation-notch-top"
          style={{ top: '143px', left: '-10px' }}
        />
        <span
          aria-hidden="true"
          className="perforation-notch-right perforation-notch-top"
          style={{ top: '143px', right: '-10px' }}
        />

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '56px',
              color: 'var(--primary)',
              margin: '0 0 4px 0',
              letterSpacing: '3px',
              lineHeight: '1',
            }}
          >
            MYSTUBS
          </h1>
          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '12px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: '600',
            }}
          >
            Cinematic Archive Entry
          </div>
        </div>

        {/* Perforation Line */}
        <div
          style={{
            borderTop: '1px dashed var(--outline-variant)',
            margin: '24px 0',
          }}
        />

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '18px',
                letterSpacing: '1px',
                marginBottom: '10px',
                color: 'var(--text)',
                textTransform: 'uppercase',
              }}
            >
              Enter Passcode
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="theme-control"
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                letterSpacing: '3px',
                width: '100%',
                padding: '14px 16px',
                boxSizing: 'border-box',
                borderBottom: '2px solid var(--outline-variant)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Error Message Box */}
          {error && (
            <div
              style={{
                color: 'var(--error)',
                backgroundColor: 'var(--error-container)',
                padding: '12px 16px',
                fontSize: '13px',
                marginBottom: '20px',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: '500',
                borderLeft: '4px solid var(--error)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="detail-primary-button"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '22px',
              letterSpacing: '1px',
              padding: '14px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--on-primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Unlocking...
              </span>
            ) : (
              'Unlock Archive'
            )}
          </button>
        </form>

        {/* Perforation bottom notch line */}
        <div
          style={{
            borderTop: '1px dashed var(--outline-variant)',
            margin: '32px 0 16px 0',
          }}
        />

        <div
          style={{
            textAlign: 'center',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: '11px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          Restricted access • Private Catalog
        </div>

        {/* Inline style for spinner and background scroll animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes scroll-strip {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}} />
      </div>
    </div>
  );
}
