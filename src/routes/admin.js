const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db');

const router = express.Router();

const COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/admin',
  signed: true
};
const MAX_AGE = 30 * 864e5;
const issue = (res, epoch) => res.cookie('ta_admin', (Date.now() + MAX_AGE) + ':' + epoch, { ...COOKIE, maxAge: MAX_AGE });

async function sessionEpoch() {
  const row = await get("SELECT value FROM settings WHERE key = 'session_epoch' AND lang = '*'");
  return row ? row.value : '0';
}

async function requireAdmin(req, res, next) {
  const [exp, ep] = String(req.signedCookies.ta_admin || '').split(':');
  const epoch = await sessionEpoch();
  if (!(Number(exp) > Date.now() && ep === epoch)) return res.redirect('/admin/login');
  issue(res, epoch);
  next();
}

router.use(express.urlencoded({ extended: true, limit: '1mb' }));

router.get('/login', (req, res) => {
  res.render('admin/login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  const ok = await bcrypt.compare(String(password || ''), process.env.ADMIN_PASSWORD_HASH);
  if (!ok || String(username || '') !== process.env.ADMIN_USERNAME) {
    return res.status(401).render('admin/login', {
      error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      username: String(username || '')
    });
  }
  issue(res, await sessionEpoch());
  res.redirect(303, '/admin/posts');
});

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.redirect(303, '/admin/posts');
});

router.post('/logout', (req, res) => {
  res.clearCookie('ta_admin', COOKIE);
  res.redirect(303, '/admin/login');
});

router.post('/sessions/revoke', async (req, res) => {
  await run(`INSERT INTO settings (key, lang, value) VALUES ('session_epoch', '*', '1')
             ON CONFLICT(key, lang) DO UPDATE SET value = CAST(value AS INTEGER) + 1`);
  res.clearCookie('ta_admin', COOKIE);
  res.redirect(303, '/admin/login');
});

router.use('/posts', require('./admin-posts'));
router.use('/projects', require('./admin-projects'));

module.exports = router;
