/**
 * Server entry point.
 *
 * Boot order:
 *   1. load environment
 *   2. verify the MySQL connection (fail fast with a clear message)
 *   3. start listening
 *   4. install graceful shutdown handlers
 */
require('dotenv').config();
const app = require('./app');
const { assertConnection, pool, describeTarget } = require('./config/db');

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// eslint-disable-next-line no-console
const log = (...args) => console.log('[server]', ...args);

let server;

async function start() {
  try {
    await assertConnection();
    log(`PostgreSQL connected (${describeTarget()})`);
  } catch (err) {
    console.error('[server] Could not connect to PostgreSQL:', err.message);
    console.error('[server] Check server/.env (DATABASE_URL or PG*) and make sure the schema + seed have been loaded:');
    console.error('[server]   npm run db:reset');
    process.exit(1);
  }

  server = app.listen(PORT, HOST, () => {
    log(`API listening on http://localhost:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
    log(`CORS origins: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}`);
    log(`Notification radius: ${process.env.NOTIFY_RADIUS_KM || 10} km (NOTIFY_RADIUS_KM)`);
    log(`Upload driver: ${require('./services/storageService').getDriver()}`);
  });
}

/* --------------------------- graceful shutdown ---------------------------- */

async function shutdown(signal) {
  log(`${signal} received - shutting down...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    log('HTTP server closed.');
  }
  try {
    await pool.end();
    log('MySQL pool closed.');
  } catch (err) {
    console.error('[server] Error closing MySQL pool:', err.message);
  }
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => { shutdown(signal); });
});

// Never leave a dangling promise unlogged.
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  shutdown('uncaughtException');
});

start();

module.exports = { start };
