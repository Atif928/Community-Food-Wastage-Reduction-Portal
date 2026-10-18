/**
 * categoryModel - admin managed food categories (Veg / Non-Veg).
 */
const { pool } = require('../config/db');

const COLUMNS = 'c.id, c.name, c.slug, c.type, c.is_active, c.created_at';

/**
 * List categories. When `includeInactive` is false only active rows come back
 * (that is what donors see in the listing form and what filters use).
 */
async function list({ includeInactive = false, type } = {}, conn = pool) {
  const where = [];
  const params = [];

  if (!includeInactive) where.push('c.is_active = 1');
  if (type) { where.push('c.type = ?'); params.push(type); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${COLUMNS},
            (SELECT COUNT(*) FROM donations d WHERE d.category_id = c.id) AS donation_count
       FROM food_categories c
       ${whereSql}
      ORDER BY c.type ASC, c.name ASC`,
    params,
  );
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COLUMNS} FROM food_categories c WHERE c.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findBySlug(slug, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COLUMNS} FROM food_categories c WHERE c.slug = ? LIMIT 1`, [slug]);
  return rows[0] || null;
}

async function create({ name, slug, type, isActive = 1 }, conn = pool) {
  const [result] = await conn.query(
    'INSERT INTO food_categories (name, slug, type, is_active) VALUES (?, ?, ?, ?)',
    [name, slug, type, isActive ? 1 : 0],
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const sets = [];
  const params = [];
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.slug !== undefined) { sets.push('slug = ?'); params.push(fields.slug); }
  if (fields.type !== undefined) { sets.push('type = ?'); params.push(fields.type); }
  if (fields.isActive !== undefined) { sets.push('is_active = ?'); params.push(fields.isActive ? 1 : 0); }
  if (sets.length === 0) return 0;

  params.push(id);
  const [result] = await conn.query(`UPDATE food_categories SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

/**
 * Delete a category only when nothing references it; otherwise deactivate it.
 * Returns { deleted: true } or { deactivated: true } so the controller can
 * report exactly what happened.
 */
async function remove(id, conn = pool) {
  const [usage] = await conn.query('SELECT COUNT(*) AS total FROM donations WHERE category_id = ?', [id]);
  if (Number(usage[0].total) > 0) {
    await update(id, { isActive: 0 }, conn);
    return { deleted: false, deactivated: true };
  }
  await conn.query('DELETE FROM food_categories WHERE id = ?', [id]);
  return { deleted: true, deactivated: false };
}

module.exports = { list, findById, findBySlug, create, update, remove };
