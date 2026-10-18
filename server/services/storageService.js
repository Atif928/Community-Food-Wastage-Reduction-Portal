/**
 * storageService - abstraction over where uploaded files live.
 *
 * STORAGE_DRIVER=local    (default) -> files stay on disk under server/uploads
 * STORAGE_DRIVER=firebase           -> the local temp copy is streamed to a
 *                                      Firebase Storage bucket and deleted
 *
 * Multer always writes the file to disk first (that keeps the controller code
 * identical for both drivers). `persist()` then either returns the local public
 * path or uploads to Firebase and returns the download URL.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ApiError } = require('../middleware/errorHandler');

const DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const UPLOAD_ROOT = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

/** Lazily created firebase-admin app (only required when the driver is firebase). */
let firebaseBucket = null;

function getFirebaseBucket() {
  if (firebaseBucket) return firebaseBucket;

  let admin;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    admin = require('firebase-admin');
  } catch (err) {
    throw new ApiError(
      500,
      'STORAGE_DRIVER=firebase requires the "firebase-admin" package. Run: npm install firebase-admin',
    );
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_STORAGE_BUCKET) {
    throw new ApiError(500, 'Firebase Storage is selected but the FIREBASE_* environment variables are incomplete.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // .env stores the key with literal \n escapes.
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });
  }

  firebaseBucket = admin.storage().bucket();
  return firebaseBucket;
}

/** Which driver is active ('local' | 'firebase'). */
function getDriver() {
  return DRIVER;
}

/**
 * Turn a multer file into a durable URL.
 * @param {Express.Multer.File} file
 * @param {string} subfolder e.g. 'donations'
 * @returns {Promise<string>} '/uploads/donations/123-abc.jpg' or an https URL
 */
async function persist(file, subfolder) {
  if (!file) return null;

  if (DRIVER === 'local') {
    // Multer already wrote it; expose it through the static /uploads mount.
    return `/uploads/${subfolder}/${file.filename}`;
  }

  const bucket = getFirebaseBucket();
  const destination = `${subfolder}/${file.filename}`;

  await bucket.upload(file.path, {
    destination,
    metadata: { contentType: file.mimetype, cacheControl: 'public,max-age=31536000' },
  });

  // Make the object publicly readable and build the download URL.
  await bucket.file(destination).makePublic().catch(() => { /* uniform bucket-level access */ });
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

  // Remove the local temp copy now that Firebase holds the bytes.
  fs.promises.unlink(file.path).catch(() => {});

  return publicUrl;
}

/** Persist many files (used for donation galleries). */
async function persistMany(files = [], subfolder) {
  const urls = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const url = await persist(file, subfolder);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * Best-effort delete of a stored file. Only local paths under UPLOAD_ROOT are
 * touched; anything else (Firebase https URLs) is ignored so we never delete
 * arbitrary files via a crafted database value.
 */
async function remove(storedUrl) {
  if (!storedUrl) return false;

  if (DRIVER === 'firebase' && /^https?:\/\//i.test(storedUrl)) {
    try {
      const bucket = getFirebaseBucket();
      const prefix = `https://storage.googleapis.com/${bucket.name}/`;
      const key = storedUrl.startsWith(prefix) ? storedUrl.slice(prefix.length) : null;
      if (key) await bucket.file(key).delete({ ignoreNotFound: true });
      return true;
    } catch {
      return false;
    }
  }

  if (storedUrl.startsWith('/uploads/')) {
    const absolute = path.resolve(UPLOAD_ROOT, storedUrl.replace(/^\/uploads\//, ''));
    // Path traversal guard: the resolved path must stay inside UPLOAD_ROOT.
    if (!absolute.startsWith(UPLOAD_ROOT)) return false;
    try {
      await fs.promises.unlink(absolute);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

module.exports = { getDriver, persist, persistMany, remove };
