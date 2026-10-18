/**
 * ProfilePage - edit your details, home coordinates and password.
 *
 * The coordinates matter: they drive the "nearby" distance sorting for
 * recipients and the radius-based notification fan-out for donors.
 */
import { useCallback, useEffect, useState } from 'react';
import { authApi, userApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/common/States';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { Badge } from '../../components/common/StatusBadge';
import LocationPicker from '../../components/map/LocationPicker';
import { DONOR_ORG_TYPES, RECIPIENT_ORG_TYPES } from '../../utils/constants';
import { orgTypeLabel, formatDate } from '../../utils/formatters';
import {
  validateProfile, validatePasswordChange, validateImageFile, isValid,
} from '../../utils/validators';

export default function ProfilePage() {
  const { user, isRecipient, verification, refreshUser } = useAuth();
  const { success, error: showError } = useToast();

  const [values, setValues] = useState({
    fullName: '', phone: '', city: '', address: '', orgType: '',
  });
  const [location, setLocation] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  // Hydrate from the cached user.
  useEffect(() => {
    if (!user) return;
    setValues({
      fullName: user.fullName || '',
      phone: user.phone || '',
      city: user.city || '',
      address: user.address || '',
      orgType: user.orgType || '',
    });
    if (user.latitude !== null && user.latitude !== undefined) {
      setLocation({ latitude: user.latitude, longitude: user.longitude });
    }
  }, [user]);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleAvatar = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) { showError(problem); return; }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setSaving(true);
    try {
      const payload = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        city: values.city.trim(),
        address: values.address.trim(),
        orgType: values.orgType || undefined,
      };
      if (location?.latitude !== undefined && location?.latitude !== null) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
      }
      await userApi.updateProfile(payload, avatar);
      await refreshUser();
      setAvatar(null);
      setAvatarPreview(null);
      success('Profile updated.');
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordChange(password);
    setPasswordErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Password changed.');
    } catch (err) {
      showError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const orgTypes = isRecipient ? RECIPIENT_ORG_TYPES : DONOR_ORG_TYPES;

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="Keep your details and location up to date." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ------------------------------ summary ------------------------------ */}
        <Card title="Account">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={user?.fullName} src={user?.avatarUrl} size="xl" />
            <div>
              <p className="font-semibold text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge tone="brand">{orgTypeLabel(user?.orgType) || user?.role}</Badge>
              <Badge tone={user?.accountStatus === 'ACTIVE' ? 'blue' : user?.accountStatus === 'SUSPENDED' ? 'red' : 'amber'}>
                {user?.accountStatus?.replaceAll('_', ' ')}
              </Badge>
            </div>
            {user?.createdAt && (
              <p className="text-xs text-slate-400">Member since {formatDate(user.createdAt)}</p>
            )}
          </div>

          {isRecipient && verification && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-left text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</p>
              <p className="mt-0.5 font-semibold text-amber-700">{verification.status}</p>
              {verification.reviewNote && <p className="text-xs text-slate-500">{verification.reviewNote}</p>}
            </div>
          )}
        </Card>

        {/* ------------------------------- details ----------------------------- */}
        <Card title="Details" className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <div className="flex items-center gap-4">
              <Avatar name={user?.fullName} src={avatarPreview || user?.avatarUrl} size="lg" />
              <div>
                <label className="btn-secondary btn-sm cursor-pointer">
                  Change photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatar}
                  />
                </label>
                <p className="helper-text">JPEG, PNG, WEBP or GIF up to 5 MB.</p>
              </div>
            </div>

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
                label="Phone"
                name="phone"
                value={values.phone}
                onChange={(event) => setField('phone', event.target.value)}
                error={errors.phone}
                placeholder="+91 98765 43210"
              />
              <Input
                label="City"
                name="city"
                value={values.city}
                onChange={(event) => setField('city', event.target.value)}
              />
              <div>
                <label className="label" htmlFor="orgType">Organisation type</label>
                <select
                  id="orgType"
                  className="input"
                  value={values.orgType}
                  onChange={(event) => setField('orgType', event.target.value)}
                >
                  <option value="">Not specified</option>
                  {orgTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <Input
                label="Address"
                name="address"
                className="sm:col-span-2"
                value={values.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            </div>

            <div>
              <span className="label">Home location</span>
              <LocationPicker value={location} onChange={setLocation} height="h-64" />
              <p className="helper-text">
                Used to match nearby donations and alert you to food posted close by.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saving} disabled={saving}>Save changes</Button>
            </div>
          </form>
        </Card>
      </div>

      {/* ------------------------------- password ------------------------------ */}
      <Card title="Change password" className="max-w-2xl">
        <form onSubmit={handlePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-3" noValidate>
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={password.currentPassword}
            onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))}
            error={passwordErrors.currentPassword}
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={password.newPassword}
            onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
            error={passwordErrors.newPassword}
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={password.confirmPassword}
            onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))}
            error={passwordErrors.confirmPassword}
          />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" variant="secondary" loading={changingPassword} disabled={changingPassword}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
