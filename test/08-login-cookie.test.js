const test = require('node:test');
const assert = require('node:assert/strict');
const { start, signCookie, get } = require('./helpers');

test('08 login cookie', async () => {
  const h = await start();
  try {
    const asCookie = value => 'ta_admin=' + encodeURIComponent(value);

    let r = await h.login('wrong');
    assert.equal(r.status, 401);
    assert.deepEqual(r.setCookie, []);
    assert.ok(r.text.includes('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'), r.text);

    r = await h.login();
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts');
    assert.equal(r.setCookie.length, 1);
    const setCookie = r.setCookie[0];
    assert.ok(setCookie.startsWith('ta_admin=s%3A'), setCookie);
    assert.match(setCookie, /; HttpOnly(;|$)/);
    assert.match(setCookie, /; SameSite=Lax(;|$)/);
    assert.match(setCookie, /; Path=\/admin(;|$)/);
    assert.match(setCookie, /; Max-Age=2592000(;|$)/);
    assert.doesNotMatch(setCookie, /Secure/);

    // the value is "expiry:epoch" signed by cookie-parser, and the expiry is 30 days from now
    const issued = setCookie.split(';')[0];
    const value = decodeURIComponent(issued.slice('ta_admin='.length));
    assert.match(value, /^s:\d+:0\.[A-Za-z0-9+/]+$/);
    const exp = Number(value.slice(2, value.indexOf(':', 2)));
    assert.ok(Math.abs(exp - (Date.now() + 30 * 864e5)) < 60000, String(exp));

    r = await h.req('/admin/posts');
    assert.equal(r.status, 200);
    assert.ok(r.setCookie.some(c => c.startsWith('ta_admin=s%3A')), 'sliding renewal');

    // signCookie matches cookie-parser, so a self-signed cookie that has not expired is accepted
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(signCookie(Date.now() + 60000 + ':0')) });
    assert.equal(r.status, 200);

    // correctly signed "expiry:epoch" whose expiry has passed
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(signCookie(Date.now() - 1000 + ':0')) });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    // tampered: a later expiry with the original signature
    const tampered = value.replace(/^s:\d+/, 's:' + (exp + 864e5));
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(tampered) });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    r = await h.req('/admin/sessions/revoke', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    assert.match(r.setCookie.at(-1), /^ta_admin=.*; Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'session_epoch' AND lang = '*'"), { value: '1' });

    // the cookie issued before revoke no longer works
    r = await h.req('/admin/posts', { jar: false, cookie: issued });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    r = await h.login();
    assert.equal(r.status, 303);
    assert.match(decodeURIComponent(r.setCookie[0]), /^ta_admin=s:\d+:1\./);
    r = await h.req('/admin/posts');
    assert.equal(r.status, 200);

    // logout clears the cookie from the jar, so the next request goes back to the login page
    r = await h.req('/admin/logout', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/posts');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
