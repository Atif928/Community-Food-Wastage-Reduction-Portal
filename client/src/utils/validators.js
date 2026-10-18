/**
 * Client side validation helpers used by the forms.
 *
 * These mirror the express-validator rules on the server; the server remains
 * the source of truth, this just gives instant feedback.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an object of { field: message }; empty means valid. */
export function validateLogin({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegister({ email, password, confirmPassword, fullName, role, orgType }, needsDocument) {
  const errors = {};

  if (!fullName || fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';

  if (!email) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must contain at least one letter and one number.';
  }

  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!role) errors.role = 'Choose whether you are donating or receiving food.';
  if (role === 'RECIPIENT' && !orgType) errors.orgType = 'Tell us what kind of organisation you are.';
  if (needsDocument) errors.document = 'Upload your registration certificate (PDF or image).';

  return errors;
}

/**
 * Validate the donation listing form.
 * @param {object} values
 * @param {boolean} hasExistingImage true when editing a listing that already has photos
 */
export function validateDonation(values, hasExistingImage = false) {
  const errors = {};

  if (!values.title || values.title.trim().length < 3) errors.title = 'Item name must be at least 3 characters.';
  if (!values.categoryId) errors.categoryId = 'Choose a food category.';
  if (!values.unit) errors.unit = 'Choose a unit.';

  const quantity = Number(values.unit === 'kg' ? values.quantityKg : values.quantityServings);
  if (!quantity || quantity <= 0) errors.quantity = 'Enter a quantity greater than zero.';
  if (values.unit === 'servings' && !Number.isInteger(quantity)) {
    errors.quantity = 'Servings must be a whole number.';
  }

  if (!values.bestBefore) {
    errors.bestBefore = 'Set a best-before date and time.';
  } else if (new Date(values.bestBefore).getTime() <= Date.now()) {
    errors.bestBefore = 'Best before must be in the future.';
  }

  if (!values.pickupCity) errors.pickupCity = 'Pickup city is required.';
  if (values.pickupLatitude === '' || values.pickupLongitude === '' ||
      values.pickupLatitude === undefined || values.pickupLongitude === undefined) {
    errors.location = 'Pick the pickup point on the map or use your current location.';
  }

  if (!hasExistingImage && (!values.images || values.images.length === 0)) {
    errors.images = 'Add at least one photo of the food.';
  }
  if (values.images && values.images.length > 5) {
    errors.images = 'You can attach at most 5 photos.';
  }

  return errors;
}

export function validateProfile(values) {
  const errors = {};
  if (values.fullName !== undefined && values.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.';
  }
  if (values.phone && !/^[+\d][\d\s-]{6,}$/.test(values.phone)) {
    errors.phone = 'Enter a valid phone number.';
  }
  return errors;
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Your current password is required.';
  if (!newPassword) errors.newPassword = 'A new password is required.';
  else if (newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.';
  else if (!/[A-Za-z]/.test(newPassword) || /\d/.test(newPassword) === false) {
    errors.newPassword = 'Include at least one letter and one number.';
  }
  if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function validateFeedback({ rating, comment }) {
  const errors = {};
  const score = Number(rating);
  if (!score || score < 1 || score > 5) errors.rating = 'Choose a rating from 1 to 5 stars.';
  if (comment && comment.length > 1000) errors.comment = 'Keep your comment under 1000 characters.';
  return errors;
}

/** File-input guard mirroring the Multer rules on the server. */
export function validateImageFile(file, { maxMb = 5 } = {}) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) return 'Only JPEG, PNG, WEBP or GIF images are allowed.';
  if (file.size > maxMb * 1024 * 1024) return `Image must be smaller than ${maxMb} MB.`;
  return null;
}

export function validateDocumentFile(file, { maxMb = 5 } = {}) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) return 'Upload a PDF, JPEG, PNG or WEBP document.';
  if (file.size > maxMb * 1024 * 1024) return `Document must be smaller than ${maxMb} MB.`;
  return null;
}

/** True when the errors object has no keys. */
export const isValid = (errors) => Object.keys(errors).length === 0;
