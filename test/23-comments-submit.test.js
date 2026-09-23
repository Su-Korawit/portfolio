const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject, signCookie, all } = require('./helpers');

const CSRF = 'test-csrf-token-0123456789abcdef';
const asCookie = (name, value) => name + '=' + encodeURIComponent(signCookie(value));

// หมายเหตุ: ทั้งสองสถานการณ์ (บทความ + โปรเจกต์) อยู่ใน test() เดียวกันโดยตั้งใจ ไม่แยกเป็นสอง test() ในไฟล์เดียว
// เพราะ src/db.js ใช้ libsql client เดียวที่เป็น module-level singleton และ helpers.js's stop() เรียก close()
// แบบถาวร - node:test รันหลาย test() ในไฟล์เดียวกันในโปรเซสเดียวกัน (ต่างจากการแยกคนละไฟล์ที่แต่ละไฟล์ได้โปรเซสของ
// ตัวเอง) ดังนั้น start()/stop() คู่ที่สองในไฟล์เดียวกันจะเจอ CLIENT_CLOSED เสมอ - บั๊กนี้มีอยู่ก่อนแล้วใน test
// infrastructure ที่ใช้ร่วมกัน (พิสูจน์ได้ด้วย repro สองบรรทัด start/stop ที่ไม่เกี่ยวกับ route คอมเมนต์เลย)
// ไม่ได้อยู่ในสโคปของ Task 6 ที่แก้ได้ (public.js/app.js/ไฟล์เทสต์ใหม่เท่านั้น db.js ห้ามแตะ) จึงรวมเป็น test()
// เดียวแทน เพื่อให้ยังครอบคลุมทั้งสองสถานการณ์โดยไม่ชนบั๊กนี้
test('23 comments submit', async () => {
  const h = await start();
  try {
    const postId = await insertPost({ th: { slug: 'a', title: 'A' } });
    const csrfCookie = asCookie('ta_csrf', CSRF);

    // สำเร็จ: csrf ตรง, honeypot ว่าง, ความยาวข้อความอยู่ในช่วง
    let r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'สวัสดีครับ นี่คือคอมเมนต์แรก', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/th/blog/a#comments');
    let rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].body, 'สวัสดีครับ นี่คือคอมเมนต์แรก');
    assert.match(rows[0].author_name, /^[ก-๙]+[1-9][0-9]{1,2}$/);

    // honeypot ไม่ว่าง: ตอบเหมือนสำเร็จ แต่ไม่บันทึก
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'บอทส่งมา', _csrf: CSRF, website: 'http://spam.example' }
    });
    assert.equal(r.status, 303);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // csrf ไม่ตรง: ตอบเหมือนสำเร็จ แต่ไม่บันทึก
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'โทเคนผิด', _csrf: 'wrong-token', website: '' }
    });
    assert.equal(r.status, 303);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // ไม่มีคุกกี้ csrf เลย: ตอบเหมือนสำเร็จ แต่ไม่บันทึก
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      form: { body: 'ไม่มีคุกกี้เลย', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 303);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // สั้นเกิน: 400 จริง ไม่บันทึก และค่าที่พิมพ์ถูกส่งกลับไปเป็น local ให้ view ใช้แสดงซ้ำ
    // (ยังตรวจไม่ได้ว่า '>ก<' ปรากฏใน HTML จริง เพราะ views/post.ejs ยังไม่ได้เพิ่มฟอร์ม/การแสดง commentValue -
    // เป็นงานของ Task 7 ตาม docs/superpowers/plans/2026-09-22-comments.md ซึ่ง Task 6 ห้ามแตะ views ดูรายละเอียด
    // เพิ่มเติมใน task-6-report.md ส่วน concerns)
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'ก', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 400);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // ยาวเกิน 2000: 400 จริง ไม่บันทึก
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'ก'.repeat(2001), _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 400);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // slug ไม่มีจริง: 404 เหมือน route GET ไม่ตั้งคุกกี้ระบุตัวตน (แบบเดียวกับ test 22 สำหรับ GET)
    r = await h.req('/th/blog/does-not-exist/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      form: { body: 'สวัสดี', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 404);
    assert.ok(!r.setCookie.some(c => c.startsWith('ta_nick=') || c.startsWith('ta_csrf=')), r.setCookie.join(' | '));

    // Content-Type ไม่ตรง application/x-www-form-urlencoded: body-parser ปล่อย req.body เป็น undefined
    // (ไม่ใช่ {}) - checkCsrf/submitComment ต้องไม่ throw, CSRF ตกเงียบๆ (303) และไม่บันทึกคอมเมนต์
    r = await h.req('/th/blog/a/comments', {
      method: 'POST',
      jar: false,
      cookie: csrfCookie,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'test', _csrf: CSRF, website: '' })
    });
    assert.equal(r.status, 303);
    rows = await all('SELECT * FROM comments WHERE post_id = ?', [postId]);
    assert.equal(rows.length, 1);

    // โปรเจกต์ก็รับคอมเมนต์ได้เหมือนกัน (ใช้ h เดิม ไม่เปิด server ใหม่ ดูหมายเหตุด้านบนไฟล์)
    const projectId = await insertProject({ th: { slug: 'p', title: 'P' } });
    r = await h.req('/th/projects/p/comments', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF),
      form: { body: 'โปรเจกต์นี้เจ๋งมาก', _csrf: CSRF, website: '' }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/th/projects/p#comments');
    const projectRows = await all('SELECT * FROM comments WHERE project_id = ?', [projectId]);
    assert.equal(projectRows.length, 1);
  } finally {
    await h.stop();
  }
});
