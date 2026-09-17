const test = require('node:test');
const assert = require('node:assert/strict');
const md = require('../src/markdown');

test('01 markdown', async () => {
  assert.equal(md.options.html, false);
  assert.equal(md.options.linkify, true);
  assert.equal(md.options.breaks, false);

  const js = md.render('```js\nconst x = 1;\n```\n');
  assert.ok(js.includes('class="language-js"'), js);
  assert.ok(js.includes('class="hljs-keyword"'), js);

  const docker = md.render('```dockerfile\nFROM node:24\n```\n');
  assert.ok(docker.includes('class="hljs-keyword"'), docker);

  const xss = md.render('<script>alert(1)</script>\n');
  assert.ok(xss.includes('&lt;script&gt;'), xss);
  assert.ok(!xss.includes('<script'), xss);

  let unknown;
  assert.doesNotThrow(() => {
    unknown = md.render('```foobar\n<b>x</b>\n```\n');
  });
  assert.ok(unknown.includes('class="language-foobar"'), unknown);
  assert.ok(unknown.includes('&lt;b&gt;x&lt;/b&gt;'), unknown);
  assert.ok(!unknown.includes('<b>'), unknown);

  const drive = md.render('ไฟล์ https://drive.google.com/file/d/1Ab_x-Y/view?usp=sharing นะ\n');
  assert.ok(drive.includes('<a href="https://drive.google.com/file/d/1Ab_x-Y/view?usp=sharing">'), drive);

  const thai = md.render('ดูที่https://example.com/a.ครับ\n');
  assert.ok(thai.includes('<a href="https://example.com/a">https://example.com/a</a>.ครับ'), thai);

  const files = md.render('แก้ index.md กับ run.sh\n');
  assert.ok(!files.includes('<a'), files);
});
