const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get } = require('./helpers');

test('06 delete cascade', async () => {
  const h = await start();
  try {
    const count = async (table, postId) =>
      (await get('SELECT COUNT(*) AS n FROM ' + table + ' WHERE post_id = ?', [postId])).n;
    const { lastID: nodeTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('nodejs', 'โหนดเจเอส', 'Node.js')");
    const { lastID: sqliteTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('sqlite', 'เอสคิวไลต์', 'SQLite')");
    const id = await insertPost({
      th: { slug: 'to-delete', title: 'บทความที่จะถูกลบ' },
      en: { slug: 'to-delete', title: 'Post to delete' },
      tags: [nodeTag, sqliteTag]
    });
    // another post on the same tag shows that the delete removes only the rows of its own post
    const keep = await insertPost({ th: { slug: 'keep', title: 'บทความที่ต้องอยู่ต่อ' }, tags: [nodeTag] });
    assert.equal(await count('post_translations', id), 2);
    assert.equal(await count('post_tags', id), 2);

    // the guard runs before the delete route
    let r = await h.req('/admin/posts/' + id + '/delete', { method: 'POST' });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.equal(await count('post_translations', id), 2);

    await h.login();
    r = await h.req('/admin/posts/' + id);
    assert.equal(r.status, 200);
    assert.ok(
      r.text.includes('<form class="editor-delete" method="post" action="/admin/posts/' + id + '/delete" onsubmit="return confirm(\'ลบบทความนี้?\')">'),
      r.text
    );

    r = await h.req('/admin/posts/' + id + '/delete', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts');
    assert.equal(await get('SELECT id FROM posts WHERE id = ?', [id]), undefined);
    // ON DELETE CASCADE only works because src/db.js turns on PRAGMA foreign_keys for the connection
    assert.equal(await count('post_translations', id), 0);
    assert.equal(await count('post_tags', id), 0);
    assert.equal((await get('SELECT COUNT(*) AS n FROM tags')).n, 2);
    assert.equal(await count('post_translations', keep), 1);
    assert.equal(await count('post_tags', keep), 1);
    assert.equal((await h.req('/th/blog/to-delete')).status, 404);
    assert.equal((await h.req('/en/blog/to-delete')).status, 404);
    assert.equal((await h.req('/th/blog/keep')).status, 200);

    r = await h.req('/admin/posts');
    assert.ok(!r.text.includes('บทความที่จะถูกลบ'), r.text);
    assert.ok(r.text.includes('บทความที่ต้องอยู่ต่อ'), r.text);

    // :id must be a positive integer of a post that exists, otherwise every :id route is a 404
    const form = { th: { status: 'draft', title: 'ไม่ควรถูกสร้าง', slug: 'should-not-exist' }, en: { status: 'none' } };
    for (const [method, urlPath] of [
      ['POST', '/admin/posts/' + id + '/delete'],
      ['POST', '/admin/posts/abc/delete'],
      ['POST', '/admin/posts/0/delete'],
      ['POST', '/admin/posts/1.5/delete'],
      ['GET', '/admin/posts/' + id],
      ['GET', '/admin/posts/abc'],
      ['GET', '/admin/posts/-1'],
      ['GET', '/admin/posts/99999999999999999999'],
      ['POST', '/admin/posts/' + id],
      ['POST', '/admin/posts/007']
    ]) {
      r = await h.req(urlPath, method === 'POST' ? { method, form } : { method });
      assert.equal(r.status, 404, method + ' ' + urlPath);
    }
    assert.equal((await get('SELECT COUNT(*) AS n FROM posts')).n, 1);
  } finally {
    await h.stop();
  }
});
