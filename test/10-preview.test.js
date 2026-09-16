const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get } = require('./helpers');
const strings = require('../src/strings');

test('10 preview', async () => {
  const h = await start();
  try {
    const counts = async () => ({
      posts: (await get('SELECT COUNT(*) AS n FROM posts')).n,
      translations: (await get('SELECT COUNT(*) AS n FROM post_translations')).n,
      postTags: (await get('SELECT COUNT(*) AS n FROM post_tags')).n
    });
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    const bar = '<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>';
    const { lastID: tagId } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')");
    await run("INSERT INTO settings (key, lang, value) VALUES ('site_name', '*', 'Dev Notes')");
    const newPost = {
      cover_image: '/uploads/cover.png',
      tags: String(tagId),
      th: {
        ...blank,
        status: 'draft',
        title: 'ลองใช้ <Docker> ครั้งแรก',
        excerpt: 'เกริ่นนำของตัวอย่าง',
        body_markdown: '```js\nconst x = 1;\n```\n',
        cover_image_alt: 'ภาพปกภาษาไทย'
      },
      en: { ...blank, status: 'none' }
    };

    // the preview route sits behind the admin guard like everything else under /admin
    let r = await h.req('/admin/posts/preview/th', { method: 'POST', form: newPost });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    await h.login();

    // the preview buttons of the editor post the whole form to this route in a new tab
    r = await h.req('/admin/posts/new');
    assert.ok(r.text.includes('formaction="/admin/posts/preview/th" formtarget="_blank"'), r.text);
    assert.ok(r.text.includes('formaction="/admin/posts/preview/en" formtarget="_blank"'), r.text);

    // spec test 10, case 1: a Thai post that was never saved, with a js fence
    const before = await counts();
    r = await h.req('/admin/posts/preview/th', { method: 'POST', form: newPost });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('<h1>ลองใช้ &lt;Docker&gt; ครั้งแรก</h1>'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.deepEqual(await counts(), before);
    // the same page as the public one, with settings, the cover and its alt, tag chips in the page language and the bar on top
    assert.ok(r.text.includes(bar), r.text);
    assert.ok(r.text.includes('<link rel="stylesheet" href="/css/admin.css?v='), r.text);
    assert.ok(r.text.includes('<title>ลองใช้ &lt;Docker&gt; ครั้งแรก | Dev Notes</title>'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="ภาพปกภาษาไทย">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/containers">คอนเทนเนอร์</a>'), r.text);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(!r.text.includes('rel="canonical"'), r.text);
    // the form carries no published_at, so the preview shows no date
    assert.ok(!r.text.includes('<time'), r.text);

    // spec test 10, case 2: previewing a new title of a published post changes nothing on the public page
    const id = await insertPost({ th: { slug: 'live-post', title: 'ชื่อที่เผยแพร่อยู่', body_markdown: 'เนื้อหาที่เผยแพร่อยู่' } });
    const saved = await get('SELECT * FROM post_translations WHERE post_id = ?', [id]);
    const afterInsert = await counts();
    r = await h.req('/admin/posts/preview/th', {
      method: 'POST',
      form: {
        cover_image: '',
        th: { ...blank, status: 'published', slug: 'live-post', title: 'ชื่อใหม่ที่ยังไม่บันทึก', body_markdown: 'เนื้อหาใหม่' },
        en: { ...blank, status: 'none' }
      }
    });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>ชื่อใหม่ที่ยังไม่บันทึก</h1>'), r.text);
    r = await h.req('/th/blog/live-post');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>ชื่อที่เผยแพร่อยู่</h1>'), r.text);
    assert.ok(!r.text.includes('ชื่อใหม่ที่ยังไม่บันทึก'), r.text);
    assert.ok(!r.text.includes('preview-bar'), r.text);
    assert.ok(!r.text.includes('/css/admin.css'), r.text);
    assert.deepEqual(await get('SELECT * FROM post_translations WHERE post_id = ?', [id]), saved);
    assert.deepEqual(await counts(), afterInsert);

    // spec test 10, case 3: the English preview is an English page, and only the admin bar stays Thai
    r = await h.req('/admin/posts/preview/en', {
      method: 'POST',
      form: {
        cover_image: '',
        tags: String(tagId),
        th: newPost.th,
        en: { ...blank, status: 'draft', title: 'First look at Docker', body_markdown: 'Hello **world**', seo_title: 'Docker SEO title' }
      }
    });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<h1>First look at Docker</h1>'), r.text);
    assert.ok(r.text.includes('<strong>world</strong>'), r.text);
    assert.ok(r.text.includes('<title>Docker SEO title | Dev Notes</title>'), r.text);
    assert.ok(r.text.includes('<meta property="og:locale" content="en_US">'), r.text);
    assert.ok(r.text.includes(strings.en.backToBlog), r.text);
    assert.ok(!r.text.includes(strings.th.backToBlog), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/en/tags/containers">Containers</a>'), r.text);
    assert.ok(r.text.includes(bar), r.text);
    assert.ok(!r.text.includes('ลองใช้'), r.text);

    // :lang is th or en only
    for (const urlPath of ['/admin/posts/preview/fr', '/admin/posts/preview/TH', '/admin/posts/preview']) {
      r = await h.req(urlPath, { method: 'POST', form: newPost });
      assert.equal(r.status, 404, urlPath);
    }
    assert.deepEqual(await counts(), afterInsert);
  } finally {
    await h.stop();
  }
});
