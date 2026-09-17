const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');
const v8 = require('node:v8');
const vm = require('node:vm');

// global.gc exists only with --expose-gc; setting the flag at runtime and reading gc from a new
// context gives the same function without changing how npm test starts node.
v8.setFlagsFromString('--expose-gc');
const runGc = vm.runInNewContext('gc');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { ready, run, get, all, close, DATA_DIR } = require('../src/db');

function toForm(obj) {
  const form = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) add(key, item);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(key + '[' + k + ']', v);
    } else {
      form.append(key, String(value));
    }
  };
  for (const [key, value] of Object.entries(obj)) add(key, value);
  return form;
}

// Same format as cookie-parser: 's:' + value + '.' + base64 HMAC-SHA256 without trailing '='.
function signCookie(value, secret = 'test-secret') {
  const signature = crypto.createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');
  return 's:' + value + '.' + signature;
}

// Inserts a post straight into the DB. th and en are optional; a language that is left out has no row.
// published_at defaults to now for a published translation and to null for a draft.
async function insertPost({ cover_image = null, th, en, tags = [] } = {}) {
  const now = new Date().toISOString();
  const { lastID: id } = await run('INSERT INTO posts (cover_image) VALUES (?)', [cover_image]);
  for (const [lang, tr] of [['th', th], ['en', en]]) {
    if (!tr) continue;
    const {
      status = 'published',
      slug,
      title,
      excerpt = '',
      body_markdown = '',
      cover_image_alt = '',
      seo_title = '',
      seo_description = '',
      published_at = status === 'published' ? now : null
    } = tr;
    await run(
      `INSERT INTO post_translations
         (post_id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt,
          seo_title, seo_description, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt, seo_title, seo_description, published_at, now]
    );
  }
  for (const tagId of tags) {
    await run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

// Inserts a project straight into the DB, the same way as insertPost. th and en are optional; a language that is
// left out has no row. featured is 0 or 1, and published_at defaults to now for a published translation.
async function insertProject({ thumbnail = null, repo_url = null, demo_url = null, featured = 0, sort_order = 0, th, en, tags = [] } = {}) {
  const now = new Date().toISOString();
  const { lastID: id } = await run(
    'INSERT INTO projects (thumbnail, repo_url, demo_url, featured, sort_order) VALUES (?, ?, ?, ?, ?)',
    [thumbnail, repo_url, demo_url, featured, sort_order]
  );
  for (const [lang, tr] of [['th', th], ['en', en]]) {
    if (!tr) continue;
    const {
      status = 'published',
      slug,
      title,
      summary = '',
      body_markdown = '',
      thumbnail_alt = '',
      published_at = status === 'published' ? now : null
    } = tr;
    await run(
      `INSERT INTO project_translations
         (project_id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, now]
    );
  }
  for (const tagId of tags) {
    await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

// Inserts a tag straight into the DB and returns its id, which insertPost and insertProject take in tags.
// Both names default to the slug, so a test that does not care about names can pass the slug alone.
async function insertTag({ slug, name_th = slug, name_en = slug } = {}) {
  const { lastID } = await run('INSERT INTO tags (slug, name_th, name_en) VALUES (?, ?, ?)', [slug, name_th, name_en]);
  return lastID;
}

function updateJar(jar, setCookie) {
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let expired = value === '';
    for (const attr of attrs) {
      const [key, val = ''] = attr.trim().split('=');
      if (key.toLowerCase() === 'max-age' && Number(val) <= 0) expired = true;
      if (key.toLowerCase() === 'expires' && Date.parse(val) <= Date.now()) expired = true;
    }
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

async function start() {
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const jar = new Map();

  async function req(urlPath, opts = {}) {
    const { method = 'GET', form, body, headers = {}, cookie, jar: useJar = true } = opts;
    const cookies = [];
    if (useJar) for (const [name, value] of jar) cookies.push(name + '=' + value);
    if (cookie) cookies.push(cookie);
    const sendHeaders = { ...headers };
    if (cookies.length) sendHeaders.cookie = cookies.join('; ');
    const res = await fetch(base + urlPath, {
      method,
      headers: sendHeaders,
      body: form ? toForm(form) : body,
      redirect: 'manual'
    });
    const setCookie = res.headers.getSetCookie();
    if (useJar) updateJar(jar, setCookie);
    return {
      status: res.status,
      location: res.headers.get('location'),
      headers: res.headers,
      text: await res.text(),
      setCookie
    };
  }

  function login(password = 'pw') {
    return req('/admin/login', { method: 'POST', form: { username: 'admin', password } });
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
    await close();
    // libsql releases the database file only when its native connection objects are garbage
    // collected, not on close(). Windows cannot delete an open file, so collect them first.
    runGc();
    await new Promise(resolve => setImmediate(resolve));
    await fs.promises.rm(DATA_DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }

  return { base, req, login, stop };
}

module.exports = { start, toForm, insertPost, insertProject, insertTag, signCookie, run, get, all };
