/**
 * DonationFilters - the search / filter bar used by the recipient feed.
 *
 * Controlled component: the parent owns the filter state and passes an
 * `onChange(field, value)` handler. "Near me" is handled by the parent because
 * it needs the browser geolocation hook.
 */
import { Input, Select } from '../common/Input';
import Button from '../common/Button';
import { FOOD_TYPES, RADIUS_OPTIONS, SORT_OPTIONS } from '../../utils/constants';

export function DonationFilters({
  filters,
  onChange,
  categories = [],
  cities = [],
  nearMe = false,
  onToggleNearMe,
  geoStatus = 'idle',
  onUseLocation,
  onReset,
  disabled = false,
}) {
  const vegCategories = categories.filter((category) => category.type === 'VEG');
  const nonVegCategories = categories.filter((category) => category.type === 'NON_VEG');

  return (
    <section className="card card-body" aria-label="Filter donations">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Search"
          name="search"
          placeholder="Rice, bread, biryani…"
          value={filters.search || ''}
          onChange={(event) => onChange('search', event.target.value)}
          disabled={disabled}
        />

        <Select
          label="City"
          name="city"
          placeholder="All cities"
          value={filters.city || ''}
          onChange={(event) => onChange('city', event.target.value)}
          disabled={disabled}
        >
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </Select>

        <Select
          label="Food category"
          name="categoryId"
          placeholder="All categories"
          value={filters.categoryId || ''}
          onChange={(event) => onChange('categoryId', event.target.value)}
          disabled={disabled}
        >
          {vegCategories.length > 0 && (
            <optgroup label="Veg">
              {vegCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </optgroup>
          )}
          {nonVegCategories.length > 0 && (
            <optgroup label="Non-Veg">
              {nonVegCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </optgroup>
          )}
        </Select>

        <Select
          label="Food type"
          name="type"
          placeholder="Veg & Non-Veg"
          value={filters.type || ''}
          onChange={(event) => onChange('type', event.target.value)}
          disabled={disabled}
        >
          {FOOD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>

        <Select
          label="Sort by"
          name="sort"
          value={filters.sort || 'expiry'}
          onChange={(event) => onChange('sort', event.target.value)}
          disabled={disabled}
        >
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>

        <Select
          label="Within radius"
          name="radiusKm"
          value={filters.radiusKm || 25}
          onChange={(event) => onChange('radiusKm', Number(event.target.value))}
          disabled={disabled || !nearMe}
          help={!nearMe ? 'Enable "Near me" to filter by distance.' : undefined}
        >
          {RADIUS_OPTIONS.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
        </Select>

        <div className="flex items-end gap-2 md:col-span-2">
          <Button
            variant={nearMe ? 'primary' : 'secondary'}
            onClick={onToggleNearMe}
            disabled={disabled}
            aria-pressed={nearMe}
          >
            📍 {nearMe ? 'Near me: on' : 'Near me'}
          </Button>

          {nearMe && (
            <Button variant="secondary" onClick={onUseLocation} disabled={disabled}>
              {geoStatus === 'loading' ? 'Locating…' : 'Refresh location'}
            </Button>
          )}

          <Button variant="ghost" onClick={onReset} disabled={disabled}>
            Reset
          </Button>
        </div>
      </div>

      {nearMe && geoStatus === 'denied' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Location permission was denied. Allow access in your browser to sort by distance,
          or pick a city manually.
        </p>
      )}
      {nearMe && geoStatus === 'unsupported' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This browser does not support geolocation. Use the city filter instead.
        </p>
      )}
    </section>
  );
}

export default DonationFilters;
