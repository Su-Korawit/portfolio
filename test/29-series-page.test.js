const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');

const post = (title, extra = {}) => ({ th: { status: 'published', title, ...extra }, en: { status: 'none' } });
const idOf = r => Number(String(r.location).match(/posts\/(\d+)/)[1]);

test('29 series chip on cards and the series page', async () => {
  const h = await start();
  try {
    await h.login();
    let r = await h.req('/admin/posts', { method: 'POST', form: { series: 'Camp', ...post('ตอนแรก') } });
    const first = idOf(r);
    r = await h.req('/admin/posts', { method: 'POST', form: { series: 'Camp', ...post('ตอนสอง') } });
    const second = idOf(r);
    // a draft part and a post outside any series
    await h.req('/admin/posts', { method: 'POST', form: { series: 'Camp', th: { status: 'draft', title: 'ร่าง' }, en: { status: 'none' } } });
    await h.req('/admin/posts', { method: 'POST', form: post('เดี่ยว') });
    const { id: seriesId } = await get('SELECT id FROM series WHERE name = ?', ['Camp']);

    // the blog list marks the posts of the series with a chip that links to the series page, and only those
    const chip = new RegExp('class="series-chip" href="/th/series/' + seriesId + '">ซีรีส์ · Camp</a>', 'g');
    r = await h.req('/th/blog');
    assert.equal((r.text.match(chip) || []).length, 2, r.text);

    // the series page lists the published parts in part order, without repeating the chip, and counts them
    r = await h.req('/th/series/' + seriesId);
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>Camp</h1>'), r.text);
    assert.ok(r.text.includes('2 ตอน'), r.text);
    assert.ok(r.text.indexOf('ตอนแรก') < r.text.indexOf('ตอนสอง'), r.text);
    assert.ok(!r.text.includes('ร่าง') && !r.text.includes('เดี่ยว'), r.text);
    assert.ok(!r.text.includes('series-chip'), r.text);
    assert.ok(r.text.includes('href="/th/blog/post-' + first + '"') && r.text.includes('href="/th/blog/post-' + second + '"'), r.text);

    // a made-up id, a bad id and a series with no published part are all 404
    for (const bad of ['99999', '0', 'abc', '1e3']) assert.equal((await h.req('/th/series/' + bad)).status, 404, bad);
    for (const id of [first, second]) {
      await h.req('/admin/posts/' + id, { method: 'POST', form: { series: 'Camp', th: { status: 'draft', title: 'x' + id, slug: 'x' + id }, en: { status: 'none' } } });
    }
    assert.equal((await h.req('/th/series/' + seriesId)).status, 404);
  } finally {
    await h.stop();
  }
});
