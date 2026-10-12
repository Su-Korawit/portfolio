const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, get, all } = require('./helpers');

const hrefs = html => [...html.matchAll(/class="card-title"><a href="([^"]+)"/g)].map(m => m[1]);
const post = (title, extra = {}) => ({ th: { status: 'published', title, ...extra }, en: { status: 'none' } });

test('28 series, order and automatic slug', async () => {
  const h = await start();
  try {
    await h.login();

    // a Thai-only title with no slug typed saves as post-<id> instead of asking for one
    let r = await h.req('/admin/posts', { method: 'POST', form: { series: 'Docker', ...post('ตอนแรก') } });
    assert.equal(r.status, 303);
    const first = Number(String(r.location).match(/posts\/(\d+)/)[1]);
    assert.equal((await get('SELECT slug FROM post_translations WHERE post_id = ?', [first])).slug, 'post-' + first);

    // no part number means the next part; a typed one is kept
    r = await h.req('/admin/posts', { method: 'POST', form: { series: 'Docker', ...post('ตอนสอง') } });
    const second = Number(String(r.location).match(/posts\/(\d+)/)[1]);
    r = await h.req('/admin/posts', { method: 'POST', form: { series: 'Docker', series_part: '7', ...post('ตอนเจ็ด') } });
    const third = Number(String(r.location).match(/posts\/(\d+)/)[1]);
    assert.deepEqual(
      (await all('SELECT id, series_part FROM posts ORDER BY id')).map(x => [Number(x.id), Number(x.series_part)]),
      [[first, 1], [second, 2], [third, 7]]
    );
    assert.equal((await all('SELECT id FROM series')).length, 1);

    // the post page names its series and lists the parts in part order; no date is shown anywhere
    r = await h.req('/th/blog/post-' + second);
    assert.match(r.text, /ซีรีส์: <a href="\/th\/series\/\d+">Docker<\/a> · ตอนที่ 2/);
    assert.ok(r.text.indexOf('ตอนที่ 1 · ตอนแรก') < r.text.indexOf('ตอนที่ 7 · ตอนเจ็ด'), r.text);
    assert.ok(!r.text.includes('<time'), r.text);

    // newest first at the start (a new post goes on top), and the arrows reorder both the admin and the blog
    assert.deepEqual(hrefs((await h.req('/th/blog')).text), ['/th/blog/post-' + third, '/th/blog/post-' + second, '/th/blog/post-' + first]);
    r = await h.req('/admin/posts/' + first + '/move', { method: 'POST', form: { direction: 'up' } });
    assert.equal(r.status, 303);
    assert.deepEqual(hrefs((await h.req('/th/blog')).text), ['/th/blog/post-' + third, '/th/blog/post-' + first, '/th/blog/post-' + second]);
    await h.req('/admin/posts/' + first + '/move', { method: 'POST', form: { direction: 'up' } });
    await h.req('/admin/posts/' + first + '/move', { method: 'POST', form: { direction: 'up' } }); // already on top: nothing changes
    assert.deepEqual(hrefs((await h.req('/th/blog')).text)[0], '/th/blog/post-' + first);
    assert.ok((await h.req('/admin/posts')).text.indexOf('ตอนแรก') < (await h.req('/admin/posts')).text.indexOf('ตอนเจ็ด'));
    assert.equal((await h.req('/admin/posts/99999/move', { method: 'POST', form: { direction: 'up' } })).status, 404);
    assert.equal((await h.req('/admin/posts/' + first + '/move', { method: 'POST', form: { direction: 'sideways' } })).status, 404);

    // the editor offers the existing series and keeps what the hidden fields hold across a save
    r = await h.req('/admin/posts/' + first);
    assert.ok(r.text.includes('<option value="Docker">'), r.text);
    assert.ok(r.text.includes('name="th[slug]" value="post-' + first + '"'), r.text);

    // taking the only posts out of a series removes the series
    for (const id of [first, second, third]) {
      await h.req('/admin/posts/' + id, { method: 'POST', form: { series: '', ...post('x' + id, { slug: 'x' + id }) } });
    }
    assert.equal((await all('SELECT id FROM series')).length, 0);
  } finally {
    await h.stop();
  }
});
