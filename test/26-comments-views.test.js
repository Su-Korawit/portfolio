const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject } = require('./helpers');

function scrapeCsrf(html) {
  const m = /name="_csrf" value="([^"]*)"/.exec(html);
  return m ? m[1] : null;
}

// One top-level test() sharing a single start()/stop() cycle: src/db.js's libsql client is a module-level
// singleton and test/helpers.js's stop() calls client.close() unconditionally, so a second start() in the
// same test file throws CLIENT_CLOSED (confirmed in Task 6). All scenarios from the brief run sequentially here.
test('26 comments views', async () => {
  const h = await start();
  try {
    // Scenario 1: post page shows the form and the list
    await insertPost({ th: { slug: 'a', title: 'A' } });
    let r = await h.req('/th/blog/a');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์ได้เลย'), r.text);
    assert.match(r.text, /คอมเมนต์ในชื่อ.*<strong>[ก-๙]+[1-9][0-9]{1,2}<\/strong>/s);
    const csrf = scrapeCsrf(r.text);
    assert.ok(csrf, r.text);

    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      form: { body: 'ทดสอบจากหน้าเว็บจริง', _csrf: csrf, website: '' }
    });
    assert.equal(r.status, 303);

    r = await h.req('/th/blog/a');
    assert.ok(r.text.includes('ทดสอบจากหน้าเว็บจริง'), r.text);
    assert.ok(!r.text.includes('ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์ได้เลย'), r.text);

    // Scenario 2: project page shows the form and the list
    await insertProject({ th: { slug: 'p', title: 'P' } });
    r = await h.req('/th/projects/p');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์ได้เลย'), r.text);
    assert.ok(r.text.includes('action="/th/projects/p/comments"'), r.text);

    // Scenario 3: too-short submission re-renders the page with the typed text and an error
    r = await h.req('/th/blog/a');
    const csrf2 = scrapeCsrf(r.text);

    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      form: { body: 'ก', _csrf: csrf2, website: '' }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('กรุณาพิมพ์ความคิดเห็นอย่างน้อย 2 ตัวอักษร'), r.text);
    assert.ok(r.text.includes('>ก<'), r.text);

    // Scenario 4: comment text is escaped, never raw HTML
    r = await h.req('/th/blog/a');
    const csrf3 = scrapeCsrf(r.text);
    await h.req('/th/blog/a/comments', {
      method: 'POST',
      form: { body: '<script>alert(1)</script>', _csrf: csrf3, website: '' }
    });
    r = await h.req('/th/blog/a');
    assert.ok(!r.text.includes('<script>alert(1)</script>'), r.text);
    assert.ok(r.text.includes('&lt;script&gt;'), r.text);

    // Scenario 5: comment section is omitted from the preview route
    await h.login();
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    r = await h.req('/admin/posts/preview/th', {
      method: 'POST',
      form: { cover_image: '', th: { ...blank, status: 'draft', title: 'พรีวิว', body_markdown: 'เนื้อหา' }, en: { ...blank, status: 'none' } }
    });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('class="comments"'), r.text);
  } finally {
    await h.stop();
  }
});
