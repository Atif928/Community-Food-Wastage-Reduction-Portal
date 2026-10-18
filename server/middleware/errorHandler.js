/**
 * Consistent error handling.
 *
 * Every failure leaves the API as:
 *   { success: false, error: "Human readable message", details?: [...] }
 * which the Axios client can render directly.
 */

/** Error type carrying an HTTP status code. */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, details) { return new ApiError(400, message, details); }
  static unauthorized(message = 'Authentication required.') { return new ApiError(401, message); }
  static forbidden(message = 'You do not have permission to do that.') { return new ApiError(403, message); }
  static notFound(message = 'Resource not found.') { return new ApiError(404, message); }
  static conflict(message, details) { return new ApiError(409, message, details); }
}

/** 404 handler for unmatched routes - registered after all routers. */
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} does not exist.`));
}

/** Terminal error middleware. Must keep the 4-argument signature. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer file-size / type errors -> 400 with a friendly message.
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large.'
      : `Upload error: ${err.message}`;
    return res.status(400).json({ success: false, error: message });
  }

  // MySQL-compatible duplicate key code (23505 is normalised in config/db.js),
  // used by the claim race condition.
  if (err && (err.code === 'ER_DUP_ENTRY' || err.code === '23505')) {
    return res.status(409).json({ success: false, error: 'That record already exists.' });
  }

  if (err instanceof ApiError) {
    const body = { success: false, error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Unknown / programmer errors: log the stack, hide details from the client.
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const body = { success: false, error: 'Something went wrong on the server.' };
  if (process.env.NODE_ENV !== 'production' && err?.message) body.debug = err.message;
  return res.status(500).json(body);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
