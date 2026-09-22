const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject } = require('./helpers');

test('22 comments identity cookies', async () => {
  const h = await start();
  try {
    await insertPost({ th: { slug: 'a', title: 'A' } });
    await insertProject({ th: { slug: 'p', title: 'P' } });

    // GET หน้าโพสต์ที่เผยแพร่แล้ว: ตั้งทั้ง ta_nick และ ta_csrf
    let r = await h.req('/th/blog/a');
    assert.equal(r.status, 200);
    assert.ok(r.setCookie.some(c => c.startsWith('ta_nick=')), r.setCookie.join(' | '));
    assert.ok(r.setCookie.some(c => c.startsWith('ta_csrf=')), r.setCookie.join(' | '));
    assert.match(r.setCookie.find(c => c.startsWith('ta_nick=')), /; HttpOnly(;|$)/);
    assert.match(r.setCookie.find(c => c.startsWith('ta_nick=')), /; SameSite=Lax(;|$)/);

    // ขอซ้ำโดยใช้คุกกี้เดิม (jar จำให้อัตโนมัติ): ไม่ตั้งคุกกี้ซ้ำเพราะของเดิมยังผ่าน
    r = await h.req('/th/blog/a');
    assert.equal(r.status, 200);
    assert.deepEqual(r.setCookie, []);

    // หน้าโปรเจกต์ก็ตั้งคุกกี้เหมือนกัน
    r = await h.req('/th/projects/p', { jar: false });
    assert.ok(r.setCookie.some(c => c.startsWith('ta_nick=')), r.setCookie.join(' | '));

    // หน้าที่ไม่มีฟอร์ม comment ไม่ตั้งคุกกี้พวกนี้เลย
    r = await h.req('/th/about', { jar: false });
    assert.equal(r.status, 200);
    assert.ok(!r.setCookie.some(c => c.startsWith('ta_nick=') || c.startsWith('ta_csrf=')), r.setCookie.join(' | '));
    r = await h.req('/th/blog', { jar: false });
    assert.ok(!r.setCookie.some(c => c.startsWith('ta_nick=') || c.startsWith('ta_csrf=')), r.setCookie.join(' | '));

    // สโลกไม่มีจริง/ยังไม่เผยแพร่: 404 เหมือนเดิม ไม่ตั้งคุกกี้ระบุตัวตน (client ใหม่จริง ๆ ผ่าน jar:false
    // ตรวจเฉพาะ ta_nick/ta_csrf แบบเดียวกับ /th/about กับ /th/blog ด้านบน เพราะ deepEqual([]) จะโดน
    // คุกกี้ lang ที่ไม่เกี่ยวข้องบัง ทำให้จับไม่ได้ถ้า ensureCommentIdentity กลับไปรันก่อนเช็ค 404 อีก)
    r = await h.req('/th/blog/does-not-exist', { jar: false });
    assert.equal(r.status, 404);
    assert.ok(!r.setCookie.some(c => c.startsWith('ta_nick=') || c.startsWith('ta_csrf=')), r.setCookie.join(' | '));
  } finally {
    await h.stop();
  }
});
