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

    // สโลกไม่มีจริง/ยังไม่เผยแพร่: 404 เหมือนเดิม ไม่ตั้งคุกกี้เพิ่ม (ใช้ jar เดิมที่มี lang/ta_nick/ta_csrf
    // อยู่แล้ว เพื่อพิสูจน์ว่าไม่มี Set-Cookie ใหม่เลย ต่างจาก jar:false ที่จะเจอ lang ถูกตั้งใหม่ทุกครั้งอยู่แล้ว
    // เพราะไม่ส่งคุกกี้เดิมไปเลย ซึ่งไม่เกี่ยวกับ comment identity ที่ Task นี้ทดสอบ)
    r = await h.req('/th/blog/does-not-exist');
    assert.equal(r.status, 404);
    assert.deepEqual(r.setCookie, []);
  } finally {
    await h.stop();
  }
});
