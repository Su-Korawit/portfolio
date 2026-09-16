const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new sqlite3.Database(path.join(DATA_DIR, 'site.db'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => (err ? reject(err) : resolve()));
  });
}

const ready = (async () => {
  await exec('PRAGMA foreign_keys = ON');
  await exec('PRAGMA journal_mode = WAL');
  await exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
})();

let queue = Promise.resolve();

function transaction(fn) {
  const result = queue.then(async () => {
    await run('BEGIN IMMEDIATE');
    try {
      const value = await fn();
      await run('COMMIT');
      return value;
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });
  queue = result.catch(() => {});
  return result;
}

function close() {
  return new Promise((resolve, reject) => {
    db.close(err => (err ? reject(err) : resolve()));
  });
}

module.exports = { db, ready, run, get, all, transaction, close, DATA_DIR, UPLOAD_DIR };
