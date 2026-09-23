const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, signCookie, all } = require('./helpers');
const { MAX_PER_WINDOW } = require('../src/rate-limit');

const CSRF = 'test-csrf-token-0123456789abcdef';
const asCookie = (name, value) => name + '=' + encodeURIComponent(signCookie(value));

test('24 comments rate limit over http', async () => {
  const h = await start();
  try {
    await insertPost({ th: { slug: 'rl', title: 'RL' } });
    const csrfCookie = asCookie('ta_csrf', CSRF);

    for (let i = 0; i < MAX_PER_WINDOW; i++) {
      const r = await h.req('/th/blog/rl/comments', {
        method: 'POST',
        jar: false,
        cookie: csrfCookie,
        form: { body: 'ข้อความที่ ' + i, _csrf: CSRF, website: '' }
      });
      assert.equal(r.status, 303, 'request ' + i);
    }
    assert.equal((await all('SELECT id FROM comments')).length, MAX_PER_WINDOW);

    // คำขอที่เกินโควตา: ยังตอบเหมือนสำเร็จ (303) แต่ไม่บันทึกจริง
    const r = await h.req('/th/blog/rl/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'เกินโควตา', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 303);
    assert.equal((await all('SELECT id FROM comments')).length, MAX_PER_WINDOW);
  } finally {
    await h.stop();
  }
});
