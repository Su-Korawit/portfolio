const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');

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
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  return { base, req, login, stop };
}

module.exports = { start, toForm, signCookie, run, get, all };
