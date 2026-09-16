const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');

test('07 admin guard', async () => {
  const h = await start();
  try {
    const countPosts = async () => (await get('SELECT COUNT(*) AS n FROM posts')).n;

    let r = await h.req('/admin/posts');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    const before = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: {
        cover_image: '',
        th: {
          status: 'published',
          title: 'บทความทดสอบ',
          slug: 'guard-test',
          excerpt: 'เกริ่นนำ',
          body_markdown: '# hello',
          cover_image_alt: '',
          seo_title: '',
          seo_description: ''
        },
        en: { status: 'none' }
      }
    });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.equal(await countPosts(), before);

    r = await h.req('/admin/login');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(r.text.includes('name="password"'), r.text);

    // everything declared after requireAdmin is guarded, including routes that later tasks add
    for (const [method, urlPath] of [
      ['GET', '/admin'],
      ['GET', '/admin/settings'],
      ['POST', '/admin/logout'],
      ['POST', '/admin/sessions/revoke']
    ]) {
      r = await h.req(urlPath, { method });
      assert.equal(r.status, 302, method + ' ' + urlPath);
      assert.equal(r.location, '/admin/login', method + ' ' + urlPath);
      assert.deepEqual(r.setCookie, [], method + ' ' + urlPath);
    }
    assert.equal(await get("SELECT value FROM settings WHERE key = 'session_epoch'"), undefined);

    // the guard reads signed cookies only, so an unsigned "expiry:epoch" value is rejected
    r = await h.req('/admin/posts', { cookie: 'ta_admin=' + encodeURIComponent(Date.now() + 60000 + ':0') });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
