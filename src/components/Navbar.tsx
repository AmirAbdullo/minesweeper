import { Link, NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Game', end: true },
  { to: '/stats', label: 'Stats', end: false },
  { to: '/help', label: 'Help', end: false },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/about', label: 'About', end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'menu-active' : '');

/** DaisyUI's mobile dropdown stays open while it has focus, so drop focus after picking a page. */
function closeDropdown() {
  (document.activeElement as HTMLElement | null)?.blur();
}

export function Navbar() {
  return (
    <header className="navbar sticky top-0 z-30 bg-base-100 px-2 shadow-sm sm:px-4">
      <div className="navbar-start">
        <div className="dropdown sm:hidden">
          <div tabIndex={0} role="button" className="btn btn-square btn-ghost" aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu dropdown-content z-40 mt-3 w-48 rounded-box bg-base-100 p-2 shadow-lg">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={linkClass} onClick={closeDropdown}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost gap-2 px-2 text-xl">
          <span aria-hidden="true">💣</span>
          Minesweeper
        </Link>
      </div>
      <nav className="navbar-end hidden sm:flex" aria-label="Main">
        <ul className="menu menu-horizontal gap-1 px-1">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
