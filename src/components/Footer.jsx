export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="footer-logo-wrap">
            <img
              src="/favicon.svg"
              alt="MyStubs Logo"
              className="footer-logo-img"
            />
            <span className="footer-logo-text">MyStubs</span>
          </div>
          <div className="footer-tagline">One ticket at a time.</div>
        </div>
        <div className="footer-center">
          &copy; {currentYear} &middot; Personal Archive
        </div>
        <div className="footer-right">
          Movie &amp; TV data via{' '}
          <a
            href="https://www.omdbapi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            OMDb API
          </a>{' '}
          and{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            TMDB
          </a>
        </div>
      </div>
    </footer>
  );
}
