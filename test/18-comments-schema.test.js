const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject, run, get } = require('./helpers');

test('18 comments schema', async () => {
  const h = await start();
  try {
    const postId = await insertPost({ th: { slug: 'a', title: 'A' } });
    let { lastID } = await run(
      "INSERT INTO comments (post_id, author_name, body) VALUES (?, 'ใจดี99', 'hello')",
      [postId]
    );
    let row = await get('SELECT * FROM comments WHERE id = ?', [lastID]);
    assert.equal(row.post_id, postId);
    assert.equal(row.project_id, null);
    assert.equal(row.body, 'hello');
    assert.ok(row.created_at);

    const projectId = await insertProject({ th: { slug: 'p', title: 'P' } });
    ({ lastID } = await run(
      "INSERT INTO comments (project_id, author_name, body) VALUES (?, 'ใจดี99', 'hi')",
      [projectId]
    ));
    row = await get('SELECT * FROM comments WHERE id = ?', [lastID]);
    assert.equal(row.project_id, projectId);
    assert.equal(row.post_id, null);

    // CHECK: exactly one of post_id/project_id must be set
    await assert.rejects(
      run("INSERT INTO comments (author_name, body) VALUES ('ใจดี99', 'neither')")
    );
    await assert.rejects(
      run(
        'INSERT INTO comments (post_id, project_id, author_name, body) VALUES (?, ?, ?, ?)',
        [postId, projectId, 'ใจดี99', 'both']
      )
    );

    // ON DELETE CASCADE, same convention as post_tags/project_tags
    await run('DELETE FROM posts WHERE id = ?', [postId]);
    assert.equal(await get('SELECT id FROM comments WHERE post_id = ?', [postId]), undefined);
    await run('DELETE FROM projects WHERE id = ?', [projectId]);
    assert.equal(await get('SELECT id FROM comments WHERE project_id = ?', [projectId]), undefined);
  } finally {
    await h.stop();
  }
});
