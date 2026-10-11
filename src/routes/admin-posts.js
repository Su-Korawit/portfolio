const express = require('express');
const { run, get, all, transaction } = require('../db');
const { resolveSlugs } = require('../slug');
const strings = require('../strings');

const router = express.Router();

const LANGS = ['th', 'en'];
const STATUSES = ['none', 'draft', 'published'];
const FIELDS = ['title', 'slug', 'excerpt', 'body_markdown', 'cover_image_alt', 'seo_title', 'seo_description'];

// Upsert from spec 2.4. published_at is set the first time a language is published and is never reset,
// not by a later save and not by going back to draft.
const UPSERT_SQL = `
  INSERT INTO post_translations
    (post_id, lang, status, slug, title, excerpt, body_markdown, seo_title, seo_description,
     cover_image_alt, published_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(post_id, lang) DO UPDATE SET
    status = excluded.status, slug = excluded.slug, title = excluded.title,
    excerpt = excluded.excerpt, body_markdown = excluded.body_markdown,
    seo_title = excluded.seo_title, seo_description = excluded.seo_description,
    cover_image_alt = excluded.cover_image_alt, updated_at = excluded.updated_at,
    published_at = CASE WHEN excluded.status = 'published'
                        THEN COALESCE(post_translations.published_at, excluded.published_at)
                        ELSE post_translations.published_at END`;

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// The order of /admin/posts, which is also the order of the public lists: sort_order first (set by the up and
// down buttons, and below every other post's for a new one), then the newest published date, so posts made
// before sort_order existed - all 0 - keep the newest-first order they always had.
const ADMIN_ORDER = `ORDER BY p.sort_order,
  (SELECT MAX(published_at) FROM post_translations WHERE post_id = p.id) DESC, p.id DESC`;

// series_part as typed: '' means "the next part" and anything but a whole number from 1 up gives null.
const seriesPart = value => (value === '' ? '' : /^[1-9][0-9]{0,3}$/.test(value) ? Number(value) : null);

// Turns a request body, or DB rows shaped like one, into the values that the editor shows and the save writes.
// Only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL.
function readForm(body) {
  const values = {
    cover_image: text(body.cover_image).trim(),
    series: text(body.series).trim().slice(0, 100),
    series_part: typeof body.series_part === 'number' ? String(body.series_part) : text(body.series_part).trim(),
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

// Checks that need no DB. Keys are 'form', a shared field or '<lang>.<field>', so the editor can show a message
// next to its field. A missing slug is not an error: write() makes one up.
function validate(values) {
  const errors = {};
  const active = LANGS.filter(lang => values[lang].status !== 'none');
  if (active.length === 0) errors.form = 'ต้องมีอย่างน้อยหนึ่งภาษาที่สถานะไม่ใช่ ไม่มีฉบับนี้';
  for (const lang of active) {
    if (!values[lang].title) errors[lang + '.title'] = 'กรุณาใส่หัวข้อ';
  }
  if (seriesPart(values.series_part) === null) errors.series_part = 'ตอนที่ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป';
  return errors;
}

// Runs inside one transaction, so no other save can take a slug between the duplicate check and the writes.
async function write(id, values, slugs) {
  const errors = {};
  // A title in Thai only, with no slug typed in either language, gives no slug (src/slug.js). Rather than ask
  // for one, the post gets post-<id>, with the id a new post is about to get - safe, as only one transaction
  // runs at a time - and a number after it in the rare case another post already took that slug by hand.
  const postNumber = id || (await get('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM posts')).next;
  for (const lang of LANGS) {
    if (values[lang].status === 'none' || slugs[lang]) continue;
    let slug = 'post-' + postNumber;
    for (let n = 2; await get('SELECT 1 FROM post_translations WHERE lang = ? AND slug = ? AND post_id <> ?', [lang, slug, id || 0]); n++) {
      slug = 'post-' + postNumber + '-' + n;
    }
    slugs[lang] = slug;
  }
  for (const lang of LANGS) {
    if (values[lang].status === 'none') continue;
    const clash = await get(
      'SELECT 1 FROM post_translations WHERE lang = ? AND slug = ? AND post_id <> ?',
      [lang, slugs[lang], id || 0]
    );
    if (clash) errors[lang + '.slug'] = 'slug นี้ถูกใช้แล้วในบทความอื่นของภาษานี้';
  }
  if (Object.keys(errors).length) return { errors };

  const now = new Date().toISOString();
  const cover = values.cover_image || null;
  // A series is found by its name, or made on the spot when the name is new. Without a part number the post
  // becomes the series' next part.
  let seriesId = null;
  let part = null;
  if (values.series) {
    await run('INSERT INTO series (name) VALUES (?) ON CONFLICT(name) DO NOTHING', [values.series]);
    seriesId = (await get('SELECT id FROM series WHERE name = ?', [values.series])).id;
    part = seriesPart(values.series_part) || (await get(
      'SELECT COALESCE(MAX(series_part), 0) + 1 AS next FROM posts WHERE series_id = ? AND id <> ?', [seriesId, id || 0]
    )).next;
  }
  let postId = id;
  if (postId) {
    await run(
      'UPDATE posts SET cover_image = ?, series_id = ?, series_part = ?, updated_at = ? WHERE id = ?',
      [cover, seriesId, part, now, postId]
    );
  } else {
    // a new post goes to the top of the list, where the newest post has always been
    postId = (await run(
      `INSERT INTO posts (cover_image, series_id, series_part, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM posts), ?, ?)`,
      [cover, seriesId, part, now, now]
    )).lastID;
  }
  // a series that no post is in any more is gone, so it stops being offered in the editor
  await run('DELETE FROM series WHERE id NOT IN (SELECT series_id FROM posts WHERE series_id IS NOT NULL)');
  for (const lang of LANGS) {
    const tr = values[lang];
    if (tr.status === 'none') {
      // none means no row (spec 2.4)
      await run('DELETE FROM post_translations WHERE post_id = ? AND lang = ?', [postId, lang]);
      continue;
    }
    await run(UPSERT_SQL, [
      postId, lang, tr.status, slugs[lang], tr.title, tr.excerpt, tr.body_markdown,
      tr.seo_title, tr.seo_description, tr.cover_image_alt,
      tr.status === 'published' ? now : null, now
    ]);
  }
  await run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
  // a tag id that no longer exists is skipped instead of failing the foreign key
  await run(
    'INSERT INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE id IN (SELECT value FROM json_each(?))',
    [postId, JSON.stringify(values.tags)]
  );
  return { id: postId };
}

async function renderEditor(res, id, values, errors, saved) {
  const tags = await all('SELECT id, slug FROM tags ORDER BY slug');
  // statuses of the rows in the DB: the confirm before deleting a translation and the slug warning depend on them
  const stored = { th: null, en: null };
  if (id) {
    for (const row of await all('SELECT lang, status FROM post_translations WHERE post_id = ?', [id])) {
      stored[row.lang] = row.status;
    }
  }
  const seriesNames = (await all('SELECT name FROM series ORDER BY name')).map(row => row.name);
  res.render('admin/post-edit', { id, values, errors, tags, stored, saved, seriesNames });
}

async function save(req, res, id) {
  const values = readForm(req.body ?? {});
  const slugs = resolveSlugs(values);
  const errors = validate(values);
  const result = Object.keys(errors).length ? { errors } : await transaction(() => write(id, values, slugs));
  if (result.errors) {
    // spec 2.4: show the form again with what was typed, never a redirect and never a 500
    res.status(400);
    return renderEditor(res, id, values, result.errors, false);
  }
  res.redirect(303, '/admin/posts/' + result.id + '?saved=1');
}

router.get('/', async (req, res) => {
  const posts = await all(`
    SELECT p.id, p.updated_at, p.series_part, s.name AS series,
      (SELECT title FROM post_translations WHERE post_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'en') AS en
    FROM posts p LEFT JOIN series s ON s.id = p.series_id ${ADMIN_ORDER}`);
  res.render('admin/posts', { posts });
});

// declared before /:id (spec 2.4); a new post starts as th=draft and en=none
router.get('/new', async (req, res) => {
  await renderEditor(res, null, readForm({ th: { status: 'draft' } }), {}, false);
});

router.post('/', (req, res) => save(req, res, null));

// Preview from spec 2.4: the real post page rendered from the form, without writing anything to the DB.
// :lang is th or en only; anything else goes on to the 404 handler.
router.post('/preview/:lang', async (req, res, next) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return next();
  const values = readForm(req.body ?? {});
  const tr = values[lang];
  // the same locals that src/app.js sets for /th and /en, otherwise an English preview gets <html lang="th"> and Thai UI text
  res.locals.lang = lang;
  res.locals.other = lang === 'th' ? 'en' : 'th';
  res.locals.t = strings[lang];
  // settings the way the public router loads them, so the header and <title> show the site name
  const settingRows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  res.locals.settings = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
  // tag chips in the page language, in the same { slug, name } shape and order as GET /blog/:slug
  const tagRows = await all(
    'SELECT slug, name_th, name_en FROM tags WHERE id IN (SELECT value FROM json_each(?)) ORDER BY slug',
    [JSON.stringify(values.tags)]
  );
  res.render('post', {
    post: { cover_image: values.cover_image },
    tr,
    tags: tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en })),
    alternates: [],
    preview: true,
    // no canonical, hreflang or og:url because a preview has no public URL, and noindex keeps it out of search
    meta: {
      title: tr.seo_title || tr.title,
      description: tr.seo_description || tr.excerpt,
      noindex: true,
      type: 'article'
    }
  });
});

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  const post = id && (await get(
    'SELECT p.id, p.cover_image, p.series_part, s.name AS series FROM posts p LEFT JOIN series s ON s.id = p.series_id WHERE p.id = ?',
    [id]
  ));
  if (!post) return next();
  const body = {
    cover_image: post.cover_image || '',
    series: post.series || '',
    series_part: post.series ? String(post.series_part || '') : ''
  };
  for (const row of await all('SELECT * FROM post_translations WHERE post_id = ?', [id])) body[row.lang] = row;
  body.tags = (await all('SELECT tag_id FROM post_tags WHERE post_id = ?', [id])).map(row => row.tag_id);
  await renderEditor(res, id, readForm(body), {}, req.query.saved === '1');
});

router.post('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM posts WHERE id = ?', [id]))) return next();
  await save(req, res, id);
});

// The up and down buttons on /admin/posts. The whole list is numbered again from 0 in its current order with
// the two posts swapped, so ties left over from before sort_order existed never make a move do nothing.
router.post('/:id/move', async (req, res, next) => {
  const id = parseId(req.params.id);
  const direction = (req.body ?? {}).direction;
  if (!id || !['up', 'down'].includes(direction)) return next();
  const found = await transaction(async () => {
    const ids = (await all(`SELECT p.id FROM posts p ${ADMIN_ORDER}`)).map(row => Number(row.id));
    const from = ids.indexOf(id);
    if (from === -1) return false;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return true;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    for (const [index, postId] of ids.entries()) await run('UPDATE posts SET sort_order = ? WHERE id = ?', [index, postId]);
    return true;
  });
  if (!found) return next();
  res.redirect(303, '/admin/posts#post-' + id);
});

router.post('/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // post_translations and post_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM posts WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/posts');
});

module.exports = router;
