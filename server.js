// Required so a missing one fails loudly at startup with a clear, named message, instead of surfacing later as
// an opaque generic 500 (SESSION_SECRET/ADMIN_USERNAME/ADMIN_PASSWORD_HASH) or, worse, failing open with silently
// broken canonical/og:url/og:image meta tags (SITE_URL).
for (const name of ['SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'SITE_URL']) {
  if (!process.env[name]) {
    console.error(name + ' must be set in .env before starting the server.');
    process.exit(1);
  }
}

const app = require('./src/app');
const { ready } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

ready.then(() => {
  app.listen(port, err => {
    if (err) throw err;
    console.log('Listening on http://localhost:' + port);
  });
});
