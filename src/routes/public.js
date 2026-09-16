const express = require('express');
const { get, all } = require('../db');

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

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
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

router.get('/blog/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const tr = await get(
    "SELECT * FROM post_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, req.params.slug]
  );
  if (!tr) return next();
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
  res.render('post', {
    post,
    tr,
    tags,
    alternates,
    preview: false,
    meta: {
      title: tr.seo_title || tr.title,
      description: tr.seo_description || tr.excerpt,
      canonical: '/' + lang + '/blog/' + tr.slug,
      alternates,
      image: post.cover_image,
      type: 'article'
    }
  });
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

router.get('/projects/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const tr = await get(
    "SELECT * FROM project_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, req.params.slug]
  );
  if (!tr) return next();
  const project = await get('SELECT id, thumbnail, repo_url, demo_url FROM projects WHERE id = ?', [tr.project_id]);
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
  res.render('project', {
    project,
    tr,
    tags,
    meta: {
      title: tr.title,
      description: tr.summary,
      canonical: '/' + lang + '/projects/' + tr.slug,
      alternates,
      image: project.thumbnail,
      type: 'website'
    }
  });
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

module.exports = router;
