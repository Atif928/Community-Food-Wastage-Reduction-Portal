/**
 * Validation glue with upload cleanup.
 *
 * For multipart/form-data routes the file upload middleware has to run BEFORE
 * validation (multer is what parses the body). If validation then fails we must
 * delete the files that were already written to disk, otherwise every rejected
 * form leaves orphans in server/uploads.
 */
const fs = require('fs');
const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/** Delete any files multer wrote for this request (best effort). */
async function cleanupUploads(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const group of Object.values(req.files)) files.push(...group);
  }

  await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
}

async function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));

  await cleanupUploads(req);
  return next(new ApiError(422, 'Validation failed. Please check the highlighted fields.', details));
}

module.exports = { validate, cleanupUploads };
