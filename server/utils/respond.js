/**
 * Standard success envelope so every endpoint answers with the same shape:
 *   { success: true, data: ... }
 * Errors are produced by middleware/errorHandler.js as { success:false, error }.
 */

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

module.exports = { ok, created, noContent };
