const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureCommentIdentity, checkCsrf, clearNickname, NICK_COOKIE, CSRF_COOKIE } = require('../src/comment-cookies');

function fakeReqRes(signedCookies = {}, body = {}) {
  const cookies = [];
  const req = { signedCookies, body };
  const res = {
    locals: {},
    cookie: (name, value, opts) => cookies.push({ name, value, opts }),
    clearCookie: (name, opts) => cookies.push({ name, value: null, opts })
  };
  return { req, res, cookies };
}

test('21 comment cookies', () => {
  // ไม่มีคุกกี้เลย: สุ่มชื่อและ csrf ใหม่ทั้งคู่ แล้วตั้งคุกกี้
  {
    const { req, res, cookies } = fakeReqRes();
    ensureCommentIdentity(req, res, () => {});
    assert.match(res.locals.nickname, /^[ก-๙]+[1-9][0-9]{1,2}$/);
    assert.match(res.locals.csrfToken, /^[A-Za-z0-9_-]{32,}$/);
    assert.ok(cookies.some(c => c.name === NICK_COOKIE && c.value === res.locals.nickname));
    assert.ok(cookies.some(c => c.name === CSRF_COOKIE && c.value === res.locals.csrfToken));
  }

  // คุกกี้เดิมถูกต้อง: ใช้ซ้ำ ไม่ตั้งคุกกี้ใหม่
  {
    const { req, res, cookies } = fakeReqRes({ [NICK_COOKIE]: 'ใจดี482', [CSRF_COOKIE]: 'a'.repeat(32) });
    ensureCommentIdentity(req, res, () => {});
    assert.equal(res.locals.nickname, 'ใจดี482');
    assert.equal(res.locals.csrfToken, 'a'.repeat(32));
    assert.equal(cookies.length, 0);
  }

  // คุกกี้ nickname ถูกแก้ให้ผิดรูปแบบ: สุ่มใหม่เงียบๆ ไม่ error
  {
    const { req, res } = fakeReqRes({ [NICK_COOKIE]: '<script>alert(1)</script>' });
    ensureCommentIdentity(req, res, () => {});
    assert.notEqual(res.locals.nickname, '<script>alert(1)</script>');
    assert.match(res.locals.nickname, /^[ก-๙]+[1-9][0-9]{1,2}$/);
  }

  // next() ถูกเรียกเสมอ
  {
    const { req, res } = fakeReqRes();
    let called = false;
    ensureCommentIdentity(req, res, () => { called = true; });
    assert.equal(called, true);
  }

  // checkCsrf: ตรงกันผ่าน ไม่ตรง/ไม่มีคุกกี้ไม่ผ่าน
  assert.equal(checkCsrf({ signedCookies: { [CSRF_COOKIE]: 'abc' }, body: { _csrf: 'abc' } }), true);
  assert.equal(checkCsrf({ signedCookies: { [CSRF_COOKIE]: 'abc' }, body: { _csrf: 'xyz' } }), false);
  assert.equal(checkCsrf({ signedCookies: {}, body: { _csrf: 'abc' } }), false);
  assert.equal(checkCsrf({ signedCookies: { [CSRF_COOKIE]: 'abc' }, body: {} }), false);

  // clearNickname: เรียก res.clearCookie ด้วยชื่อและ attribute ที่ตรงกับตอนตั้ง (path ต้องตรงถึงจะล้างได้จริง)
  {
    const { res, cookies } = fakeReqRes();
    clearNickname(res);
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].name, NICK_COOKIE);
    assert.equal(cookies[0].opts.path, '/');
  }
});
