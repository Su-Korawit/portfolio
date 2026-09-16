const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const md = require('./markdown');
const strings = require('./strings');
const { UPLOAD_DIR } = require('./db');
const publicRouter = require('./routes/public');
const adminRouter = require('./routes/admin');

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

app.use(cookieParser(process.env.SESSION_SECRET));

app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language, Cookie');
  const pref = ['th', 'en'].includes(req.cookies.lang) ? req.cookies.lang : null;
  res.redirect(302, '/' + (pref || req.acceptsLanguages('th', 'en') || 'th'));
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));

// Uploaded images (spec 2.1). A name is random and never reused, so the file can be cached for a year as immutable,
// and nosniff stops a browser from reading a file as any type other than the one its extension gives.
app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  maxAge: '365d',
  immutable: true,
  setHeaders: res => res.set('X-Content-Type-Options', 'nosniff')
}));

for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    // Remembers the language last read (spec 4.2), used by GET / above. Only (re)written when the value would
    // actually change, so most responses carry no Set-Cookie at all.
    if (req.cookies.lang !== lang) {
      res.cookie('lang', lang, {
        maxAge: 365 * 864e5,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
    }
    next();
  }, publicRouter);
}

app.use('/admin', adminRouter);

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
