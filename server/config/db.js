/**
 * PostgreSQL connection pool (Neon in production, any Postgres locally).
 *
 * The data layer was originally written against MySQL, so this module keeps a
 * deliberately thin mysql2-shaped facade on top of `pg`:
 *
 *   * `pool.query(sql, params)` / `conn.query(...)` resolve to `[rows, fields]`
 *   * `?` placeholders are translated to `$1, $2, ...`
 *   * INSERTs expose `insertId` (thanks to an appended `RETURNING id`), while
 *     UPDATE / DELETE expose `affectedRows`
 *   * transactions use getConnection() + beginTransaction / commit / rollback
 *
 * The statements themselves are plain PostgreSQL - the facade only removes
 * placeholder/bookkeeping noise, so models stay short and readable.
 *
 * Connection resolution (first match wins):
 *   1. DATABASE_URL            (Neon, Render, Railway, Supabase, local)
 *   2. PG* variables           (PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE)
 */
require('dotenv').config();
const { Pool, types } = require('pg');

/* ---------------------------- result parsing ------------------------------ */

// node-postgres returns NUMERIC (DECIMAL), BIGINT (COUNT/SUM) and FLOAT8 as
// strings to avoid precision loss. The API has always returned JSON numbers,
// so we parse them here instead of at every call site.
types.setTypeParser(types.builtins.INT8, (value) => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.FLOAT8, (value) => (value === null ? null : Number(value)));

/* --------------------------- connection config ---------------------------- */

const {
  DATABASE_URL,
  PGSSL,
  PGSSL_REJECT_UNAUTHORIZED = 'false',
  PG_POOL_MAX = '10',
  PG_DEBUG = 'false',
  PGHOST = '127.0.0.1',
  PGPORT = '5432',
  PGUSER = 'postgres',
  PGPASSWORD = '',
  PGDATABASE = 'food_waste_portal',
} = process.env;

// Managed providers (Neon included) require TLS. Enable it when we are told to
// explicitly, or when the connection string carries an `sslmode=` parameter.
const sslRequested =
  String(PGSSL).toLowerCase() === 'true' ||
  /[?&]sslmode=(require|verify-ca|verify-full)/i.test(DATABASE_URL || '');

const ssl = sslRequested
  ? { rejectUnauthorized: String(PGSSL_REJECT_UNAUTHORIZED).toLowerCase() === 'true' }
  : false;

/**
 * Split a PostgreSQL URL into discrete `pg` options.
 *
 * We avoid handing `connectionString` straight to `pg` on purpose: parsing it
 * ourselves lets us drop the libpq-only query parameters (`sslmode`,
 * `channel_binding`, ...) that `pg-connection-string` warns about, and decoding
 * the credentials keeps passwords containing `@`, `:` or `/` intact.
 */
function parseConnectionUrl(rawUrl) {
  const url = new URL(rawUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: url.pathname.replace(/^\//, '') || undefined,
    ssl,
  };
}

/** Resolved `pg` options - also reused by scripts/runSql.js. */
const pgConfig = DATABASE_URL
  ? parseConnectionUrl(DATABASE_URL)
  : {
    host: PGHOST,
    port: Number(PGPORT),
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    ssl,
  };

pgConfig.max = Number(PG_POOL_MAX) || 10;
pgConfig.idleTimeoutMillis = 30_000;
pgConfig.connectionTimeoutMillis = 15_000;

/* ------------------------------- pool setup ------------------------------- */

const rawPool = new Pool(pgConfig);

// Neon (and every managed pooler) may recycle idle connections. Without a
// listener a dropped idle client would surface as an uncaught exception.
rawPool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] idle client error:', err.message);
});

if (String(PG_DEBUG).toLowerCase() === 'true') {
  rawPool.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[db] new PostgreSQL client connected');
  });
}

/* --------------------------- SQL translation ------------------------------ */

/**
 * Rewrite mysql-style `?` placeholders into PostgreSQL `$1..$n`, skipping
 * anything inside string literals, quoted identifiers, comments and
 * dollar-quoted blocks so real `?` characters are never touched.
 */
function toPositional(sql) {
  let out = '';
  let index = 0;
  let paramIndex = 0;
  const len = sql.length;

  while (index < len) {
    const char = sql[index];

    // single-quoted string literal ('' escapes a quote)
    if (char === "'") {
      out += char;
      index += 1;
      while (index < len) {
        out += sql[index];
        if (sql[index] === "'") {
          if (sql[index + 1] === "'") {
            out += sql[index + 1];
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    // double-quoted identifier ("" escapes a quote)
    if (char === '"') {
      out += char;
      index += 1;
      while (index < len) {
        out += sql[index];
        if (sql[index] === '"') {
          if (sql[index + 1] === '"') {
            out += sql[index + 1];
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    // -- line comment
    if (char === '-' && sql[index + 1] === '-') {
      while (index < len && sql[index] !== '\n') {
        out += sql[index];
        index += 1;
      }
      continue;
    }

    // /* block comment */
    if (char === '/' && sql[index + 1] === '*') {
      out += '/*';
      index += 2;
      while (index < len && !(sql[index] === '*' && sql[index + 1] === '/')) {
        out += sql[index];
        index += 1;
      }
      if (index < len) {
        out += '*/';
        index += 2;
      }
      continue;
    }

    // $$ ... $$ / $tag$ ... $tag$ dollar-quoted block (function bodies)
    if (char === '$') {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(index));
      if (tag) {
        const closing = sql.indexOf(tag[0], index + tag[0].length);
        const end = closing === -1 ? len : closing + tag[0].length;
        out += sql.slice(index, end);
        index = end;
        continue;
      }
    }

    // the placeholder itself
    if (char === '?') {
      paramIndex += 1;
      out += `$${paramIndex}`;
      index += 1;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** Leading SQL keyword, ignoring comments and whitespace. */
function statementKind(sql) {
  const match = /^\s*(?:(?:--[^\n]*\n)|\/\*[\s\S]*?\*\/|\s)*([a-z]+)/i.exec(sql);
  return match ? match[1].toUpperCase() : 'SELECT';
}

/**
 * Postgres error codes the rest of the app knows about.
 * `ER_DUP_ENTRY` is the value mysql2 used for a UNIQUE violation.
 */
function normalizeError(err) {
  if (!err) return err;
  if (err.code === '23505') err.code = 'ER_DUP_ENTRY'; // unique_violation
  return err;
}

/** Execute one statement through a `pg` pool or client and reshape the result. */
async function runQuery(executor, sql, params = []) {
  const kind = statementKind(sql);
  const values = Array.isArray(params) ? params : [];
  let text = toPositional(sql);

  // The models read `result.insertId`, which MySQL provided automatically.
  if (kind === 'INSERT' && !/\breturning\b/i.test(text)) text = `${text} RETURNING id`;

  if (String(PG_DEBUG).toLowerCase() === 'true') {
    // eslint-disable-next-line no-console
    console.log('[sql]', text.replace(/\s+/g, ' ').trim().slice(0, 300));
  }

  try {
    const result = await executor.query(text, values);

    if (kind === 'INSERT') {
      const rows = result.rows || [];
      const affected = result.rowCount ?? rows.length;
      return [{
        insertId: rows[0]?.id ?? 0,
        affectedRows: affected,
        rowCount: affected,
        rows,
      }, result.fields];
    }

    if (kind === 'UPDATE' || kind === 'DELETE') {
      return [{
        affectedRows: result.rowCount,
        rowCount: result.rowCount,
        rows: result.rows || [],
      }, result.fields];
    }

    return [result.rows, result.fields];
  } catch (err) {
    throw normalizeError(err);
  }
}

/* ------------------------------- facade ---------------------------------- */

/** mysql2-style connection wrapper around a checked-out `pg` client. */
function wrapConnection(client) {
  return {
    query: (sql, params) => runQuery(client, sql, params),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
    raw: client,
  };
}

/**
 * The object every model/service imports. Mirrors the small part of the
 * mysql2 pool API this codebase uses.
 */
const pool = {
  query: (sql, params) => runQuery(rawPool, sql, params),
  async getConnection() {
    return wrapConnection(await rawPool.connect());
  },
  async end() {
    await rawPool.end();
  },
  raw: rawPool,
  config: pgConfig,
};

/**
 * Verify connectivity at boot. Failing fast here turns a confusing
 * "Cannot read property of undefined" into a clear startup error.
 */
async function assertConnection() {
  const client = await rawPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

/**
 * Run `handler(conn)` inside a single transaction.
 *
 * Used by the claim / delivery / registration flows where several tables must
 * change atomically. The lock taken with `SELECT ... FOR UPDATE` inside the
 * handler is held until commit, which is what prevents double claiming.
 *
 * Automatically rolls back and re-throws on error, always releasing the
 * connection back to the pool.
 */
async function withTransaction(handler) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* connection already gone */ }
    throw err;
  } finally {
    conn.release();
  }
}

/** Human readable target, used in startup logs. */
function describeTarget() {
  if (DATABASE_URL) {
    try {
      const url = new URL(DATABASE_URL);
      return `${url.hostname}${url.pathname}`;
    } catch {
      return 'DATABASE_URL';
    }
  }
  return `${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

module.exports = {
  pool,
  rawPool,
  pgConfig,
  toPositional,
  assertConnection,
  withTransaction,
  describeTarget,
};
