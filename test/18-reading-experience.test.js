const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost } = require('./helpers');
const { readingMinutes } = require('../src/reading-time');
const md = require('../src/markdown');
const strings = require('../src/strings');

test('18 reading experience', async () => {
  const h = await start();
  try {
    // reading time: English by word, Thai by character, and never below one minute
    assert.equal(readingMinutes(''), 1);
    assert.equal(readingMinutes('two words'), 1);
    assert.equal(readingMinutes(Array(440).fill('word').join(' ')), 2);
    assert.equal(readingMinutes('ก'.repeat(660)), 2);
    // a fenced block is skipped: code is scanned, not read line by line
    assert.equal(readingMinutes('```js\n' + Array(500).fill('const x = 1;').join('\n') + '\n```'), 1);
    // markdown syntax, image and URL are not words the reader reads
    assert.equal(readingMinutes('## ' + Array(220).fill('word').join(' ') + '\n\n![alt](/uploads/a.png) https://example.com/a'), 1);

    // a paragraph holding one image alone becomes a captioned figure, and the caption is escaped like any text
    assert.equal(md.render('![แผนภาพ](/uploads/a.png)\n').trim(),
      '<figure><img src="/uploads/a.png" alt="แผนภาพ"><figcaption>แผนภาพ</figcaption></figure>');
    assert.equal(md.render('![](/uploads/a.png)\n').trim(), '<figure><img src="/uploads/a.png" alt=""></figure>');
    assert.ok(md.render('![<b>x</b>](/a.png)\n').includes('<figcaption>&lt;b&gt;x&lt;/b&gt;</figcaption>'));
    // an image inside a sentence stays where it is, in its paragraph
    assert.ok(md.render('ดูที่ ![alt](/a.png) นะ\n').startsWith('<p>'));

    const body = Array(440).fill('word').join(' ');
    await insertPost({
      cover_image: '/uploads/cover.png',
      th: { slug: 'read-th', title: 'บทความทดสอบ', excerpt: 'เกริ่นนำของบทความ', body_markdown: body,
            cover_image_alt: 'ภาพปก', published_at: '2026-09-12T20:30:00.000Z' }
    });

    // the card shows the date and the reading time of that post, in the language of the page
    let r = await h.req('/th/blog');
    assert.equal(r.status, 200);
    const card = (r.text.match(/<article class="card"[^]*?<\/article>/g) || [])[0];
    assert.ok(card.includes('<time datetime="2026-09-12T20:30:00.000Z">'), card);
    assert.ok(card.includes(strings.th.readTime.replace('{n}', 2)), card);

    // the post page: subtitle, byline with the site name, the same reading time, tags below the body
    r = await h.req('/th/blog/read-th');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<p class="post-subtitle">เกริ่นนำของบทความ</p>'), r.text);
    assert.ok(r.text.includes('<p class="byline-name">Portfolio</p>'), r.text);
    assert.ok(r.text.includes(strings.th.readTime.replace('{n}', 2)), r.text);
    // the cover alt doubles as the caption under the cover
    assert.ok(r.text.includes('<figcaption class="post-cover-caption">ภาพปก</figcaption>'), r.text);
    assert.ok(r.text.includes('<div class="reading-progress" aria-hidden="true"></div>'), r.text);

    // the English page shows the English wording of the same estimate
    await insertPost({ en: { slug: 'read-en', title: 'Read me', body_markdown: body, published_at: '2026-09-11T00:00:00.000Z' } });
    r = await h.req('/en/blog/read-en');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(strings.en.readTime.replace('{n}', 2)), r.text);

    // a post with no excerpt has no subtitle line at all
    assert.ok(!r.text.includes('class="post-subtitle"'), r.text);
  } finally {
    await h.stop();
  }
});
