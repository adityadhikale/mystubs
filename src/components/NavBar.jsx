import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Archive', end: true },
  { to: '/add', label: 'Add' },
  { to: '/import', label: 'Import' },
  { to: '/profile', label: 'Profile' },
];

const navLinkClassName = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link';

export default function NavBar() {
  return (
    <header className="nav-bar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo-wrap">
          <img src="/favicon.svg" alt="MyStubs Logo" className="nav-logo-img" />
          <span className="nav-logo-text">MyStubs</span>
        </Link>
        <nav className="nav-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navLinkClassName}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}