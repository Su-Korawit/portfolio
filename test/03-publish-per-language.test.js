const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run } = require('./helpers');
const strings = require('../src/strings');

test('03 publish per language', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const { lastID: tagId } = await run(
      "INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')"
    );
    const id = await insertPost({
      cover_image: '/uploads/cover.png',
      tags: [tagId],
      th: {
        slug: 'x',
        title: 'บทความไทย X',
        excerpt: 'เกริ่นนำภาษาไทย',
        body_markdown: '```js\nconst x = 1;\n```\n',
        cover_image_alt: 'ภาพปกภาษาไทย',
        published_at: '2026-09-12T20:30:00.000Z'
      },
      en: { status: 'draft', slug: 'x', title: 'EN DRAFT', cover_image_alt: 'English cover' }
    });
    await insertPost({ en: { slug: 'en-only', title: 'English only post', published_at: '2026-09-01T00:00:00.000Z' } });

    // /en/blog shows the published Thai translation as a Thai card and never the English draft
    let r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('EN DRAFT'), r.text);
    let card = cards(r.text).find(c => c.includes('บทความไทย X'));
    assert.ok(card, r.text);
    assert.ok(card.startsWith('<article class="card" lang="th">'), card);
    assert.ok(card.includes('href="/th/blog/x"'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);
    assert.ok(card.includes('<time datetime="2026-09-12T20:30:00.000Z">Sep 13, 2026</time>'), card);
    assert.ok(card.includes('<img class="card-thumb" src="/uploads/cover.png" alt="" loading="lazy">'), card);

    // the other direction: an English-only post is an English card with a badge on /th/blog
    r = await h.req('/th/blog');
    card = cards(r.text).find(c => c.includes('English only post'));
    assert.ok(card && card.startsWith('<article class="card" lang="en">'), r.text);
    assert.ok(card.includes('href="/en/blog/en-only"'), card);
    assert.ok(card.includes(strings.th.badgeOtherLang), card);
    assert.equal((await h.req('/th/blog/en-only')).status, 404);

    r = await h.req('/en/blog/x');
    assert.equal(r.status, 404);
    assert.ok(r.text.includes('href="/en/blog"'), r.text);

    r = await h.req('/th/blog/x');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>บทความไทย X</h1>'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.ok(r.text.includes('<time datetime="2026-09-12T20:30:00.000Z">13 ก.ย. 2569</time>'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="ภาพปกภาษาไทย">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/containers">คอนเทนเนอร์</a>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog/x">'), r.text);
    assert.ok(r.text.includes('<meta property="og:image" content="http://test.local/uploads/cover.png">'), r.text);
    assert.ok(r.text.includes('<meta property="og:type" content="article">'), r.text);
    // the header switch link always has hreflang, so the check is on <link rel="alternate">
    assert.ok(!r.text.includes('rel="alternate" hreflang="en"'), r.text);
    assert.ok(!r.text.includes('rel="alternate" hreflang="th"'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog" lang="en" hreflang="en"'), r.text);

    // once English is published, /en/blog uses the English card and both detail pages point at each other
    await run(
      "UPDATE post_translations SET status = 'published', title = 'EN PUBLISHED', published_at = ? WHERE post_id = ? AND lang = 'en'",
      ['2026-09-13T08:00:00.000Z', id]
    );
    r = await h.req('/en/blog');
    card = cards(r.text).find(c => c.includes('href="/en/blog/x"'));
    assert.ok(card && card.startsWith('<article class="card">'), r.text);
    assert.ok(card.includes('EN PUBLISHED'), card);
    assert.ok(!r.text.includes('บทความไทย X'), r.text);

    r = await h.req('/en/blog/x');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="English cover">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/en/tags/containers">Containers</a>'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="th" href="http://test.local/th/blog/x">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog/x">'), r.text);

    r = await h.req('/th/blog/x');
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog/x">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog/x" lang="en" hreflang="en"'), r.text);
  } finally {
    await h.stop();
  }
});
