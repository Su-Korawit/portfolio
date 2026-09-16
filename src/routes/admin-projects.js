const express = require('express');
const { run, get, all, transaction } = require('../db');
const { resolveSlugs } = require('../slug');
const strings = require('../strings');

const router = express.Router();

const LANGS = ['th', 'en'];
const STATUSES = ['none', 'draft', 'published'];
const FIELDS = ['title', 'slug', 'summary', 'body_markdown', 'thumbnail_alt'];
// repo_url and demo_url become href on the public page, where <%= %> escapes HTML but lets a javascript: link through
const URL_PATTERN = /^https?:\/\/\S+$/i;

// The upsert of spec 2.4 with the columns of project_translations. published_at is set the first time a language
// is published and is never reset, not by a later save and not by going back to draft.
const UPSERT_SQL = `
  INSERT INTO project_translations
    (project_id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(project_id, lang) DO UPDATE SET
    status = excluded.status, slug = excluded.slug, title = excluded.title,
    summary = excluded.summary, body_markdown = excluded.body_markdown,
    thumbnail_alt = excluded.thumbnail_alt, updated_at = excluded.updated_at,
    published_at = CASE WHEN excluded.status = 'published'
                        THEN COALESCE(project_translations.published_at, excluded.published_at)
                        ELSE project_translations.published_at END`;

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// sort_order as typed: an empty box counts as 0, and anything that is not a whole number gives null.
function sortOrder(value) {
  if (value === '') return 0;
  return /^-?[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

// Turns a request body, or a DB row shaped like one, into the values that the editor shows and the save writes.
// Only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL.
function readForm(body) {
  const values = {
    thumbnail: text(body.thumbnail).trim(),
    repo_url: text(body.repo_url).trim(),
    demo_url: text(body.demo_url).trim(),
    // the checkbox sends '1' only when it is ticked, and a DB row has the integer 1
    featured: String(body.featured) === '1',
    // kept as text, so a value that fails validation is shown again exactly as typed
    sort_order: typeof body.sort_order === 'number' ? String(body.sort_order) : text(body.sort_order).trim(),
    // one ticked checkbox arrives as the string '12'; [].concat keeps it whole instead of looping over '1' and '2'
    tags: [...new Set([].concat(body.tags || []).map(Number))].filter(n => Number.isSafeInteger(n) && n > 0)
  };
  for (const lang of LANGS) {
    const src = body[lang] && typeof body[lang] === 'object' ? body[lang] : {};
    const tr = { status: STATUSES.includes(src.status) ? src.status : 'none' };
    for (const field of FIELDS) {
      tr[field] = field === 'body_markdown' ? text(src[field]) : text(src[field]).trim();
    }
    values[lang] = tr;
  }
  return values;
}

// Checks that need no DB. Keys are 'form', a shared field name or '<lang>.<field>', so the editor can show a message
// next to its field.
function validate(values, slugs) {
  const errors = {};
  const active = LANGS.filter(lang => values[lang].status !== 'none');
  if (active.length === 0) errors.form = 'ต้องมีอย่างน้อยหนึ่งภาษาที่สถานะไม่ใช่ ไม่มีฉบับนี้';
  if (values.repo_url && !URL_PATTERN.test(values.repo_url)) errors.repo_url = 'ลิงก์ repo ต้องขึ้นต้นด้วย https:// หรือ http://';
  if (values.demo_url && !URL_PATTERN.test(values.demo_url)) errors.demo_url = 'ลิงก์ demo ต้องขึ้นต้นด้วย https:// หรือ http://';
  if (sortOrder(values.sort_order) === null) errors.sort_order = 'ลำดับต้องเป็นจำนวนเต็ม เช่น 0, 1 หรือ -1';
  for (const lang of active) {
    if (!values[lang].title) errors[lang + '.title'] = 'กรุณาใส่หัวข้อ';
    if (!slugs[lang]) errors[lang + '.slug'] = 'กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)';
  }
  return errors;
}

// Runs inside one transaction, so no other save can take a slug between the duplicate check and the writes.
async function write(id, values, slugs) {
  const errors = {};
  for (const lang of LANGS) {
    if (values[lang].status === 'none') continue;
    const clash = await get(
      'SELECT 1 FROM project_translations WHERE lang = ? AND slug = ? AND project_id <> ?',
      [lang, slugs[lang], id || 0]
    );
    if (clash) errors[lang + '.slug'] = 'slug นี้ถูกใช้แล้วในโปรเจกต์อื่นของภาษานี้';
  }
  if (Object.keys(errors).length) return { errors };

  const now = new Date().toISOString();
  const shared = [
    values.thumbnail || null,
    values.repo_url || null,
    values.demo_url || null,
    values.featured ? 1 : 0,
    sortOrder(values.sort_order)
  ];
  let projectId = id;
  if (projectId) {
    await run(
      'UPDATE projects SET thumbnail = ?, repo_url = ?, demo_url = ?, featured = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [...shared, now, projectId]
    );
  } else {
    projectId = (await run(
      'INSERT INTO projects (thumbnail, repo_url, demo_url, featured, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [...shared, now, now]
    )).lastID;
  }
  for (const lang of LANGS) {
    const tr = values[lang];
    if (tr.status === 'none') {
      // none means no row (spec 2.4)
      await run('DELETE FROM project_translations WHERE project_id = ? AND lang = ?', [projectId, lang]);
      continue;
    }
    await run(UPSERT_SQL, [
      projectId, lang, tr.status, slugs[lang], tr.title, tr.summary, tr.body_markdown, tr.thumbnail_alt,
      tr.status === 'published' ? now : null, now
    ]);
  }
  await run('DELETE FROM project_tags WHERE project_id = ?', [projectId]);
  // a tag id that no longer exists is skipped instead of failing the foreign key
  await run(
    'INSERT INTO project_tags (project_id, tag_id) SELECT ?, id FROM tags WHERE id IN (SELECT value FROM json_each(?))',
    [projectId, JSON.stringify(values.tags)]
  );
  return { id: projectId };
}

async function renderEditor(res, id, values, errors, saved) {
  const tags = await all('SELECT id, slug FROM tags ORDER BY slug');
  // statuses of the rows in the DB: the confirm before deleting a translation and the slug warning depend on them
  const stored = { th: null, en: null };
  if (id) {
    for (const row of await all('SELECT lang, status FROM project_translations WHERE project_id = ?', [id])) {
      stored[row.lang] = row.status;
    }
  }
  res.render('admin/project-edit', { id, values, errors, tags, stored, saved });
}

async function save(req, res, id) {
  const values = readForm(req.body ?? {});
  const slugs = resolveSlugs(values);
  const errors = validate(values, slugs);
  const result = Object.keys(errors).length ? { errors } : await transaction(() => write(id, values, slugs));
  if (result.errors) {
    // spec 2.4: show the form again with what was typed, never a redirect and never a 500
    res.status(400);
    return renderEditor(res, id, values, result.errors, false);
  }
  res.redirect(303, '/admin/projects/' + result.id + '?saved=1');
}

// Same order as the public /projects page (spec 2.1), so the list shows the order that readers will see.
router.get('/', async (req, res) => {
  const projects = await all(`
    SELECT p.id, p.featured, p.sort_order, p.updated_at,
      (SELECT title FROM project_translations WHERE project_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM project_translations WHERE project_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM project_translations WHERE project_id = p.id AND lang = 'en') AS en
    FROM projects p ORDER BY p.featured DESC, p.sort_order, p.id`);
  res.render('admin/projects', { projects });
});

// declared before /:id (spec 2.4); a new project starts as th=draft, en=none, not featured and sort_order 0
router.get('/new', async (req, res) => {
  await renderEditor(res, null, readForm({ sort_order: '0', th: { status: 'draft' } }), {}, false);
});

router.post('/', (req, res) => save(req, res, null));

// Preview in the pattern of POST /admin/posts/preview/:lang: the real project page rendered from the form,
// without writing anything to the DB. :lang is th or en only; anything else goes on to the 404 handler.
router.post('/preview/:lang', async (req, res, next) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return next();
  const values = readForm(req.body ?? {});
  const tr = values[lang];
  // the same locals that src/app.js sets for /th and /en
  res.locals.lang = lang;
  res.locals.other = lang === 'th' ? 'en' : 'th';
  res.locals.t = strings[lang];
  const settingRows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  res.locals.settings = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
  const tagRows = await all(
    'SELECT slug, name_th, name_en FROM tags WHERE id IN (SELECT value FROM json_each(?)) ORDER BY slug',
    [JSON.stringify(values.tags)]
  );
  // a link that would fail validation is left out, so the preview never renders a javascript: href
  const link = url => (URL_PATTERN.test(url) ? url : '');
  res.render('project', {
    project: { thumbnail: values.thumbnail, repo_url: link(values.repo_url), demo_url: link(values.demo_url) },
    tr,
    tags: tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en })),
    preview: true,
    // no canonical, hreflang or og:url because a preview has no public URL, and noindex keeps it out of search
    meta: {
      title: tr.title,
      description: tr.summary,
      noindex: true,
      type: 'website'
    }
  });
});

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  const project = id && (await get('SELECT * FROM projects WHERE id = ?', [id]));
  if (!project) return next();
  const body = {
    thumbnail: project.thumbnail || '',
    repo_url: project.repo_url || '',
    demo_url: project.demo_url || '',
    featured: project.featured,
    sort_order: project.sort_order
  };
  for (const row of await all('SELECT * FROM project_translations WHERE project_id = ?', [id])) body[row.lang] = row;
  body.tags = (await all('SELECT tag_id FROM project_tags WHERE project_id = ?', [id])).map(row => row.tag_id);
  await renderEditor(res, id, readForm(body), {}, req.query.saved === '1');
});

router.post('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM projects WHERE id = ?', [id]))) return next();
  await save(req, res, id);
});

router.post('/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // project_translations and project_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM projects WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/projects');
});

module.exports = router;
