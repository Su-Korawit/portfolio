const test = require('node:test');
const assert = require('node:assert/strict');
const { start, run, get } = require('./helpers');

test('04 published at', async () => {
  const h = await start();
  try {
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const row = (id, lang) =>
      get('SELECT status, title, published_at FROM post_translations WHERE post_id = ? AND lang = ?', [id, lang]);
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    // the whole editor form, the way the browser sends it: both languages with every field
    const form = (th, en = { status: 'none' }) => ({
      cover_image: '',
      th: { ...blank, excerpt: 'เกริ่นนำ', body_markdown: 'เนื้อหา', ...th },
      en: { ...blank, ...en }
    });
    const thPublished = { status: 'published', title: 'เริ่มต้นใช้ Docker', slug: 'docker-101' };
    const enPublished = { status: 'published', title: 'Getting started with Docker', slug: 'docker-101' };

    await h.login();

    // 1. publish th through the editor and note published_at
    let r = await h.req('/admin/posts', { method: 'POST', form: form(thPublished) });
    assert.equal(r.status, 303);
    const [, idText] = String(r.location).match(/^\/admin\/posts\/(\d+)\?saved=1$/) || [];
    assert.ok(idText, r.location);
    const id = Number(idText);
    const first = (await row(id, 'th')).published_at;
    assert.match(first, ISO);
    assert.ok(Math.abs(Date.parse(first) - Date.now()) < 60000, first);
    assert.equal(await row(id, 'en'), undefined);

    r = await h.req(r.location);
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('บันทึกแล้ว'), r.text);

    // Move the stored date into the past, so a save that wrongly resets it to "now" always changes it,
    // however few milliseconds pass between two requests.
    const ORIGINAL = '2026-01-02T03:04:05.678Z';
    await run('UPDATE post_translations SET published_at = ? WHERE post_id = ?', [ORIGINAL, id]);

    // 2. edit the title and save again: the date stays
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form({ ...thPublished, title: 'เริ่มต้นใช้ Docker ฉบับแก้' }) });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts/' + id + '?saved=1');
    assert.deepEqual(await row(id, 'th'), { status: 'published', title: 'เริ่มต้นใช้ Docker ฉบับแก้', published_at: ORIGINAL });

    // 3. publish en: th keeps its date and en gets a date of its own
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form(thPublished, enPublished) });
    assert.equal(r.status, 303);
    assert.equal((await row(id, 'th')).published_at, ORIGINAL);
    const enDate = (await row(id, 'en')).published_at;
    assert.match(enDate, ISO);
    assert.ok(Math.abs(Date.parse(enDate) - Date.now()) < 60000, enDate);

    // 4. th back to draft: the public page is gone, but the row keeps its date
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form({ ...thPublished, status: 'draft' }, enPublished) });
    assert.equal(r.status, 303);
    assert.deepEqual(await row(id, 'th'), { status: 'draft', title: 'เริ่มต้นใช้ Docker', published_at: ORIGINAL });
    assert.equal((await h.req('/th/blog/docker-101')).status, 404);

    // publish th again: the first date is still the date on the page
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form(thPublished, enPublished) });
    assert.equal(r.status, 303);
    assert.equal((await row(id, 'th')).published_at, ORIGINAL);
    assert.equal((await row(id, 'en')).published_at, enDate);
    r = await h.req('/th/blog/docker-101');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<time datetime="2026-01-02T03:04:05.678Z">2 ม.ค. 2569</time>'), r.text);

    // the list links to the editor and shows both translations as published
    r = await h.req('/admin/posts');
    assert.ok(r.text.includes('href="/admin/posts/new"'), r.text);
    assert.ok(r.text.includes('<a href="/admin/posts/' + id + '">เริ่มต้นใช้ Docker</a>'), r.text);
    assert.equal((r.text.match(/chip chip-published/g) || []).length, 2, r.text);
  } finally {
    await h.stop();
  }
});
