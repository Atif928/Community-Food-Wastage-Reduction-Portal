/**
 * Navbar - top bar with the logo, role navigation, bell and user menu.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ORG_TYPE_LABELS, ROLE_LABELS } from '../../utils/constants';
import { orgTypeLabel } from '../../utils/formatters';
import Avatar from '../common/Avatar';
import NotificationBell from '../notifications/NotificationBell';

export function Navbar({ onToggleSidebar }) {
  const { user, logout, isDonor, isRecipient, isAdmin, dashboardRoute } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const primaryNav = isDonor
    ? [
      { to: '/donor/dashboard', label: 'Dashboard' },
      { to: '/donor/donations/new', label: 'New listing' },
      { to: '/donor/donations', label: 'My listings' },
      { to: '/donor/claims', label: 'Claims' },
    ]
    : isRecipient
      ? [
        { to: '/recipient/dashboard', label: 'Dashboard' },
        { to: '/recipient/explore', label: 'Find food' },
        { to: '/recipient/claims', label: 'My pickups' },
      ]
      : [
        { to: '/admin/dashboard', label: 'Overview' },
        { to: '/admin/verifications', label: 'Verifications' },
        { to: '/admin/users', label: 'Users' },
        { to: '/admin/reports', label: 'Reports' },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>

        <Link to={dashboardRoute} className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🍲</span>
          <span className="hidden text-lg font-bold text-slate-900 sm:block">
            Food<span className="text-brand-600">Portal</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <Avatar name={user?.fullName} src={user?.avatarUrl} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[10rem] truncate text-sm font-semibold text-slate-800">
                  {user?.fullName}
                </span>
                <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                  {user?.orgType ? orgTypeLabel(user.orgType) : ROLE_LABELS[user?.role]}
                </span>
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>

                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  My profile
                </Link>
                <Link to="/notifications" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Notifications
                </Link>
                {isAdmin && (
                  <Link to="/admin/categories" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    Manage categories
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
