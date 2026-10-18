/**
 * Sidebar - role specific navigation (desktop persistent, mobile drawer).
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DONOR_LINKS = [
  { to: '/donor/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/donor/donations/new', label: 'Add listing', icon: '➕' },
  { to: '/donor/donations', label: 'My listings', icon: '📦' },
  { to: '/donor/claims', label: 'Received claims', icon: '🙋' },
  { to: '/donor/feedback', label: 'Reviews', icon: '⭐' },
];

const RECIPIENT_LINKS = [
  { to: '/recipient/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/recipient/explore', label: 'Find food', icon: '🔎' },
  { to: '/recipient/claims', label: 'My pickups', icon: '🚚' },
  { to: '/recipient/history', label: 'Pickup history', icon: '🗂️' },
];

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Overview', icon: '📊' },
  { to: '/admin/verifications', label: 'Verifications', icon: '🛡️' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/donations', label: 'Listings', icon: '📦' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/reports', label: 'Reports', icon: '📈' },
];

const SHARED_LINKS = [
  { to: '/profile', label: 'Profile', icon: '👤' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
];

export function Sidebar({ open, onClose }) {
  const { isDonor, isRecipient, isAdmin } = useAuth();

  const links = isDonor ? DONOR_LINKS : isRecipient ? RECIPIENT_LINKS : ADMIN_LINKS;

  const content = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Dashboard">
      <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Menu
      </p>

      {links.map((link) => (
        <SidebarLink key={link.to} {...link} onNavigate={onClose} />
      ))}

      <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Account
      </p>
      {SHARED_LINKS.map((link) => (
        <SidebarLink key={link.to} {...link} onNavigate={onClose} />
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-16">{content}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
          />
          <div className="relative h-full w-64 animate-slide-in bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-semibold text-slate-800">Menu</span>
              <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)] overflow-y-auto">{content}</div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarLink({ to, label, icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  );
}

export default Sidebar;
