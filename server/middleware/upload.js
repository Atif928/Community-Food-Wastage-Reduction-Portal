/**
 * Multer upload middleware.
 *
 * Security rules enforced here:
 *   - only image mime types for photos (jpeg/png/webp/gif)
 *   - pdf or images for verification documents
 *   - hard size limit (MAX_UPLOAD_MB, default 5 MB)
 *   - randomised filenames so a user can never overwrite another file and
 *     cannot smuggle a server-side script in via the original name
 *
 * Files land in server/uploads/<subfolder>. When STORAGE_DRIVER=firebase the
 * browser still uploads to this endpoint first, then the storage service
 * forwards the bytes to Firebase (see services/storageService.js).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ApiError } = require('./errorHandler');

const UPLOAD_ROOT = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;

const IMAGE_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const DOC_MIME = {
  ...IMAGE_MIME,
  'application/pdf': '.pdf',
};

/** Ensure a directory exists, creating parents as needed. */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ensureDir(UPLOAD_ROOT);

/**
 * Build a Multer instance writing into `subfolder` with the given mime map.
 * @param {string} subfolder e.g. 'donations'
 * @param {Record<string,string>} allowedMime mime -> extension
 * @param {number} maxFiles maximum number of files per request
 */
function createUploader(subfolder, allowedMime, maxFiles = 5) {
  const destination = ensureDir(path.join(UPLOAD_ROOT, subfolder));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      const ext = allowedMime[file.mimetype] || path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, unique);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_BYTES, files: maxFiles },
    fileFilter: (req, file, cb) => {
      if (!allowedMime[file.mimetype]) {
        return cb(new ApiError(400, `Unsupported file type "${file.mimetype}". Allowed: ${Object.keys(allowedMime).join(', ')}`));
      }
      // Guard against double extensions such as "photo.jpg.php".
      const ext = path.extname(file.originalname).toLowerCase();
      const expectedExts = Object.values(allowedMime);
      if (ext && !expectedExts.includes(ext)) {
        return cb(new ApiError(400, `File extension "${ext}" does not match the uploaded content type.`));
      }
      return cb(null, true);
    },
  });
}

/** Photo uploader for donation listings (also used for delivery proof). */
const imageUpload = createUploader('donations', IMAGE_MIME, 5);

/** Verification document uploader for NGO / shelter applicants. */
const documentUpload = createUploader('verifications', DOC_MIME, 3);

/** Avatar uploader. */
const avatarUpload = createUploader('avatars', IMAGE_MIME, 1);

/** Delivery proof photos. */
const deliveryUpload = createUploader('deliveries', IMAGE_MIME, 3);

/** Public URL for a stored file, relative to the API host. */
function publicUrl(subfolder, filename) {
  return `/uploads/${subfolder}/${filename}`;
}

module.exports = {
  UPLOAD_ROOT,
  MAX_BYTES,
  IMAGE_MIME,
  DOC_MIME,
  createUploader,
  imageUpload,
  documentUpload,
  avatarUpload,
  deliveryUpload,
  publicUrl,
  ensureDir,
};
