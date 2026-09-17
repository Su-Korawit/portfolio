const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const { createClient } = require('@libsql/client');

const DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// A Turso URL (TURSO_DATABASE_URL) makes this a remote database, which is what keeps data across
// deploys on hosts with no persistent disk (e.g. Render's free tier). Without it, this falls back
// to a local SQLite file under DATA_DIR, exactly as before - what local dev and the tests use.
const client = process.env.TURSO_DATABASE_URL
  ? createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  : createClient({ url: 'file:' + path.join(DATA_DIR, 'site.db') });

// execute() runs each statement on its own connection, so statements inside a transaction() below
// must instead go through that transaction's own connection - this holds it for run/get/all/exec to
// pick up without every call site having to pass it explicitly.
const activeTransaction = new AsyncLocalStorage();
const conn = () => activeTransaction.getStore() || client;

async function run(sql, params = []) {
  const rs = await conn().execute({ sql, args: params });
  return { lastID: rs.lastInsertRowid === undefined ? undefined : Number(rs.lastInsertRowid), changes: rs.rowsAffected };
}

async function get(sql, params = []) {
  const rs = await conn().execute({ sql, args: params });
  return rs.rows[0];
}

async function all(sql, params = []) {
  const rs = await conn().execute({ sql, args: params });
  return rs.rows;
}

function exec(sql) {
  return conn().executeMultiple(sql);
}

const ready = (async () => {
  await exec('PRAGMA foreign_keys = ON');
  // journal_mode is a local SQLite file setting; Turso manages that itself on its own storage.
  if (!process.env.TURSO_DATABASE_URL) await exec('PRAGMA journal_mode = WAL');
  await exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
})();

// Only one transaction runs at a time. BEGIN IMMEDIATE from two connections at once on a local
// SQLite file would otherwise fail with SQLITE_BUSY, and serializing costs nothing at this app's
// traffic.
let queue = Promise.resolve();

// Runs fn() on its own connection, so PRAGMA foreign_keys = ON from `ready` above does not carry
// over here (SQLite pragmas are per-connection, and this one is a no-op once a transaction has
// begun anyway). Nothing here relies on ON DELETE CASCADE inside a transaction - every route that
// deletes cascading rows (see admin-posts.js/admin-projects.js) does it with a plain run(), which
// does carry that pragma.
function transaction(fn) {
  const result = queue.then(async () => {
    const tx = await client.transaction('write');
    try {
      const value = await activeTransaction.run(tx, fn);
      await tx.commit();
      return value;
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    } finally {
      tx.close();
    }
  });
  queue = result.catch(() => {});
  return result;
}

async function close() {
  client.close();
}

module.exports = { ready, run, get, all, transaction, close, DATA_DIR, UPLOAD_DIR };
