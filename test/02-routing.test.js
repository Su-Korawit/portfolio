const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');
const strings = require('../src/strings');

test('02 routing', async () => {
  const h = await start();
  try {
    // fetch sends "Accept-Language: *" when no header is given, which means no preference
    let r = await h.req('/');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/th');
    assert.match(r.headers.get('vary'), /Accept-Language/);

    r = await h.req('/', { headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');

    r = await h.req('/th/nope');
    assert.equal(r.status, 404);

    r = await h.req('/nope');
    assert.equal(r.status, 404);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes(strings.th.errorNotFoundTitle), r.text);
    assert.ok(!r.text.includes('node_modules'), r.text);

    r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('href="/en" lang="en" hreflang="en"'), r.text);

    r = await h.req('/en');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('href="/th" lang="th" hreflang="th"'), r.text);

    assert.deepEqual(Object.keys(strings.en).sort(), Object.keys(strings.th).sort());
  } finally {
    await h.stop();
  }
});
