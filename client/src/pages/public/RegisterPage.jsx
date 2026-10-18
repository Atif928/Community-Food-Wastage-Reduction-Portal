/**
 * RegisterPage - multi-role signup.
 *
 * Collects full name, email, password, role (Donor/Recipient), organisation
 * type and (for NGO/SHELTER recipients) a document (PDF or image) to upload.
 * After successful registration the user is logged in and sent to the dashboard.
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input, Select, Textarea } from '../../components/common/Input';
import Button from '../../components/common/Button';
import { DONOR_ORG_TYPES, RECIPIENT_ORG_TYPES } from '../../utils/constants';
import { validateDocumentFile, validateRegister, isValid } from '../../utils/validators';

const ROLE_OPTIONS = [
  { value: 'DONOR', label: 'Donor (Restaurant/Hotel/Individual) - post surplus food' },
  { value: 'RECIPIENT', label: 'Recipient (NGO/Shelter/Volunteer) - claim and collect food' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, dashboardRoute } = useAuth();
  const { success, error: showError } = useToast();

  const [values, setValues] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', role: '', orgType: '', phone: '', city: '',
  });
  const [document, setDocument] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={dashboardRoute} replace />;

  const isRecipient = values.role === 'RECIPIENT';
  const needsDocument = isRecipient && (values.orgType === 'NGO' || values.orgType === 'SHELTER');
  const orgOptions = isRecipient ? RECIPIENT_ORG_TYPES : DONOR_ORG_TYPES;

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleDocument = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) { setDocument(null); return; }
    const problem = validateDocumentFile(file);
    if (problem) { showError(problem); setErrors((current) => ({ ...current, document: problem })); return; }
    setDocument(file);
    setErrors((current) => ({ ...current, document: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateRegister(values, needsDocument && !document);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: values.role,
      orgType: values.orgType || undefined,
      phone: values.phone.trim() || undefined,
      city: values.city.trim() || undefined,
    };

    setLoading(true);
    try {
      await register(payload, document);
      success('Welcome to FoodPortal!');
      navigate(dashboardRoute, { replace: true });
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl" aria-hidden="true">🍲</span>
            <h1 className="text-2xl font-bold text-slate-900">Food<span className="text-brand-600">Portal</span></h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">Create an account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="card card-body space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              name="fullName"
              required
              value={values.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
              error={errors.fullName}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              error={errors.email}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={values.password}
              onChange={(event) => setField('password', event.target.value)}
              error={errors.password}
            />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={values.confirmPassword}
              onChange={(event) => setField('confirmPassword', event.target.value)}
              error={errors.confirmPassword}
            />
          </div>

          <Select
            label="I am a"
            name="role"
            required
            placeholder="Choose role"
            value={values.role}
            onChange={(event) => { setField('role', event.target.value); if (event.target.value !== 'RECIPIENT') setField('orgType', ''); setDocument(null); }}
            error={errors.role}
          >
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>

          {values.role && (
            <Select
              label={isRecipient ? 'Recipient type' : 'Organisation type'}
              name="orgType"
              required={isRecipient}
              placeholder="Select"
              value={values.orgType}
              onChange={(event) => setField('orgType', event.target.value)}
              error={errors.orgType}
            >
              {orgOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          )}

          {needsDocument && (
            <div>
              <span className="label">Verification document (PDF or image, max 5 MB)</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleDocument}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {errors.document && <p className="error-text">{errors.document}</p>}
              <p className="helper-text">Upload your NGO/shelter registration certificate.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone (optional)"
              name="phone"
              value={values.phone}
              onChange={(event) => setField('phone', event.target.value)}
              error={errors.phone}
            />
            <Input
              label="City (optional)"
              name="city"
              value={values.city}
              onChange={(event) => setField('city', event.target.value)}
            />
          </div>

          <Button type="submit" fullWidth loading={loading} disabled={loading}>Create account</Button>

          <p className="text-center text-sm text-slate-600">
            Already have an account? <Link to="/login" className="link">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
