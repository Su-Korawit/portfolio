const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertTag, insertPost, insertProject, get } = require('./helpers');
const strings = require('../src/strings');

test('13 tag page', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);
    const count = async (sql, params = []) => (await get(sql, params)).n;

    const docker = await insertTag({ slug: 'docker', name_th: 'ด็อกเกอร์', name_en: 'Docker' });
    const sqlite = await insertTag({ slug: 'sqlite', name_th: 'เอสคิวไลต์', name_en: 'SQLite' });
    await insertTag({ slug: 'unused', name_th: 'แท็กที่ยังไม่มีบทความ', name_en: 'Unused' });

    // spec test 13, case 1: a slug that is not a tag
    let r = await h.req('/th/tags/no-such-tag');
    assert.equal(r.status, 404);

    // spec test 13, case 2: a tag on one published post and one draft lists only the published post
    await insertPost({ tags: [docker], th: { slug: 'published-post', title: 'บทความที่เผยแพร่แล้ว', published_at: '2026-09-01T00:00:00.000Z' } });
    await insertPost({ tags: [docker], th: { status: 'draft', slug: 'draft-post', title: 'บทความที่ยังเป็นแบบร่าง' } });
    r = await h.req('/th/tags/docker');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/published-post']);
    assert.ok(!r.text.includes('บทความที่ยังเป็นแบบร่าง'), r.text);
    assert.ok(!r.text.includes('draft-post'), r.text);

    // a post of another tag and a project with this tag stay off the page, because the tag page lists posts only
    await insertPost({ tags: [sqlite], th: { slug: 'other-tag', title: 'บทความของแท็กอื่น' } });
    await insertProject({ tags: [docker], th: { slug: 'docker-project', title: 'โปรเจกต์ที่ติดแท็กนี้' } });
    r = await h.req('/th/tags/docker');
    assert.deepEqual(hrefs(r.text), ['/th/blog/published-post']);
    assert.ok(!r.text.includes('โปรเจกต์ที่ติดแท็กนี้'), r.text);
    // heading, title, canonical, hreflang of both languages and the switch link, like the other list pages
    assert.ok(r.text.includes('<h1>' + strings.th.tagTitle + ' ด็อกเกอร์</h1>'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.tagTitle + ' ด็อกเกอร์ | Portfolio</title>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/tags/docker">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/tags/docker">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/tags/docker" lang="en" hreflang="en"'), r.text);

    // /en uses the English tag name and shows the Thai-only post as a Thai card with a badge
    r = await h.req('/en/tags/docker');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.en.tagTitle + ' Docker</h1>'), r.text);
    const card = cards(r.text)[0];
    assert.ok(card.startsWith('<article class="card" lang="th">'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);

    // a tag that exists but has no published post is an empty list, not a 404
    r = await h.req('/th/tags/unused');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<p class="empty">' + strings.th.noPosts + '</p>'), r.text);

    // the tag chips on the post page now lead to a page
    r = await h.req('/th/blog/published-post');
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/docker">ด็อกเกอร์</a>'), r.text);

    // pagination works like /blog: 10 per page, page 1 without ?page, and a page that is not there is a 404
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, '0');
      await insertPost({ tags: [docker], th: { slug: 'page-' + i, title: 'ลำดับ ' + i, published_at: '2026-08-' + day + 'T00:00:00.000Z' } });
    }
    r = await h.req('/th/tags/docker');
    assert.equal(hrefs(r.text).length, 10);
    assert.ok(r.text.includes('<a class="pagination-older" href="/th/tags/docker?page=2">'), r.text);
    r = await h.req('/th/tags/docker?page=2');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/page-1']);
    assert.ok(r.text.includes('<a class="pagination-newer" href="/th/tags/docker">'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/tags/docker?page=2">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/tags/docker" lang="en" hreflang="en"'), r.text);
    for (const query of ['?page=3', '?page=abc', '?page=0']) {
      assert.equal((await h.req('/th/tags/docker' + query)).status, 404, query);
    }
    assert.equal((await h.req('/th/tags/%E0%')).status, 400);

    // admin: the tags page and its mutations sit behind the guard
    const countTags = () => count('SELECT COUNT(*) AS n FROM tags');
    r = await h.req('/admin/tags');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'x', name_th: 'x', name_en: 'x' } });
    assert.equal(r.status, 302);
    assert.equal(await countTags(), 3);

    await h.login();
    r = await h.req('/admin/tags');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<a href="/admin/tags" aria-current="page">แท็ก</a>'), r.text);
    assert.ok(r.text.includes('<form class="admin-form" method="post" action="/admin/tags">'), r.text);
    // each row is a form of its own: the three inputs point at it with form=, and delete asks first
    const rowForm = 'tag-' + docker;
    assert.ok(r.text.includes('<form id="' + rowForm + '" method="post" action="/admin/tags/' + docker + '">'), r.text);
    assert.equal((r.text.match(new RegExp('form="' + rowForm + '"', 'g')) || []).length, 3, r.text);
    assert.ok(r.text.includes('<input form="' + rowForm + '" name="name_th" value="ด็อกเกอร์"'), r.text);
    const dockerRow = r.text.split('<tr>').find(chunk => chunk.includes('form="' + rowForm + '"'));
    assert.ok(dockerRow.includes('<td>12</td>') && dockerRow.includes('<td>1</td>'), dockerRow);
    assert.ok(r.text.includes('<form method="post" action="/admin/tags/' + docker + '/delete" onsubmit="return confirm(\'ลบแท็กนี้?\')">'), r.text);

    // create: an empty slug comes from name_en (spec 2.3)
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: '', name_th: 'โหนดเจเอส', name_en: 'Node.js' } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags?saved=1');
    assert.deepEqual(
      await get("SELECT slug, name_th, name_en FROM tags WHERE name_en = 'Node.js'"),
      { slug: 'node-js', name_th: 'โหนดเจเอส', name_en: 'Node.js' }
    );
    r = await h.req(r.location);
    assert.ok(r.text.includes('<p class="form-saved" role="status">บันทึกแล้ว</p>'), r.text);
    // the new tag is a choice in the post editor
    r = await h.req('/admin/posts/new');
    assert.ok(r.text.includes('> node-js</label>'), r.text);

    // both names are required, a typed slug that strips to nothing is an error, and what was typed stays, escaped
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'ภาษาไทย', name_th: '', name_en: '<b>Design</b>' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ชื่อภาษาไทย</li>'), r.text);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)</li>'), r.text);
    assert.ok(r.text.includes('<input name="name_en" value="&lt;b&gt;Design&lt;/b&gt;"'), r.text);
    assert.ok(r.text.includes('<input name="slug" value="ภาษาไทย"'), r.text);
    assert.ok(!r.text.includes('<b>Design</b>'), r.text);
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'design', name_th: 'ดีไซน์', name_en: '' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ชื่อภาษาอังกฤษ</li>'), r.text);
    // a field sent twice arrives as an array, which counts as empty and never becomes a 500
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'twice', name_th: ['a', 'b'], name_en: 'Twice' } });
    assert.equal(r.status, 400);
    assert.equal(await countTags(), 4);

    // a slug that another tag uses is a 400 with a message, not a 500; toSlug runs first, so Docker is docker
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'Docker', name_th: 'ซ้ำ', name_en: 'Duplicate' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: slug นี้ถูกใช้แล้วในแท็กอื่น</li>'), r.text);
    assert.equal(await countTags(), 4);

    // update: new names and a new slug, and the tag page moves to the new slug
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags?saved=1');
    assert.deepEqual(
      await get('SELECT slug, name_th, name_en FROM tags WHERE id = ?', [docker]),
      { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' }
    );
    assert.equal((await h.req('/th/tags/docker')).status, 404);
    r = await h.req('/en/tags/containers');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.en.tagTitle + ' Containers</h1>'), r.text);

    // saving a tag with its own slug is not a clash; the slug of another tag is, and the row keeps what was typed
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' } });
    assert.equal(r.status, 303);
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'sqlite', name_th: 'ชื่อที่พิมพ์ไว้', name_en: 'Containers' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็ก containers: slug นี้ถูกใช้แล้วในแท็กอื่น</li>'), r.text);
    assert.ok(r.text.includes('<input form="' + rowForm + '" name="name_th" value="ชื่อที่พิมพ์ไว้"'), r.text);
    assert.equal((await get('SELECT slug FROM tags WHERE id = ?', [docker])).slug, 'containers');

    // delete: post_tags and project_tags go by ON DELETE CASCADE, and the posts and the project stay
    const posts = await count('SELECT COUNT(*) AS n FROM posts');
    assert.equal(await count('SELECT COUNT(*) AS n FROM post_tags WHERE tag_id = ?', [docker]), 12);
    assert.equal(await count('SELECT COUNT(*) AS n FROM project_tags WHERE tag_id = ?', [docker]), 1);
    r = await h.req('/admin/tags/' + docker + '/delete', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags');
    assert.equal(await get('SELECT id FROM tags WHERE id = ?', [docker]), undefined);
    assert.equal(await count('SELECT COUNT(*) AS n FROM post_tags WHERE tag_id = ?', [docker]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM project_tags WHERE tag_id = ?', [docker]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM posts'), posts);
    assert.equal(await count('SELECT COUNT(*) AS n FROM projects'), 1);
    assert.equal((await h.req('/th/tags/containers')).status, 404);
    r = await h.req('/th/blog/published-post');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('class="tag-list"'), r.text);

    // :id must be a positive integer of a tag that exists, otherwise every :id route is a 404
    const form = { slug: 'should-not-exist', name_th: 'ไม่ควรถูกสร้าง', name_en: 'Should not exist' };
    for (const [method, urlPath] of [
      ['POST', '/admin/tags/' + docker],
      ['POST', '/admin/tags/' + docker + '/delete'],
      ['POST', '/admin/tags/abc'],
      ['POST', '/admin/tags/0/delete'],
      ['POST', '/admin/tags/007'],
      ['GET', '/admin/tags/' + sqlite]
    ]) {
      r = await h.req(urlPath, method === 'POST' ? { method, form } : { method });
      assert.equal(r.status, 404, method + ' ' + urlPath);
    }
    assert.equal(await countTags(), 3);
  } finally {
    await h.stop();
  }
});
