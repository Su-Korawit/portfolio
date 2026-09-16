const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

test('16 lang cookie', async () => {
  const h = await start();
  try {
    // spec test 16, part 1: GET /en/blog with no cookie sets a lang=en cookie, HttpOnly
    let r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    const langSet = r.setCookie.find(line => line.startsWith('lang=en'));
    assert.ok(langSet, r.setCookie.join(' | '));
    assert.match(langSet, /HttpOnly/i);
    assert.match(langSet, /SameSite=Lax/i);
    assert.match(langSet, /Path=\//);
    assert.ok(!/Secure/i.test(langSet), langSet); // NODE_ENV is 'test' here, not 'production'

    // spec test 16, part 2: the client jar now carries Cookie: lang=en from the response above.
    // Accept-Language says th, but the cookie wins (spec 2.2), and Vary carries both headers
    r = await h.req('/', { headers: { 'Accept-Language': 'th' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');
    assert.match(r.headers.get('vary'), /Accept-Language/);
    assert.match(r.headers.get('vary'), /Cookie/);

    // spec test 16, part 3: the cookie already matches the page language, so nothing is re-sent
    r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    assert.ok(!r.setCookie.some(line => line.startsWith('lang=')), r.setCookie.join(' | '));

    // visiting the other language re-sets the cookie to that language
    r = await h.req('/th/blog');
    assert.equal(r.status, 200);
    const langSetTh = r.setCookie.find(line => line.startsWith('lang=th'));
    assert.ok(langSetTh, r.setCookie.join(' | '));

    // an unrecognised cookie value is ignored and Accept-Language decides instead (spec 2.2)
    r = await h.req('/', { jar: false, cookie: 'lang=fr', headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');
  } finally {
    await h.stop();
  }
});
