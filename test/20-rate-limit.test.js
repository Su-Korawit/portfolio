const test = require('node:test');
const assert = require('node:assert/strict');
const { allow, WINDOW_MS, MAX_PER_WINDOW } = require('../src/rate-limit');

test('20 rate limit', () => {
  const now = Date.now();

  const ip1 = '203.0.113.10';
  for (let i = 0; i < MAX_PER_WINDOW; i++) {
    assert.equal(allow(ip1, now), true, 'request ' + (i + 1));
  }
  assert.equal(allow(ip1, now), false, 'request over the limit');

  // ip อื่นไม่โดนผลจาก ip1
  const ip2 = '203.0.113.11';
  assert.equal(allow(ip2, now), true);

  // พ้นหน้าต่างเวลาแล้วนับใหม่
  assert.equal(allow(ip1, now + WINDOW_MS + 1), true);
});
