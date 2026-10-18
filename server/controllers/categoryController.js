/**
 * categoryController - food category listing + admin CRUD.
 */
const categoryModel = require('../models/categoryModel');
const donationModel = require('../models/donationModel');
const { categoryView } = require('../utils/serializers');
const { slugify } = require('../utils/helpers');
const { ok, created } = require('../utils/respond');
const { ApiError } = require('../middleware/errorHandler');

/** GET /api/categories */
async function list(req, res) {
  // Only admins may request inactive categories.
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';

  const categories = await categoryModel.list({
    includeInactive,
    type: req.query.type ? String(req.query.type).toUpperCase() : undefined,
  });

  return ok(res, {
    categories: categories.map(categoryView),
    cities: await donationModel.listCities(),
  });
}

/** POST /api/categories (admin) */
async function create(req, res) {
  const name = req.body.name.trim();
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);

  if (await categoryModel.findBySlug(slug)) {
    throw ApiError.conflict('A category with that name already exists.');
  }

  const id = await categoryModel.create({
    name,
    slug,
    type: String(req.body.type).toUpperCase(),
    isActive: req.body.isActive === undefined ? 1 : req.body.isActive,
  });

  return created(res, { category: categoryView(await categoryModel.findById(id)) });
}

/** PUT /api/categories/:id (admin) */
async function update(req, res) {
  const id = Number(req.params.id);
  const existing = await categoryModel.findById(id);
  if (!existing) throw ApiError.notFound('Category not found.');

  const fields = {};
  if (req.body.name !== undefined) {
    fields.name = req.body.name.trim();
    fields.slug = slugify(fields.name);
  }
  if (req.body.slug !== undefined) fields.slug = slugify(req.body.slug);
  if (req.body.type !== undefined) fields.type = String(req.body.type).toUpperCase();
  if (req.body.isActive !== undefined) fields.isActive = req.body.isActive;

  // Guard the slug uniqueness when renaming.
  if (fields.slug && fields.slug !== existing.slug) {
    const clash = await categoryModel.findBySlug(fields.slug);
    if (clash && clash.id !== id) throw ApiError.conflict('Another category already uses that name.');
  }

  await categoryModel.update(id, fields);
  return ok(res, { category: categoryView(await categoryModel.findById(id)) });
}

/** DELETE /api/categories/:id (admin) - deactivates when still in use. */
async function remove(req, res) {
  const id = Number(req.params.id);
  const existing = await categoryModel.findById(id);
  if (!existing) throw ApiError.notFound('Category not found.');

  const result = await categoryModel.remove(id);
  return ok(res, {
    ...result,
    message: result.deleted
      ? 'Category deleted.'
      : 'Category is used by existing listings, so it was deactivated instead.',
  });
}

module.exports = { list, create, update, remove };
