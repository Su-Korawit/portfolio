const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get, all } = require('./helpers');
const { toSlug, hasThai, resolveSlugs } = require('../src/slug');

test('09 editor validation', async () => {
  const h = await start();
  try {
    // src/slug.js follows the order in spec 2.3 and gives '' to a language that is none or has no usable slug
    assert.equal(toSlug('  Docker 101: Getting Started!  '), 'docker-101-getting-started');
    assert.equal(toSlug('เริ่มต้นใช้ Docker'), 'docker');
    assert.equal(toSlug('ภาษาไทยล้วน'), '');
    assert.equal(toSlug(undefined), '');
    assert.equal(hasThai('เริ่มต้นใช้ Docker'), true);
    assert.equal(hasThai('Docker 101'), false);
    assert.equal(hasThai(undefined), false);
    const none = { status: 'none', slug: '', title: '' };
    // 1. a typed slug wins and is normalized
    assert.deepEqual(resolveSlugs({ th: { status: 'draft', slug: 'My First Post', title: 'บทความแรก' }, en: none }), { th: 'my-first-post', en: '' });
    // 2. no typed slug and a title without Thai
    assert.deepEqual(resolveSlugs({ th: none, en: { status: 'published', slug: '', title: 'Hello, World' } }), { th: '', en: 'hello-world' });
    // 3. still empty: the slug of the other language, never a partial slug such as "docker" from a Thai title
    assert.deepEqual(
      resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: { status: 'draft', slug: 'docker-101', title: 'Docker' } }),
      { th: 'docker-101', en: 'docker-101' }
    );
    // 4. nothing usable, so the caller shows the error
    assert.deepEqual(resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: none }), { th: '', en: '' });
    // a language that is none does not lend its slug
    assert.deepEqual(
      resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: { ...none, slug: 'docker-101' } }),
      { th: '', en: '' }
    );
    // a Thai slug typed by hand strips to '' and falls through to the other language
    assert.deepEqual(
      resolveSlugs({ th: { status: 'published', slug: 'ด็อกเกอร์', title: 'Docker' }, en: { status: 'draft', slug: '', title: 'Docker Basics' } }),
      { th: 'docker-basics', en: 'docker-basics' }
    );

    const countPosts = async () => (await get('SELECT COUNT(*) AS n FROM posts')).n;
    const sections = html => html.split('<details').slice(1);
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    const body = '## ขั้นตอน\n\n```js\nconst tag = "<b>x</b>";\n```\n';
    const thai = { ...blank, status: 'published', title: 'เริ่มต้นใช้ Docker', excerpt: 'เกริ่นนำที่พิมพ์ไว้', body_markdown: body };
    // tag ids 1, 2 and 12: a single ticked "12" must stay tag 12 and never turn into tags 1 and 2
    await run("INSERT INTO tags (id, slug, name_th, name_en) VALUES (1, 'one', 'หนึ่ง', 'One'), (2, 'two', 'สอง', 'Two'), (12, 'twelve', 'สิบสอง', 'Twelve')");

    await h.login();

    // the empty editor: th starts as draft and open, en as none and closed
    let r = await h.req('/admin/posts/new');
    assert.equal(r.status, 200);
    let [th, en] = sections(r.text);
    assert.ok(th.startsWith(' class="translation" lang="th" open>'), th);
    assert.ok(en.startsWith(' class="translation" lang="en">'), en);
    assert.ok(th.includes('<option value="draft" selected>'), th);
    assert.ok(en.includes('<option value="none" selected>'), en);
    // the hyphen is escaped because browsers compile pattern= with the v flag
    assert.ok(th.includes('pattern="[a-z0-9\\-]*"'), th);
    // a new post has no saved translation, so choosing none asks nothing
    assert.ok(!r.text.includes('onchange='), r.text);

    // spec test 9, case 1: Thai title, empty slug, en none
    const before = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { cover_image: '/uploads/cover.png', tags: '12', th: thai, en: { ...blank, status: 'none' } }
    });
    assert.equal(r.status, 400);
    assert.equal(await countPosts(), before);
    assert.ok(r.text.includes('กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)'), r.text);
    // everything typed is still in the form, HTML-escaped
    assert.ok(r.text.includes('## ขั้นตอน'), r.text);
    assert.ok(r.text.includes('const tag = &#34;&lt;b&gt;x&lt;/b&gt;&#34;;'), r.text);
    assert.ok(!r.text.includes('<b>x</b>'), r.text);
    assert.ok(r.text.includes('value="เริ่มต้นใช้ Docker"'), r.text);
    assert.ok(r.text.includes('เกริ่นนำที่พิมพ์ไว้'), r.text);
    assert.ok(r.text.includes('value="/uploads/cover.png"'), r.text);
    assert.ok(r.text.includes('value="12" checked'), r.text);
    assert.ok(!r.text.includes('value="1" checked'), r.text);
    assert.ok(r.text.includes('action="/admin/posts"'), r.text);

    // spec test 9, case 2: the same form with an en slug saves, and th takes the en slug
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { cover_image: '/uploads/cover.png', tags: '12', th: thai, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'docker-101' } }
    });
    assert.equal(r.status, 303);
    const id = Number((String(r.location).match(/^\/admin\/posts\/(\d+)\?saved=1$/) || [])[1]);
    assert.ok(id, r.location);
    assert.equal(await countPosts(), before + 1);
    assert.deepEqual(
      await all('SELECT lang, status, slug FROM post_translations WHERE post_id = ? ORDER BY lang DESC', [id]),
      [{ lang: 'th', status: 'published', slug: 'docker-101' }, { lang: 'en', status: 'draft', slug: 'docker-101' }]
    );
    assert.deepEqual(await all('SELECT tag_id FROM post_tags WHERE post_id = ?', [id]), [{ tag_id: 12 }]);
    assert.equal((await get("SELECT body_markdown FROM post_translations WHERE post_id = ? AND lang = 'th'", [id])).body_markdown, body);

    // the editor of the saved post: en is open because it has a row, both selects confirm before a translation is
    // deleted, and only the published th slug carries the broken-link warning
    r = await h.req('/admin/posts/' + id + '?saved=1');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('บันทึกแล้ว'), r.text);
    [th, en] = sections(r.text);
    assert.ok(en.startsWith(' class="translation" lang="en" open>'), en);
    assert.ok(th.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')"), th);
    assert.ok(en.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')"), en);
    assert.ok(th.includes('ลิงก์เดิมจะใช้ไม่ได้'), th);
    assert.ok(!en.includes('ลิงก์เดิมจะใช้ไม่ได้'), en);
    assert.ok(th.includes('value="docker-101"'), th);

    // spec test 9, case 3: a slug that another post uses in the same language is a 400 with a message, not a 500
    await insertPost({ th: { slug: 'taken', title: 'บทความที่ใช้ slug นี้แล้ว' } });
    const count = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { th: { ...blank, status: 'draft', title: 'บทความใหม่', slug: 'taken' }, en: { ...blank, status: 'none' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('slug นี้ถูกใช้แล้ว'), r.text);
    assert.equal(await countPosts(), count);

    // the same check on edit leaves the saved row alone, and the form still posts to this post
    r = await h.req('/admin/posts/' + id, {
      method: 'POST',
      form: { th: { ...thai, slug: 'taken' }, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'docker-101' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('slug นี้ถูกใช้แล้ว'), r.text);
    assert.ok(r.text.includes('action="/admin/posts/' + id + '"'), r.text);
    assert.equal((await get("SELECT slug FROM post_translations WHERE post_id = ? AND lang = 'th'", [id])).slug, 'docker-101');

    // UNIQUE (lang, slug) is per language, so en may use "taken", and saving th with its own slug is not a clash
    r = await h.req('/admin/posts/' + id, {
      method: 'POST',
      form: { tags: ['1', '2'], th: { ...thai, slug: 'docker-101' }, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'taken' } }
    });
    assert.equal(r.status, 303);
    assert.deepEqual(await all('SELECT slug FROM post_translations WHERE post_id = ? ORDER BY lang DESC', [id]), [{ slug: 'docker-101' }, { slug: 'taken' }]);
    assert.deepEqual(await all('SELECT tag_id FROM post_tags WHERE post_id = ? ORDER BY tag_id', [id]), [{ tag_id: 1 }, { tag_id: 2 }]);

    // at least one language must not be none
    r = await h.req('/admin/posts', { method: 'POST', form: { th: { ...blank, status: 'none', title: 'ทิ้งไว้' }, en: { ...blank, status: 'none' } } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('ต้องมีอย่างน้อยหนึ่งภาษา'), r.text);

    // an active language needs a title, and the language with the error is open so the message is not hidden
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { th: { ...blank, status: 'draft', title: 'มีหัวข้อ', slug: 'no-title' }, en: { ...blank, status: 'draft', body_markdown: 'English body without a title' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('กรุณาใส่หัวข้อ'), r.text);
    assert.ok(sections(r.text)[1].startsWith(' class="translation" lang="en" open>'), r.text);
    assert.ok(r.text.includes('English body without a title'), r.text);

    // a field sent twice arrives as an array, which counts as empty and never becomes a 500
    r = await h.req('/admin/posts', { method: 'POST', form: { th: { ...blank, status: 'draft', slug: 'twice', title: ['a', 'b'] }, en: { status: 'none' } } });
    assert.equal(r.status, 400);
    assert.equal(await countPosts(), count);
  } finally {
    await h.stop();
  }
});
