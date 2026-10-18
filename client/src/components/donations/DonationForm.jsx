/**
 * DonationForm - create / edit a food listing.
 *
 * Fields: item name, description, category (which carries the Veg/Non-Veg
 * attribute), quantity + unit, best-before, pickup address/city, an interactive
 * map picker and up to 5 photos.
 *
 * The parent owns the network call and passes `onSubmit(payload, files)`.
 * Photos are sent as raw File objects; the API layer wraps them in FormData.
 */
import { useEffect, useMemo, useState } from 'react';
import { Input, Select, Textarea } from '../common/Input';
import Button from '../common/Button';
import LocationPicker from '../map/LocationPicker';
import { UNITS } from '../../utils/constants';
import { fileUrl } from '../../utils/formatters';
import { validateDonation, validateImageFile, isValid } from '../../utils/validators';

const MAX_IMAGES = 5;

/** ISO string -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DonationForm({
  mode = 'create',
  categories = [],
  donation = null,
  onSubmit,
  submitting = false,
  onCancel = null,
}) {
  const isEdit = mode === 'edit';

  const existingImages = donation?.images || [];
  const pickup = donation?.pickup || null;

  const [values, setValues] = useState({
    title: '',
    description: '',
    categoryId: '',
    unit: 'kg',
    quantityKg: '',
    quantityServings: '',
    bestBefore: '',
    pickupAddress: '',
    pickupCity: '',
  });
  const [location, setLocation] = useState(null);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});

  // Hydrate the form when editing.
  useEffect(() => {
    if (!donation) return;
    setValues({
      title: donation.title || '',
      description: donation.description || '',
      categoryId: donation.category?.id ? String(donation.category.id) : '',
      unit: donation.quantity?.unit || 'kg',
      quantityKg: donation.quantity?.quantityKg ?? '',
      quantityServings: donation.quantity?.quantityServings ?? '',
      bestBefore: toDatetimeLocal(donation.bestBefore),
      pickupAddress: pickup?.address || '',
      pickupCity: pickup?.city || '',
    });
    if (pickup?.latitude !== null && pickup?.latitude !== undefined) {
      setLocation({ latitude: pickup.latitude, longitude: pickup.longitude });
    }
  }, [donation, pickup]);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Local preview URLs for the newly selected photos.
  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const selectedCategory = categories.find((category) => String(category.id) === String(values.categoryId));

  const handleImages = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = ''; // allow re-selecting the same file

    const messages = [];
    const accepted = [];
    for (const file of picked) {
      const problem = validateImageFile(file);
      if (problem) messages.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }

    const next = [...images, ...accepted].slice(0, MAX_IMAGES);
    setImages(next);
    setErrors((current) => ({
      ...current,
      images: messages.length ? messages.join(' ') : undefined,
    }));
  };

  const removeImage = (index) => setImages((current) => current.filter((_, i) => i !== index));

  const handleSubmit = (event) => {
    event.preventDefault();

    // Shape the object the shared validator understands.
    const validationTarget = {
      ...values,
      images,
      pickupLatitude: location?.latitude,
      pickupLongitude: location?.longitude,
    };
    const hasExisting = isEdit && existingImages.length > 0 && images.length === 0;
    const nextErrors = validateDonation(validationTarget, hasExisting);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      unit: values.unit,
      bestBefore: values.bestBefore,
      pickupAddress: values.pickupAddress.trim(),
      pickupCity: values.pickupCity.trim(),
      pickupLatitude: location.latitude,
      pickupLongitude: location.longitude,
    };
    if (values.unit === 'kg') payload.quantityKg = values.quantityKg;
    else payload.quantityServings = values.quantityServings;

    onSubmit?.(payload, images);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ------------------------------ details ------------------------------ */}
      <section className="card card-body space-y-4">
        <h2 className="text-base font-semibold text-slate-900">What are you donating?</h2>

        <Input
          label="Item name"
          name="title"
          required
          maxLength={150}
          placeholder="e.g. Fresh vegetable biryani"
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          error={errors.title}
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          maxLength={1000}
          placeholder="How was it prepared and stored? Any allergens to note?"
          value={values.description}
          onChange={(event) => setField('description', event.target.value)}
          help="Optional, but recipients appreciate the details."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Food category"
            name="categoryId"
            required
            placeholder="Choose a category"
            value={values.categoryId}
            onChange={(event) => setField('categoryId', event.target.value)}
            error={errors.categoryId}
            help={selectedCategory ? `This counts as ${selectedCategory.type === 'VEG' ? 'Veg' : 'Non-Veg'}.` : undefined}
          >
            <optgroup label="Veg">
              {categories.filter((category) => category.type === 'VEG')
                .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </optgroup>
            <optgroup label="Non-Veg">
              {categories.filter((category) => category.type === 'NON_VEG')
                .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </optgroup>
          </Select>

          <Input
            label="Best before"
            name="bestBefore"
            type="datetime-local"
            required
            value={values.bestBefore}
            onChange={(event) => setField('bestBefore', event.target.value)}
            error={errors.bestBefore}
            help="Expired listings are hidden automatically."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Unit"
            name="unit"
            required
            value={values.unit}
            onChange={(event) => setField('unit', event.target.value)}
            error={errors.unit}
          >
            {UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
          </Select>

          {values.unit === 'kg' ? (
            <Input
              label="Quantity (kg)"
              name="quantityKg"
              type="number"
              min="0.1"
              step="0.1"
              required
              value={values.quantityKg}
              onChange={(event) => setField('quantityKg', event.target.value)}
              error={errors.quantity}
            />
          ) : (
            <Input
              label="Quantity (servings)"
              name="quantityServings"
              type="number"
              min="1"
              step="1"
              required
              value={values.quantityServings}
              onChange={(event) => setField('quantityServings', event.target.value)}
              error={errors.quantity}
            />
          )}
        </div>
      </section>

      {/* ------------------------------ pickup ------------------------------- */}
      <section className="card card-body space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Where can it be collected?</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Pickup address"
            name="pickupAddress"
            maxLength={255}
            placeholder="Street, building, landmark"
            value={values.pickupAddress}
            onChange={(event) => setField('pickupAddress', event.target.value)}
          />
          <Input
            label="City"
            name="pickupCity"
            required
            value={values.pickupCity}
            onChange={(event) => setField('pickupCity', event.target.value)}
            error={errors.pickupCity}
          />
        </div>

        <div>
          <span className="label">Pickup point</span>
          <LocationPicker value={location} onChange={setLocation} />
          {errors.location && <p className="error-text">{errors.location}</p>}
        </div>
      </section>

      {/* ------------------------------ photos ------------------------------- */}
      <section className="card card-body space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Photos</h2>
          <p className="text-sm text-slate-500">
            Up to {MAX_IMAGES} images (JPEG, PNG, WEBP or GIF, max 5 MB each).
          </p>
        </div>

        {isEdit && existingImages.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Current photos</p>
            <div className="flex flex-wrap gap-2">
              {existingImages.map((image) => (
                <img
                  key={image.id ?? image.url}
                  src={fileUrl(image.url)}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Adding new photos below replaces the current gallery.</p>
          </div>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleImages}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
        />
        {errors.images && <p className="error-text">{errors.images}</p>}

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((url, index) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        <Button type="submit" loading={submitting} disabled={submitting}>
          {isEdit ? 'Save changes' : 'Publish listing'}
        </Button>
      </div>
    </form>
  );
}

export default DonationForm;
