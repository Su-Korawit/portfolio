const test = require('node:test');
const assert = require('node:assert/strict');
const { start, signCookie } = require('./helpers');

const CSRF = 'test-csrf-token-0123456789abcdef';
const asCookie = (name, value) => name + '=' + encodeURIComponent(signCookie(value));

test('25 comments reroll nickname', async () => {
  const h = await start();
  try {
    // csrf ตรง: ล้าง ta_nick แล้วพากลับไปหน้าที่มาจาก Referer (เฉพาะ path ที่เป็น /th/... หรือ /en/...)
    let r = await h.req('/th/reroll-nickname', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF) + '; ' + asCookie('ta_nick', 'ใจดี482'),
      headers: { referer: 'http://test.local/th/blog/a' },
      form: { _csrf: CSRF }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/th/blog/a');
    // res.clearCookie(name, { signed: true, ... }) ใน Express เซ็นค่าว่างแทนที่จะปล่อยว่างตรงๆ (ทดสอบแยกยืนยัน
    // แล้วว่าไม่เกี่ยวกับโค้ด route นี้เลย เป็นพฤติกรรมของ Express เอง) จึงเช็ค Expires ในอดีตแทนค่าที่ว่างเปล่า
    // เพราะนั่นคือสิ่งที่ทำให้เบราว์เซอร์ลบคุกกี้จริงๆ ไม่ใช่ค่าที่อยู่หลัง =
    assert.ok(
      r.setCookie.some(c => c.startsWith('ta_nick=') && /Expires=Thu, 01 Jan 1970/.test(c)),
      r.setCookie.join(' | ')
    );

    // ไม่มี Referer หรือ Referer ไม่ใช่หน้าในเว็บนี้: กลับไปหน้าแรกของภาษานั้น
    r = await h.req('/en/reroll-nickname', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF),
      form: { _csrf: CSRF }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/en');

    // Referer มี host แปลกแต่ path เป็นของเว็บนี้: ยังใช้ path นั้นได้ตามปกติ เพราะ redirect ที่ตอบกลับ
    // เป็น relative path เข้าเว็บนี้เองเสมอ ไม่เคยเอา host ของ Referer ไปสร้าง URL ปลายทาง จึงไม่ใช่ open redirect
    r = await h.req('/th/reroll-nickname', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF),
      headers: { referer: 'http://evil.example/th/blog/a' },
      form: { _csrf: CSRF }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/th/blog/a');

    // Referer เป็น path ที่ไม่ใช่หน้าในเว็บนี้ (ไม่ขึ้นต้นด้วย /th/ หรือ /en/): fallback ไปหน้าแรกของภาษานั้น
    r = await h.req('/th/reroll-nickname', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF),
      headers: { referer: 'http://test.local/admin/posts' },
      form: { _csrf: CSRF }
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/th');

    // csrf ไม่ตรง: ยัง redirect กลับ แต่ไม่ล้างคุกกี้
    r = await h.req('/th/reroll-nickname', {
      method: 'POST',
      jar: false,
      cookie: asCookie('ta_csrf', CSRF) + '; ' + asCookie('ta_nick', 'ใจดี482'),
      form: { _csrf: 'wrong' }
    });
    assert.equal(r.status, 303);
    assert.ok(!r.setCookie.some(c => c.startsWith('ta_nick=')), r.setCookie.join(' | '));
  } finally {
    await h.stop();
  }
});
