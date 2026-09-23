const express = require('express');
const { get, all, run } = require('../db');
const commentCookies = require('../comment-cookies');
const rateLimit = require('../rate-limit');

const router = express.Router();

const PAGE_SIZE = 10;

// Fallback list query from spec 2.1. Each post appears once: in the page language when that
// translation is published, otherwise as the published translation in the other language.
// post_id breaks ties, so two posts with the same published_at never swap places between pages.
const LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  WHERE t.status = 'published'
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

// Projects use the same fallback as LIST_SQL and the order from spec 2.1: featured first, then sort_order, then id.
// The first parameter is the lowest featured value to include: 1 on the home page keeps only featured projects,
// 0 on /projects keeps them all. There is no LIMIT because /projects has no pagination.
const PROJECT_LIST_SQL = `
  SELECT t.project_id, t.lang, t.slug, t.title, t.summary, p.thumbnail
  FROM project_translations t
  JOIN projects p ON p.id = t.project_id
  WHERE t.status = 'published'
    AND p.featured >= ?
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM project_translations x
          WHERE x.project_id = t.project_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY p.featured DESC, p.sort_order, p.id`;

// The tag page lists posts only (spec 2.1). This is LIST_SQL with one more join that keeps the posts of one tag,
// so the fallback and the order are the same as /blog. Parameters: [tagId, lang, lang, limit, offset].
const TAG_LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  JOIN post_tags pt ON pt.post_id = t.post_id AND pt.tag_id = ?
  WHERE t.status = 'published'
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

// Search (spec 4.1). LIKE instead of FTS5, because FTS5's default tokenizer cannot split Thai text that has
// no spaces between words, and ESCAPE '!' turns a literal '%' or '_' the reader typed into an ordinary
// character instead of a wildcard.
const like = q => '%' + q.replace(/[!%_]/g, '!$&') + '%';

// Same pattern as admin-projects.js's URL_PATTERN/link(): repo_url/demo_url become href on this page, where
// <%= %> escapes HTML but lets a javascript: link through. A row written straight into SQLite (bypassing the
// admin form and its own filtering) could still carry an unsafe scheme, so this route filters independently.
const URL_PATTERN = /^https?:\/\/\S+$/i;
const link = url => (url && URL_PATTERN.test(url) ? url : '');

const COMMENT_MIN = 2;
const COMMENT_MAX = 2000;

// คืนค่า { ok: true, value } หรือ { ok: false, key } โดย key เป็นคีย์ของ src/strings.js
function validateCommentBody(raw) {
  const body = typeof raw === 'string' ? raw.trim() : '';
  if (body.length < COMMENT_MIN) return { ok: false, key: 'commentTooShort' };
  if (body.length > COMMENT_MAX) return { ok: false, key: 'commentTooLong' };
  return { ok: true, value: body };
}

// ตรวจ honeypot -> CSRF -> rate-limit -> ความยาวข้อความ ตามลำดับนี้เสมอ (spec ส่วนที่ 4): สามอย่างแรกตอบเหมือน
// สำเร็จเงียบๆ โดยไม่บันทึกอะไร เพื่อไม่ให้เป็นสัญญาณบอกบอทว่าโดนจับได้เพราะอะไร มีแค่ผิดความยาวเท่านั้นที่บอกผู้ใช้จริง
async function submitComment(req, res, column, id) {
  // req.body เป็น undefined ได้เมื่อ body-parser เจอ Content-Type ที่ไม่ตรง application/x-www-form-urlencoded
  const body = req.body || {};
  if (typeof body.website === 'string' && body.website !== '') return { status: 'silent' };
  if (!commentCookies.checkCsrf(req)) return { status: 'silent' };
  if (!rateLimit.allow(req.ip)) return { status: 'silent' };
  const parsed = validateCommentBody(body.body);
  if (!parsed.ok) return { status: 'invalid', key: parsed.key };
  await run(`INSERT INTO comments (${column}, author_name, body) VALUES (?, ?, ?)`, [id, res.locals.nickname, parsed.value]);
  return { status: 'ok' };
}

// เชื่อถือเฉพาะ path ของ Referer ไม่สนใจ host เลย: ค่าที่คืนใช้สร้าง relative redirect กลับเข้าเว็บนี้เองเท่านั้น
// (ไม่เคยเอา host ของ Referer ไปต่อเป็น URL ปลายทาง) จึงไม่มีช่อง open redirect ให้ต้องตรวจ host เพิ่ม
// เช็คแค่รูปแบบ path ว่าเป็นหน้าในเว็บนี้จริง (ขึ้นต้นด้วย /th/ หรือ /en/) ไม่งั้น fallback ไปหน้าแรกของภาษานั้น
function safeReferer(req, lang) {
  const header = req.get('Referer') || '';
  try {
    const { pathname, search } = new URL(header);
    if (/^\/(th|en)\//.test(pathname)) return pathname + search;
  } catch {}
  return '/' + lang;
}

// Same fallback as LIST_SQL, but the EXISTS clause matches the search term against every published
// translation of the post, not just the one being displayed - so a term that exists only in the Thai body
// still finds the post on /en/search, shown as its own English card. Title matches sort first.
const SEARCH_POST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  WHERE t.status = 'published'
    AND (t.lang = $lang OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = $lang AND x.status = 'published'))
    AND EXISTS (
          SELECT 1 FROM post_translations m
          WHERE m.post_id = t.post_id AND m.status = 'published'
            AND (m.title LIKE $q ESCAPE '!' OR m.excerpt LIKE $q ESCAPE '!' OR m.body_markdown LIKE $q ESCAPE '!'))
  ORDER BY EXISTS (
          SELECT 1 FROM post_translations m
          WHERE m.post_id = t.post_id AND m.status = 'published' AND m.title LIKE $q ESCAPE '!') DESC,
        t.published_at DESC
  LIMIT 20`;

// Same shape as SEARCH_POST_SQL, matching title, summary and body_markdown, ordered like /projects
// (featured first, then sort_order, then id) instead of by title match.
const SEARCH_PROJECT_SQL = `
  SELECT t.project_id, t.lang, t.slug, t.title, t.summary, p.thumbnail
  FROM project_translations t
  JOIN projects p ON p.id = t.project_id
  WHERE t.status = 'published'
    AND (t.lang = $lang OR NOT EXISTS (
          SELECT 1 FROM project_translations x
          WHERE x.project_id = t.project_id AND x.lang = $lang AND x.status = 'published'))
    AND EXISTS (
          SELECT 1 FROM project_translations m
          WHERE m.project_id = t.project_id AND m.status = 'published'
            AND (m.title LIKE $q ESCAPE '!' OR m.summary LIKE $q ESCAPE '!' OR m.body_markdown LIKE $q ESCAPE '!'))
  ORDER BY p.featured DESC, p.sort_order, p.id
  LIMIT 10`;

async function loadSettings(lang) {
  const rows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

// ?page=N from spec 2.1. Anything but a whole number from 1 up gives null, and the route answers 404.
// isSafeInteger, not isInteger: 1e300 is an integer to JavaScript, but SQLite rejects it as OFFSET.
function pageNumber(req) {
  const page = Number(req.query.page || 1);
  return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

// comment form เล็กมาก (ข้อความ <=2000 ตัวอักษร + honeypot + csrf token) 20kb เผื่อเหลือเฟือแล้ว
router.use(express.urlencoded({ extended: true, limit: '20kb' }));

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  // spec 4.2: only the public router sets these three. Admin pages, the post/project preview route and the
  // generic 404/500 handler never run this middleware, so partials/consent.ejs and the analytics <script> tag
  // in partials/head.ejs stay off there with no extra locals to remember to set.
  res.locals.publicPage = true;
  res.locals.consent = req.cookies.consent;
  res.locals.gaId = process.env.GA_MEASUREMENT_ID || '';
  next();
});

router.get('/', async (req, res) => {
  const { lang, settings } = res.locals;
  const featured = await all(PROJECT_LIST_SQL, [1, lang, lang]);
  const posts = await all(LIST_SQL, [lang, lang, 5, 0]);
  res.render('home', {
    featured,
    posts,
    meta: {
      description: settings.tagline,
      canonical: '/' + lang,
      alternates: [
        { lang: 'th', href: '/th' },
        { lang: 'en', href: '/en' }
      ],
      type: 'website'
    }
  });
});

router.get('/blog', async (req, res, next) => {
  const { lang, t } = res.locals;
  const page = pageNumber(req);
  if (!page) return next();
  const rows = await all(LIST_SQL, [lang, lang, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  if (page > 1 && rows.length === 0) return next();
  const query = page > 1 ? '?page=' + page : '';
  res.render('blog', {
    posts: rows.slice(0, PAGE_SIZE),
    page,
    hasNext: rows.length > PAGE_SIZE,
    tag: null,
    meta: {
      title: page > 1 ? t.navBlog + ' · ' + t.pageLabel + ' ' + page : t.navBlog,
      canonical: '/' + lang + '/blog' + query,
      alternates: [
        { lang: 'th', href: '/th/blog' + query },
        { lang: 'en', href: '/en/blog' + query }
      ],
      type: 'website'
    }
  });
});

async function loadPost(lang, slug) {
  const tr = await get(
    "SELECT * FROM post_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, slug]
  );
  if (!tr) return null;
  const post = await get('SELECT id, cover_image FROM posts WHERE id = ?', [tr.post_id]);
  const siblings = await all(
    "SELECT lang, slug FROM post_translations WHERE post_id = ? AND status = 'published' ORDER BY lang DESC",
    [tr.post_id]
  );
  const tagRows = await all(
    `SELECT tg.slug, tg.name_th, tg.name_en
     FROM post_tags pt JOIN tags tg ON tg.id = pt.tag_id
     WHERE pt.post_id = ? ORDER BY tg.slug`,
    [tr.post_id]
  );
  const tags = tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en }));
  // hreflang only when both languages are published (spec 2.2)
  const alternates = siblings.length === 2
    ? siblings.map(s => ({ lang: s.lang, href: '/' + s.lang + '/blog/' + s.slug }))
    : [];
  return { post, tr, tags, alternates };
}

function postMeta(lang, tr, post, alternates) {
  return {
    title: tr.seo_title || tr.title,
    description: tr.seo_description || tr.excerpt,
    canonical: '/' + lang + '/blog/' + tr.slug,
    alternates,
    image: post.cover_image,
    type: 'article'
  };
}

// column เป็นค่าคงที่จากโค้ดเราเอง ('post_id'/'project_id') ไม่ใช่ข้อมูลจาก request จึงไม่ใช่ SQL injection
async function loadComments(column, id) {
  return all(`SELECT author_name, body, created_at FROM comments WHERE ${column} = ? ORDER BY created_at ASC`, [id]);
}

router.get('/blog/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const ctx = await loadPost(lang, req.params.slug);
  if (!ctx) return next();
  // ensureCommentIdentity runs only after we know the post exists, so a 404 never sets ta_nick/ta_csrf
  commentCookies.ensureCommentIdentity(req, res);
  const comments = await loadComments('post_id', ctx.post.id);
  res.render('post', {
    ...ctx,
    comments,
    preview: false,
    meta: postMeta(lang, ctx.tr, ctx.post, ctx.alternates)
  });
});

router.post('/blog/:slug/comments', async (req, res, next) => {
  const { lang, t } = res.locals;
  const ctx = await loadPost(lang, req.params.slug);
  if (!ctx) return next();
  // ensureCommentIdentity runs only after we know the post exists, so a 404 never sets ta_nick/ta_csrf
  commentCookies.ensureCommentIdentity(req, res);
  const result = await submitComment(req, res, 'post_id', ctx.post.id);
  if (result.status === 'invalid') {
    const comments = await loadComments('post_id', ctx.post.id);
    return res.status(400).render('post', {
      ...ctx,
      comments,
      preview: false,
      commentError: t[result.key],
      commentValue: (req.body || {}).body,
      meta: postMeta(lang, ctx.tr, ctx.post, ctx.alternates)
    });
  }
  res.redirect(303, '/' + lang + '/blog/' + ctx.tr.slug + '#comments');
});

router.get('/projects', async (req, res) => {
  const { lang, t } = res.locals;
  const projects = await all(PROJECT_LIST_SQL, [0, lang, lang]);
  res.render('projects', {
    projects,
    meta: {
      title: t.navProjects,
      canonical: '/' + lang + '/projects',
      alternates: [
        { lang: 'th', href: '/th/projects' },
        { lang: 'en', href: '/en/projects' }
      ],
      type: 'website'
    }
  });
});

async function loadProject(lang, slug) {
  const tr = await get(
    "SELECT * FROM project_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, slug]
  );
  if (!tr) return null;
  const project = await get('SELECT id, thumbnail, repo_url, demo_url FROM projects WHERE id = ?', [tr.project_id]);
  // filtered independently of the admin form's own validation, in case a row was written straight into SQLite
  project.repo_url = link(project.repo_url);
  project.demo_url = link(project.demo_url);
  const siblings = await all(
    "SELECT lang, slug FROM project_translations WHERE project_id = ? AND status = 'published' ORDER BY lang DESC",
    [tr.project_id]
  );
  const tagRows = await all(
    `SELECT tg.slug, tg.name_th, tg.name_en
     FROM project_tags pt JOIN tags tg ON tg.id = pt.tag_id
     WHERE pt.project_id = ? ORDER BY tg.slug`,
    [tr.project_id]
  );
  const tags = tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en }));
  // hreflang only when both languages are published, the same rule as posts (spec 2.2)
  const alternates = siblings.length === 2
    ? siblings.map(s => ({ lang: s.lang, href: '/' + s.lang + '/projects/' + s.slug }))
    : [];
  return { project, tr, tags, alternates };
}

function projectMeta(lang, tr, project, alternates) {
  return {
    title: tr.title,
    description: tr.summary,
    canonical: '/' + lang + '/projects/' + tr.slug,
    alternates,
    image: project.thumbnail,
    type: 'website'
  };
}

router.get('/projects/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const ctx = await loadProject(lang, req.params.slug);
  if (!ctx) return next();
  // ensureCommentIdentity runs only after we know the project exists, so a 404 never sets ta_nick/ta_csrf
  commentCookies.ensureCommentIdentity(req, res);
  const comments = await loadComments('project_id', ctx.project.id);
  res.render('project', {
    ...ctx,
    comments,
    meta: projectMeta(lang, ctx.tr, ctx.project, ctx.alternates)
  });
});

router.post('/projects/:slug/comments', async (req, res, next) => {
  const { lang, t } = res.locals;
  const ctx = await loadProject(lang, req.params.slug);
  if (!ctx) return next();
  // ensureCommentIdentity runs only after we know the project exists, so a 404 never sets ta_nick/ta_csrf
  commentCookies.ensureCommentIdentity(req, res);
  const result = await submitComment(req, res, 'project_id', ctx.project.id);
  if (result.status === 'invalid') {
    const comments = await loadComments('project_id', ctx.project.id);
    return res.status(400).render('project', {
      ...ctx,
      comments,
      preview: false,
      commentError: t[result.key],
      commentValue: (req.body || {}).body,
      meta: projectMeta(lang, ctx.tr, ctx.project, ctx.alternates)
    });
  }
  res.redirect(303, '/' + lang + '/projects/' + ctx.tr.slug + '#comments');
});

// Posts with one tag (spec 2.1). The tag is looked up first: an unknown slug is a 404, and a tag without a
// published post is an empty list. Pagination, canonical and hreflang follow GET /blog.
router.get('/tags/:slug', async (req, res, next) => {
  const { lang, t } = res.locals;
  const row = await get('SELECT id, slug, name_th, name_en FROM tags WHERE slug = ?', [req.params.slug]);
  if (!row) return next();
  const page = pageNumber(req);
  if (!page) return next();
  const rows = await all(TAG_LIST_SQL, [row.id, lang, lang, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  if (page > 1 && rows.length === 0) return next();
  const tag = { slug: row.slug, name: lang === 'th' ? row.name_th : row.name_en };
  const title = t.tagTitle + ' ' + tag.name;
  const query = page > 1 ? '?page=' + page : '';
  res.render('blog', {
    posts: rows.slice(0, PAGE_SIZE),
    page,
    hasNext: rows.length > PAGE_SIZE,
    tag,
    meta: {
      title: page > 1 ? title + ' · ' + t.pageLabel + ' ' + page : title,
      canonical: '/' + lang + '/tags/' + tag.slug + query,
      alternates: [
        { lang: 'th', href: '/th/tags/' + tag.slug + query },
        { lang: 'en', href: '/en/tags/' + tag.slug + query }
      ],
      type: 'website'
    }
  });
});

// About (spec 2.1): about_body falls back to the other language when the current one is empty, and the
// wrapper gets a lang attribute only then, the same convention as the foreign card in post-card.ejs.
router.get('/about', async (req, res) => {
  const { lang, other, t } = res.locals;
  const rows = await all("SELECT lang, value FROM settings WHERE key = 'about_body' AND lang IN ('th', 'en')");
  const byLang = {};
  for (const row of rows) byLang[row.lang] = row.value;
  const aboutLang = byLang[lang] ? lang : (byLang[other] ? other : lang);
  res.render('about', {
    aboutLang,
    aboutBody: byLang[aboutLang] || '',
    meta: {
      title: t.navAbout,
      canonical: '/' + lang + '/about',
      alternates: [
        { lang: 'th', href: '/th/about' },
        { lang: 'en', href: '/en/about' }
      ],
      type: 'website'
    }
  });
});

router.post('/reroll-nickname', (req, res) => {
  if (commentCookies.checkCsrf(req)) commentCookies.clearNickname(res);
  res.redirect(303, safeReferer(req, res.locals.lang));
});

// Search (spec 4.1): q is trimmed and cut to 100 characters. Under 2 characters left, the form is shown with a
// hint and no query runs at all - noindex is still set, and there is no canonical or hreflang on this page.
router.get('/search', async (req, res) => {
  const { t } = res.locals;
  const q = String(req.query.q || '').trim().slice(0, 100);
  const tooShort = q.length < 2;
  let projects = [];
  let posts = [];
  if (!tooShort) {
    const params = { $lang: res.locals.lang, $q: like(q) };
    projects = await all(SEARCH_PROJECT_SQL, params);
    posts = await all(SEARCH_POST_SQL, params);
  }
  res.render('search', {
    q,
    tooShort,
    projects,
    posts,
    meta: { title: t.navSearch, noindex: true }
  });
});

// Privacy (spec 4.2). privacy_body is markdown the owner writes in admin settings, one row per language with
// no cross-language fallback (unlike about_body) - the settings page just shows what is there for the current
// language. The cookie table itself lives in strings.js so both languages stay in sync automatically.
router.get('/privacy', async (req, res) => {
  const { lang, t } = res.locals;
  const row = await get("SELECT value FROM settings WHERE key = 'privacy_body' AND lang = ?", [lang]);
  res.render('privacy', {
    privacyBody: row ? row.value : '',
    meta: {
      title: t.navPrivacy,
      canonical: '/' + lang + '/privacy',
      alternates: [
        { lang: 'th', href: '/th/privacy' },
        { lang: 'en', href: '/en/privacy' }
      ],
      type: 'website'
    }
  });
});

module.exports = router;
