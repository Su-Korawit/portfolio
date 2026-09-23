const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject, run, get } = require('./helpers');

// One top-level test() per file (see test/06-delete-cascade.test.js): a second start()/stop() cycle in the
// same test file throws CLIENT_CLOSED on libsql's module-level client singleton. Both scenarios from the
// brief run sequentially here, sharing one h. The empty-state assertion runs right after login, before any
// comment is inserted, so it needs no extra login/logout cycle.
test('27 admin comments', async () => {
  const h = await start();
  try {
    // ต้อง login ก่อน เหมือนหน้าแอดมินอื่น
    let r = await h.req('/admin/comments');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    await h.login();

    // empty state: no comments inserted yet
    r = await h.req('/admin/comments');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ยังไม่มีความคิดเห็น'), r.text);

    const postId = await insertPost({ th: { slug: 'a', title: 'บทความเอ' } });
    const projectId = await insertProject({ th: { slug: 'p', title: 'โปรเจกต์พี' } });
    const { lastID: postCommentId } = await run(
      "INSERT INTO comments (post_id, author_name, body) VALUES (?, 'ใจดี482', 'ความเห็นแรก')",
      [postId]
    );
    await run(
      "INSERT INTO comments (project_id, author_name, body) VALUES (?, 'ร่าเริง17', 'ความเห็นสอง')",
      [projectId]
    );

    // เมนูมีลิงก์ "ความคิดเห็น"
    r = await h.req('/admin/posts');
    assert.ok(r.text.includes('href="/admin/comments"'), r.text);

    r = await h.req('/admin/comments');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ใจดี482'), r.text);
    assert.ok(r.text.includes('ความเห็นแรก'), r.text);
    assert.ok(r.text.includes('href="/th/blog/a"'), r.text);
    assert.ok(r.text.includes('บทความเอ'), r.text);
    assert.ok(r.text.includes('ร่าเริง17'), r.text);
    assert.ok(r.text.includes('href="/th/projects/p"'), r.text);
    assert.ok(r.text.includes('โปรเจกต์พี'), r.text);

    // ลบสำเร็จแล้วหายทั้งจาก admin list และหน้าเว็บจริง
    r = await h.req('/admin/comments/' + postCommentId + '/delete', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/comments');
    assert.equal(await get('SELECT id FROM comments WHERE id = ?', [postCommentId]), undefined);
    r = await h.req('/th/blog/a');
    assert.ok(!r.text.includes('ความเห็นแรก'), r.text);

    r = await h.req('/admin/comments');
    assert.ok(!r.text.includes('ใจดี482'), r.text);
    assert.ok(r.text.includes('ร่าเริง17'), r.text);

    // :id ต้องเป็นเลขจำนวนเต็มบวกที่มีอยู่จริง ไม่งั้น 404
    for (const urlPath of ['/admin/comments/abc/delete', '/admin/comments/0/delete', '/admin/comments/999999/delete']) {
      r = await h.req(urlPath, { method: 'POST' });
      assert.equal(r.status, 404, urlPath);
    }
  } finally {
    await h.stop();
  }
});
