const express = require('express');
const { all } = require('../db');

const router = express.Router();

async function loadSettings(lang) {
  const rows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  next();
});

router.get('/', (req, res) => {
  const { lang, settings } = res.locals;
  res.render('home', {
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

module.exports = router;
