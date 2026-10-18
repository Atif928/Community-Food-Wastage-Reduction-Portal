/**
 * App - the full route table.
 *
 * Public routes  : landing, login, register
 * Authenticated  : everything inside <ProtectedRoute> + <AppLayout>
 * Role guarded   : /donor/*, /recipient/*, /admin/*
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/common/ToastContainer';

/* ------------------------------- public ---------------------------------- */
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import NotFoundPage from './pages/public/NotFoundPage';

/* ------------------------------- shared ---------------------------------- */
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import DonorProfilePage from './pages/shared/DonorProfilePage';

/* -------------------------------- donor ---------------------------------- */
import DonorDashboard from './pages/donor/DonorDashboard';
import DonationCreate from './pages/donor/DonationCreate';
import DonationEdit from './pages/donor/DonationEdit';
import DonationDetail from './pages/donor/DonationDetail';
import MyDonations from './pages/donor/MyDonations';
import ReceivedClaims from './pages/donor/ReceivedClaims';
import DonorFeedback from './pages/donor/DonorFeedback';

/* ------------------------------ recipient -------------------------------- */
import RecipientDashboard from './pages/recipient/RecipientDashboard';
import ExploreDonations from './pages/recipient/ExploreDonations';
import MyClaims from './pages/recipient/MyClaims';
import ClaimDetail from './pages/recipient/ClaimDetail';
import FeedbackForm from './pages/recipient/FeedbackForm';
import PickupHistory from './pages/recipient/PickupHistory';

/* --------------------------------- admin --------------------------------- */
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminDonations from './pages/admin/AdminDonations';
import AdminCategories from './pages/admin/AdminCategories';
import AdminReports from './pages/admin/AdminReports';

export default function App() {
  return (
    <>
      <Routes>
        {/* ----------------------------- public ---------------------------- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* -------------------------- authenticated ------------------------ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/donors/:id" element={<DonorProfilePage />} />

            {/* ------------------------- donor --------------------------- */}
            <Route element={<ProtectedRoute roles={['DONOR']} />}>
              <Route path="/donor/dashboard" element={<DonorDashboard />} />
              <Route path="/donor/donations" element={<MyDonations />} />
              <Route path="/donor/donations/new" element={<DonationCreate />} />
              <Route path="/donor/donations/:id/edit" element={<DonationEdit />} />
              <Route path="/donor/donations/:id" element={<DonationDetail />} />
              <Route path="/donor/claims" element={<ReceivedClaims />} />
              <Route path="/donor/feedback" element={<DonorFeedback />} />
            </Route>

            {/* ----------------------- recipient ------------------------- */}
            <Route element={<ProtectedRoute roles={['RECIPIENT']} />}>
              <Route path="/recipient/dashboard" element={<RecipientDashboard />} />
              <Route path="/recipient/explore" element={<ExploreDonations />} />
              <Route path="/recipient/claims" element={<MyClaims />} />
              <Route path="/recipient/history" element={<PickupHistory />} />
              <Route path="/recipient/claims/:id" element={<ClaimDetail />} />
              <Route path="/recipient/claims/:id/feedback" element={<FeedbackForm />} />
            </Route>

            {/* ------------------------- admin --------------------------- */}
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/verifications" element={<AdminVerifications />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/users/:id" element={<AdminUserDetail />} />
              <Route path="/admin/donations" element={<AdminDonations />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/reports" element={<AdminReports />} />
            </Route>
          </Route>
        </Route>

        {/* Old/unknown links land on a helpful 404. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <ToastContainer />
    </>
  );
}
