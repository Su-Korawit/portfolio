const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// helpers first: it points DATA_DIR at a temp folder before src/db.js is loaded
const { start } = require('./helpers');
const { UPLOAD_DIR } = require('../src/db');

test('11 upload', async () => {
  const h = await start();
  try {
    const files = () => fs.readdirSync(UPLOAD_DIR).sort();
    // one file in a multipart form, the way public/js/admin.js sends it
    const upload = (bytes, { name = 'x.png', type = 'image/png', field = 'image' } = {}) => {
      const body = new FormData();
      body.append(field, new Blob([bytes], { type }), name);
      return h.req('/admin/upload', { method: 'POST', body });
    };
    // every answer of the upload route is JSON, including the errors, because admin.js reads it with res.json()
    const json = r => {
      assert.match(r.headers.get('content-type'), /^application\/json/, r.text);
      return JSON.parse(r.text);
    };
    const NOT_AN_IMAGE = { error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' };
    const NO_FILE = { error: 'กรุณาเลือกรูป 1 ไฟล์' };
    // the first bytes of real files: the PNG signature, a JPEG start with its APP0 marker, GIF89a and a RIFF WebP header
    const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const JPEG = Buffer.from('ffd8ffe000104a464946000101', 'hex');
    const GIF = Buffer.from('474946383961010001000000', 'hex');
    const WEBP = Buffer.from('52494646240000005745425056503820', 'hex');

    // the route sits behind the admin guard, and an anonymous request writes nothing
    let r = await upload(PNG);
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.deepEqual(files(), []);

    await h.login();

    // spec test 11, case 1: the bytes of a PNG signature
    r = await upload(PNG);
    assert.equal(r.status, 200);
    const { url } = json(r);
    assert.match(url, /^\/uploads\/[0-9a-f]{32}\.png$/);

    // spec test 11, case 2: the file is in DATA_DIR/uploads, and GET url sends nosniff
    assert.deepEqual(files(), [path.basename(url)]);
    assert.deepEqual(fs.readFileSync(path.join(UPLOAD_DIR, path.basename(url))), PNG);
    r = await h.req(url);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('content-type'), 'image/png');
    assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    // spec test 11, case 3: HTML named x.png and declared as image/png
    const count = files().length;
    r = await upload(Buffer.from('<html><body>not an image</body></html>'), { name: 'x.png', type: 'image/png' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NOT_AN_IMAGE);
    assert.equal(files().length, count);

    // spec test 11, case 4: SVG
    r = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { name: 'logo.svg', type: 'image/svg+xml' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NOT_AN_IMAGE);

    // spec test 11, case 5: 6 MB that starts like a real PNG, so the size is the only reason to refuse it
    r = await upload(Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]));
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), { error: 'ไฟล์ใหญ่เกิน 5 MB' });
    assert.ok(!r.text.includes('<html'), r.text);
    assert.equal(files().length, count);

    // the extension comes from the bytes, never from the name or the type that the browser sent
    for (const [bytes, ext] of [[JPEG, '.jpg'], [GIF, '.gif'], [WEBP, '.webp']]) {
      r = await upload(bytes, { name: 'photo.png', type: 'image/png' });
      assert.equal(r.status, 200, ext);
      assert.match(json(r).url, new RegExp('^/uploads/[0-9a-f]{32}\\' + ext + '$'));
    }
    // the original name is never used, so a path in it goes nowhere
    r = await upload(PNG, { name: '../../site.png' });
    assert.equal(r.status, 200);
    assert.match(json(r).url, /^\/uploads\/[0-9a-f]{32}\.png$/);
    assert.equal(files().length, count + 4);

    // a wrong field name, a form without a file, two files and a body that is not multipart are JSON 400s too
    const before = files().length;
    r = await upload(PNG, { field: 'file' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    const noFile = new FormData();
    noFile.append('note', 'no file here');
    r = await h.req('/admin/upload', { method: 'POST', body: noFile });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    const twoFiles = new FormData();
    twoFiles.append('image', new Blob([PNG], { type: 'image/png' }), 'a.png');
    twoFiles.append('image', new Blob([PNG], { type: 'image/png' }), 'b.png');
    r = await h.req('/admin/upload', { method: 'POST', body: twoFiles });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    r = await h.req('/admin/upload', { method: 'POST', form: { image: 'not a file' } });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    assert.equal(files().length, before);

    // /uploads serves files only: no directory listing, and a missing file is the normal 404 page
    assert.equal((await h.req('/uploads/')).status, 404);
    assert.equal((await h.req('/uploads/' + '0'.repeat(32) + '.png')).status, 404);

    // both editors load admin.js and have file inputs without a name: one for the image field and one per body
    r = await h.req('/js/admin.js');
    assert.equal(r.status, 200);
    for (const [urlPath, field] of [['/admin/posts/new', 'cover_image'], ['/admin/projects/new', 'thumbnail']]) {
      r = await h.req(urlPath);
      assert.ok(r.text.includes('<script src="/js/admin.js?v='), urlPath);
      const pickers = r.text.match(/<input type="file"[^>]*>/g) || [];
      assert.deepEqual(pickers.map(p => (p.match(/data-upload-target="([^"]*)"/) || [])[1]), [field, 'th[body_markdown]', 'en[body_markdown]'], urlPath);
      assert.ok(pickers.every(p => !p.includes(' name=')), urlPath);
    }
  } finally {
    await h.stop();
  }
});
