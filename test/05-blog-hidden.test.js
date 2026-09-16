const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost } = require('./helpers');
const strings = require('../src/strings');

test('05 blog hidden', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);

    await insertPost({ th: { status: 'draft', slug: 'secret-draft', title: 'ร่างที่ยังไม่เผยแพร่' } });
    // a published post proves that these pages list posts at all, so the "not included" checks are not empty passes
    await insertPost({ th: { slug: 'visible', title: 'บทความที่เผยแพร่แล้ว', published_at: '2026-01-01T00:00:00.000Z' } });

    for (const urlPath of ['/th/blog', '/th', '/en/blog', '/en']) {
      const page = await h.req(urlPath);
      assert.equal(page.status, 200, urlPath);
      assert.ok(page.text.includes('บทความที่เผยแพร่แล้ว'), urlPath);
      assert.ok(!page.text.includes('ร่างที่ยังไม่เผยแพร่'), urlPath);
      assert.ok(!page.text.includes('secret-draft'), urlPath);
    }

    let r = await h.req('/th/blog/secret-draft');
    assert.equal(r.status, 404);

    // a broken percent escape in the slug gives the 400 error page, not a stack trace
    r = await h.req('/th/blog/%E0%');
    assert.equal(r.status, 400);
    assert.ok(!r.text.includes('node_modules'), r.text);
    assert.ok(r.text.includes(strings.th.errorBadRequestTitle), r.text);

    r = await h.req('/th/blog?page=abc');
    assert.equal(r.status, 404);
    // 1e300 passes Number.isInteger, but SQLite rejects that OFFSET with SQLITE_MISMATCH, so it must be a 404 and not a 500
    for (const page of ['0', '-1', '1.5', '1e300', '2']) {
      r = await h.req('/th/blog?page=' + page);
      assert.equal(r.status, 404, 'page=' + page);
    }

    // pagination: 12 published posts in total, 10 per page, newest first
    for (let i = 1; i <= 11; i++) {
      const day = String(i).padStart(2, '0');
      await insertPost({ th: { slug: 'p' + i, title: 'ลำดับ ' + i, published_at: '2026-02-' + day + 'T00:00:00.000Z' } });
    }

    r = await h.req('/th/blog');
    assert.deepEqual(hrefs(r.text), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(i => '/th/blog/p' + i));
    assert.ok(r.text.includes('<a class="pagination-older" href="/th/blog?page=2">'), r.text);
    assert.ok(!r.text.includes('pagination-newer'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog">'), r.text);

    r = await h.req('/th/blog?page=2');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/p1', '/th/blog/visible']);
    // the link back to page 1 is /th/blog without ?page=1
    assert.ok(r.text.includes('<a class="pagination-newer" href="/th/blog">'), r.text);
    assert.ok(!r.text.includes('pagination-older'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog?page=2">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog?page=2">'), r.text);
    // the language switch does not carry ?page
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog" lang="en" hreflang="en"'), r.text);
    assert.ok(!r.text.includes('ร่างที่ยังไม่เผยแพร่'), r.text);

    r = await h.req('/th/blog?page=3');
    assert.equal(r.status, 404);

    // the home page shows the 5 newest posts
    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), [11, 10, 9, 8, 7].map(i => '/th/blog/p' + i));
    assert.ok(r.text.includes('href="/th/blog">' + strings.th.allPosts + '</a>'), r.text);
  } finally {
    await h.stop();
  }
});
