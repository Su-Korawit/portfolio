const crypto = require('node:crypto');
const nickname = require('./nickname');

const NICK_COOKIE = 'ta_nick';
const CSRF_COOKIE = 'ta_csrf';

// attribute เดียวกับที่ ta_admin ใช้ใน src/routes/admin.js (signed, httpOnly, sameSite lax) ต่างกันแค่ path:
// คุกกี้พวกนี้ใช้ทั้งเว็บสาธารณะ ไม่ใช่แค่ /admin
const ATTRS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  signed: true
};
const NICK_MAX_AGE = 365 * 864e5;
const CSRF_MAX_AGE = 864e5;
const CSRF_PATTERN = /^[A-Za-z0-9_-]{32,}$/;

// ตั้ง res.locals.nickname/csrfToken ให้ฟอร์ม comment ใช้ และตั้งคุกกี้ใหม่เฉพาะตอนที่ยังไม่มีหรือค่าที่มีผิดรูปแบบ
// (เช่น ถูกแก้มือ หรือคุกกี้เก่าจากก่อนฟีเจอร์นี้). รันเฉพาะ route ที่มีฟอร์ม comment ไม่ใช่ทุกหน้า.
function ensureCommentIdentity(req, res) {
  let nick = req.signedCookies[NICK_COOKIE];
  if (!nickname.isValid(nick)) {
    nick = nickname.generate();
    res.cookie(NICK_COOKIE, nick, { ...ATTRS, maxAge: NICK_MAX_AGE });
  }
  res.locals.nickname = nick;

  let csrf = req.signedCookies[CSRF_COOKIE];
  if (typeof csrf !== 'string' || !CSRF_PATTERN.test(csrf)) {
    csrf = crypto.randomBytes(24).toString('base64url');
    res.cookie(CSRF_COOKIE, csrf, { ...ATTRS, maxAge: CSRF_MAX_AGE });
  }
  res.locals.csrfToken = csrf;
}

// double-submit cookie: ฟิลด์ที่ผู้ใช้ส่งมาต้องตรงกับคุกกี้ signed ที่เบราว์เซอร์แนบมาเอง
// เว็บข้ามโดเมนอ่านคุกกี้นี้ไม่ได้ (ไม่ใช่ JS ของเว็บนี้) และเดาค่าที่ถูกต้องไม่ได้เพราะสุ่มด้วย crypto.randomBytes
// req.body เป็น undefined ได้เมื่อ body-parser เจอ Content-Type ที่ไม่ตรง application/x-www-form-urlencoded
function checkCsrf(req) {
  const cookie = req.signedCookies[CSRF_COOKIE];
  const submitted = (req.body || {})._csrf;
  return typeof cookie === 'string' && cookie.length > 0 && cookie === submitted;
}

function clearNickname(res) {
  res.clearCookie(NICK_COOKIE, ATTRS);
}

module.exports = { ensureCommentIdentity, checkCsrf, clearNickname, NICK_COOKIE, CSRF_COOKIE };
