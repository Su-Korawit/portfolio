const path = require('node:path');
const express = require('express');
const md = require('./markdown');
const strings = require('./strings');
const publicRouter = require('./routes/public');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

const dateFormats = {
  th: new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }),
  en: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })
};

app.locals.v = Date.now().toString(36);
app.locals.md = md;
app.locals.siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');
app.locals.formatDate = (lang, iso) => dateFormats[lang === 'en' ? 'en' : 'th'].format(new Date(iso));

app.use((req, res, next) => {
  res.locals.lang = 'th';
  res.locals.other = 'en';
  res.locals.t = strings.th;
  res.locals.settings = {};
  res.locals.meta = {};
  next();
});

app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language');
  res.redirect(302, '/' + (req.acceptsLanguages('th', 'en') || 'th'));
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));

for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    next();
  }, publicRouter);
}

app.use((req, res) => {
  res.status(404).render('error', { status: 404 });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).render('error', { status });
});

module.exports = app;
