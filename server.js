const app = require('./src/app');
const { ready } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

ready.then(() => {
  app.listen(port, err => {
    if (err) throw err;
    console.log('Listening on http://localhost:' + port);
  });
});
