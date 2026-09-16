const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { run, get, all, transaction, UPLOAD_DIR } = require('../db');
const { toSlug } = require('../slug');

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

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// Tags (spec 2.4): one page with an add form and a form for every row. edit is the form that failed validation,
// { id, slug, name_th, name_en } with id null for the add form, so that form shows what was typed.
async function renderTags(res, edit, errors, saved) {
  const tags = await all(`
    SELECT tg.id, tg.slug, tg.name_th, tg.name_en,
      (SELECT COUNT(*) FROM post_tags WHERE tag_id = tg.id) AS posts,
      (SELECT COUNT(*) FROM project_tags WHERE tag_id = tg.id) AS projects
    FROM tags tg ORDER BY tg.slug`);
  res.render('admin/tags', { tags, edit, errors, saved });
}

// Both names are required, and the slug is toSlug(slug || name_en) (spec 2.3).
async function saveTag(req, res, id) {
  const body = req.body ?? {};
  // only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL
  const values = { slug: text(body.slug).trim(), name_th: text(body.name_th).trim(), name_en: text(body.name_en).trim() };
  const slug = toSlug(values.slug || values.name_en);
  const errors = {};
  if (!values.name_th) errors.name_th = 'กรุณาใส่ชื่อภาษาไทย';
  if (!values.name_en) errors.name_en = 'กรุณาใส่ชื่อภาษาอังกฤษ';
  if (!slug) errors.slug = 'กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)';
  if (Object.keys(errors).length === 0) {
    // the duplicate check and the write share one transaction, the same as the post editor
    const written = await transaction(async () => {
      if (await get('SELECT 1 FROM tags WHERE slug = ? AND id <> ?', [slug, id || 0])) return false;
      if (id) {
        await run('UPDATE tags SET slug = ?, name_th = ?, name_en = ? WHERE id = ?', [slug, values.name_th, values.name_en, id]);
      } else {
        await run('INSERT INTO tags (slug, name_th, name_en) VALUES (?, ?, ?)', [slug, values.name_th, values.name_en]);
      }
      return true;
    });
    if (written) return res.redirect(303, '/admin/tags?saved=1');
    errors.slug = 'slug นี้ถูกใช้แล้วในแท็กอื่น';
  }
  // the page again with what was typed, never a redirect and never a 500
  res.status(400);
  await renderTags(res, { id, ...values }, errors, false);
}

router.get('/tags', async (req, res) => {
  await renderTags(res, null, {}, req.query.saved === '1');
});

router.post('/tags', (req, res) => saveTag(req, res, null));

router.post('/tags/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM tags WHERE id = ?', [id]))) return next();
  await saveTag(req, res, id);
});

router.post('/tags/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // post_tags and project_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM tags WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/tags');
});

// Image upload (spec 2.4). Memory storage keeps a file that has not passed the checks below off the disk.
const receive = multer({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image');

// The type comes from the first 12 bytes, never from the file name or the MIME type that the browser declared.
function sniff(buffer) {
  const hex = buffer.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return '.jpg';
  if (hex.startsWith('89504e470d0a1a0a')) return '.png';
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return '.gif';
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return '.webp';
  return null;
}

router.post('/upload', async (req, res) => {
  // multer is called by hand instead of as middleware, so a file over 5 MB, a wrong field name or a form
  // without a file becomes a JSON 400 that admin.js can read, not the HTML error page
  const err = await new Promise(resolve => receive(req, res, resolve));
  if (err || !req.file) {
    const error = err && err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5 MB' : 'กรุณาเลือกรูป 1 ไฟล์';
    return res.status(400).json({ error });
  }
  const ext = sniff(req.file.buffer);
  if (!ext) return res.status(400).json({ error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' });
  // the server makes the whole name, so originalname never reaches the file system
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.file.buffer, { flag: 'wx' });
  res.json({ url: '/uploads/' + name });
});

module.exports = router;
