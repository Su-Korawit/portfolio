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
  const posts = await all(LIST_SQL, [lang, lang, 5, 0]);
  res.render('home', {
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

module.exports = router;
