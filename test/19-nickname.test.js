const test = require('node:test');
const assert = require('node:assert/strict');
const { generate, isValid } = require('../src/nickname');

test('19 nickname', () => {
  for (let i = 0; i < 200; i++) {
    const name = generate();
    assert.match(name, /^[ก-๙]+[1-9][0-9]{1,2}$/, name);
    assert.equal(isValid(name), true, name);
  }
  assert.equal(isValid(undefined), false);
  assert.equal(isValid(null), false);
  assert.equal(isValid(''), false);
  assert.equal(isValid('ใจดี'), false); // ไม่มีเลข
  assert.equal(isValid('123'), false); // ไม่มีคำ
  assert.equal(isValid('ใจดี0'), false); // เลขขึ้นต้นด้วย 0 ไม่ได้ (ต่ำกว่า 10)
  assert.equal(isValid('<script>99'), false); // ไม่ใช่คำในลิสต์
  assert.equal(isValid('ใจดี1000'), false); // เกิน 999
});
