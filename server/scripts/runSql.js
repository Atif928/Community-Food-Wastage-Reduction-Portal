#!/usr/bin/env node
/**
 * Tiny SQL file runner so the project can be set up without the psql CLI.
 *
 *   npm run db:create   -> executes server/sql/schema.sql
 *   npm run db:seed     -> executes server/sql/seed.sql
 *   npm run db:reset    -> schema then seed
 *
 * Works against any PostgreSQL, including Neon: put the connection string in
 * DATABASE_URL (server/.env) and pass `?sslmode=require` for managed hosts.
 *
 * Each file is sent as a single simple query, so the multiple statements it
 * contains run in one round trip (Postgres allows this when there are no
 * bind parameters - which is the case for schema.sql / seed.sql).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { pgConfig, describeTarget } = require('../config/db');

const which = (process.argv[2] || 'schema').toLowerCase();
const fileFor = { schema: 'schema.sql', seed: 'seed.sql' };
const fileName = fileFor[which];

if (!fileName) {
  console.error(`Unknown target "${which}". Use "schema" or "seed".`);
  process.exit(1);
}

const filePath = path.join(__dirname, '..', 'sql', fileName);

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // A dedicated client (no pool) keeps the run isolated and lets us close the
  // connection deterministically when the script finishes.
  const client = new Client(pgConfig);
  await client.connect();

  try {
    console.log(`Running ${fileName} against ${describeTarget()} ...`);
    await client.query(sql);
    console.log(`Done: ${fileName} executed successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('SQL run failed:', err.message);
  process.exit(1);
});
