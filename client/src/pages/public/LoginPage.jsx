/**
 * LoginPage - sign in to your account.
 *
 * Validates the form client-side, calls `authApi.login`, stores the token via
 * the axios interceptor and redirects to the role-specific dashboard. Falls
 * back to `/` if nothing else.
 */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import { validateLogin, isValid } from '../../utils/validators';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, dashboardRoute } = useAuth();
  const { error: showError } = useToast();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || dashboardRoute || '/';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleChange = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(from, { replace: true });
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">🍲</span>
            <h1 className="text-2xl font-bold text-slate-900">Food<span className="text-brand-600">Portal</span></h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">Log in to rescue surplus food.</p>
        </div>

        <form onSubmit={handleSubmit} className="card card-body space-y-4" noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(event) => handleChange('email', event.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={values.password}
            onChange={(event) => handleChange('password', event.target.value)}
            error={errors.password}
          />

          <Button type="submit" fullWidth loading={loading} disabled={loading}>Log in</Button>

          <p className="text-center text-sm text-slate-600">
            Don't have an account? <Link to="/register" className="link">Sign up</Link>
          </p>
        </form>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Demo credentials</p>
          <p className="mt-1">Admin: admin@portal.com · password</p>
          <p>Donor: spiceroute@demo.com · password</p>
          <p>Recipient: helpinghands@demo.com · password</p>
          <p className="mt-2">NGO account awaiting approval: greenbites@demo.com · password</p>
        </div>
      </div>
    </div>
  );
}
