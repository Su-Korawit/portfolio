const express = require('express');
const { get, all } = require('../db');

const router = express.Router();

const PAGE_SIZE = 10;

// Fallback list query from spec 2.1. Each post appears once: in the page language when that
// translation is published, otherwise as the published translation in the other language.
// post_id breaks ties, so two posts with the same published_at never swap places between pages.
const LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.body_markdown, t.published_at, p.cover_image
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
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.body_markdown, t.published_at, p.cover_image
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

// Same idea for the about portrait's src, which is either a local '/uploads/<name>' or an absolute R2 URL.
// Kept in step with IMAGE_PATTERN in admin.js, which filters the same value on the way in.
const IMAGE_PATTERN = /^(https?:\/\/\S+|\/[^\s/]\S*)$/i;
const image = url => (url && IMAGE_PATTERN.test(url) ? url : '');

// The text blocks of /about that exist in both languages. about_image, about_photo and about_colors are one
// value for the whole site, so they stay in settings (lang '*') and are read from res.locals.settings.
const ABOUT_LANG_KEYS = [
  'about_body', 'about_image_alt', 'about_name', 'about_facts', 'about_quote', 'about_photo_caption', 'about_contact'
];

// The swatch row. Each colour ends up in a style attribute, so only a plain hex literal is kept - anything
// else in the field is dropped rather than escaped, and the row is capped so a long paste cannot fill the page.
const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const colors = value => String(value || '').split(/[\s,]+/).filter(c => HEX_PATTERN.test(c)).slice(0, 8);

// The facts box and the contact block are textareas the owner writes one item per line.
const linesOf = ({ value, lang }) => ({ lang, items: value.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8) });

// Same fallback as LIST_SQL, but the EXISTS clause matches the search term against every published
// translation of the post, not just the one being displayed - so a term that exists only in the Thai body
// still finds the post when searching from /en, shown as its own English card. Title matches sort first.
const SEARCH_POST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.body_markdown, t.published_at, p.cover_image
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
  // spec 4.2: only the public router sets these three. Admin pages, the post/project preview route and the
  // generic 404/500 handler never run this middleware, so partials/consent.ejs and the analytics <script> tag
  // in partials/head.ejs stay off there with no extra locals to remember to set.
  res.locals.publicPage = true;
  res.locals.consent = req.cookies.consent;
  res.locals.gaId = process.env.GA_MEASUREMENT_ID || '';
  next();
});

// Home, and the search form that used to live on its own page (spec 4.1). q is trimmed and cut to 100
// characters; under 2 characters left nothing is queried, so a bare "/" - and a stray one-character q -
// still gets the usual featured and latest sections, with a hint under the form.
router.get('/', async (req, res) => {
  const { lang, t, settings } = res.locals;
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length >= 2) {
    const params = { $lang: lang, $q: like(q) };
    // Results replace the featured and latest sections. noindex, and no canonical or hreflang, keeps a result
    // page out of search engines while "/" itself stays indexed.
    return res.render('home', {
      q,
      searching: true,
      tooShort: false,
      featured: [],
      posts: [],
      foundProjects: await all(SEARCH_PROJECT_SQL, params),
      foundPosts: await all(SEARCH_POST_SQL, params),
      meta: { title: t.searchTitle, noindex: true }
    });
  }
  const featured = await all(PROJECT_LIST_SQL, [1, lang, lang]);
  const posts = await all(LIST_SQL, [lang, lang, 5, 0]);
  res.render('home', {
    q,
    searching: false,
    tooShort: q.length > 0,
    featured,
    posts,
    foundProjects: [],
    foundPosts: [],
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

// About (spec 2.1). Every block of the page is a setting the owner fills in, and every one of them is
// optional: a block with nothing in it is left out rather than shown empty. Each piece of text falls back to
// the other language on its own, so a half-translated page shows the reader as much of their own language as
// exists, and pick() reports which language won so the template can mark the odd one out with lang=.
router.get('/about', async (req, res) => {
  const { lang, other, t, settings } = res.locals;
  const rows = await all(
    `SELECT key, lang, value FROM settings
     WHERE key IN (${ABOUT_LANG_KEYS.map(() => '?').join(', ')}) AND lang IN ('th', 'en')`,
    ABOUT_LANG_KEYS
  );
  const byKey = {};
  for (const row of rows) (byKey[row.key] ||= {})[row.lang] = row.value;
  // { value, lang }: the reader's language when it has something, otherwise the other one. lang is what the
  // template compares against res.locals.lang to decide whether the block needs a lang attribute.
  const pick = key => {
    const values = byKey[key] || {};
    const from = values[lang] ? lang : (values[other] ? other : lang);
    return { value: values[from] || '', lang: from };
  };
  const body = pick('about_body');
  res.render('about', {
    // aboutLang/aboutBody keep the names the body has always had, since the prose block still reads them
    aboutLang: body.lang,
    aboutBody: body.value,
    // the images are filtered independently of the settings form's own filtering, the same reason as
    // repo_url/demo_url above: a row written straight into SQLite could otherwise put any scheme in an src
    aboutImage: image(settings.about_image),
    aboutPhoto: image(settings.about_photo),
    aboutColors: colors(settings.about_colors),
    name: pick('about_name'),
    quote: pick('about_quote'),
    photoCaption: pick('about_photo_caption'),
    facts: linesOf(pick('about_facts')),
    contact: linesOf(pick('about_contact')),
    imageAlt: pick('about_image_alt'),
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

// The search form and its results moved onto the home page, so /search only redirects old links there,
// keeping q. 301 rather than 302: the page is gone for good and a client may stop asking for it.
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  res.redirect(301, '/' + res.locals.lang + (q ? '?q=' + encodeURIComponent(q) : ''));
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
