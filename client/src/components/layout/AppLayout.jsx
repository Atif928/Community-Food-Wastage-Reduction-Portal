/**
 * AppLayout - shell for every authenticated page.
 *
 * Renders the navbar + sidebar + <Outlet />. It also blocks NGOs/shelters whose
 * account is still PENDING_VERIFICATION with a friendly status screen (an admin
 * must approve them before they can claim food).
 */
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Button from '../common/Button';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isPendingAccount, user, verification, refreshVerification, isRecipient } = useAuth();

  // Pending NGOs/shelters see a dedicated waiting screen instead of the app.
  if (isPendingAccount && isRecipient) {
    return <PendingVerificationScreen
      user={user}
      verification={verification}
      onRefresh={refreshVerification}
    />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="text-center text-xs text-slate-500">
          Community Food Wastage Reduction Portal · Reducing spoilage by connecting donors with recipients
        </p>
      </footer>
    </div>
  );
}

/** Shown to NGOs/shelters while their documents await admin review. */
function PendingVerificationScreen({ user, verification, onRefresh }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="card card-body text-center">
          <span className="text-5xl" aria-hidden="true">🛡️</span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Verification in progress</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks for signing up, {user?.fullName}. Our administrators are reviewing your
            organisation&apos;s documents. You will be able to claim surplus food as soon as you are approved.
          </p>

          {verification && (
            <dl className="mt-6 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-left text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-0.5 font-semibold text-amber-700">{verification.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document type</dt>
                <dd className="mt-0.5 text-slate-800">{verification.documentType?.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="mt-0.5 text-slate-800">{new Date(verification.submittedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organisation</dt>
                <dd className="mt-0.5 text-slate-800">{verification.applicant?.orgType || user?.orgType}</dd>
              </div>
            </dl>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => onRefresh()}>Check status again</Button>
            <Link to="/profile" className="btn-secondary">Update my profile</Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Need help? Email <a className="link" href="mailto:support@foodportal.local">support@foodportal.local</a>
        </p>
      </div>
    </div>
  );
}

export default AppLayout;
