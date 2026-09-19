const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get, run } = require('./helpers');

// The portrait on /about: one image for both languages (about_image, lang '*') with alt text per language
// (about_image_alt), both saved from the settings form like every other setting.
test('19 about photo', async () => {
  const h = await start();
  try {
    // with nothing saved the page has no portrait and no two-column wrapper
    let r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(r.text.includes('<div class="about-intro">'), r.text);

    await h.login();

    // the settings form has the picture field, the file picker that fills it, and both alt fields
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="about_image" value=""'), r.text);
    assert.ok(r.text.includes('data-upload-target="about_image"'), r.text);
    assert.ok(r.text.includes('name="th[about_image_alt]" value=""'), r.text);
    assert.ok(r.text.includes('name="en[about_image_alt]" value=""'), r.text);
    assert.ok(r.text.includes('<script src="/js/admin.js'), r.text);

    const base = {
      site_name: 'พอร์ตของผม',
      th: { about_body: 'สวัสดี' },
      en: { about_body: 'Hello' }
    };
    const save = form => h.req('/admin/settings', { method: 'POST', form: { ...base, ...form } });

    // an uploaded file lands as '/uploads/<name>'; alt text is saved per language
    r = await save({
      about_image: '/uploads/me.webp',
      th: { ...base.th, about_image_alt: 'ผมกับทะเล' },
      en: { ...base.en, about_image_alt: 'Me by the sea' }
    });
    assert.equal(r.status, 303);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), { value: '/uploads/me.webp' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_image_alt' AND lang = 'th'"), { value: 'ผมกับทะเล' });

    // the saved values come back into the form
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="about_image" value="/uploads/me.webp"'), r.text);
    assert.ok(r.text.includes('name="en[about_image_alt]" value="Me by the sea"'), r.text);

    // /th/about shows the portrait with the Thai alt, inside the wrapper the two-column layout hangs off
    r = await h.req('/th/about');
    assert.ok(r.text.includes('<div class="about-intro has-portrait">'), r.text);
    assert.ok(r.text.includes('<img class="about-portrait" src="/uploads/me.webp" alt="ผมกับทะเล" decoding="async">'), r.text);

    // each language has its own alt, so neither page needs a lang attribute on the image
    r = await h.req('/en/about');
    assert.ok(r.text.includes('alt="Me by the sea"'), r.text);
    assert.ok(!/<img class="about-portrait"[^>]*lang=/.test(r.text), r.text);

    // with only the Thai alt filled, /en/about falls back to it and says so with lang="th" - alt text cannot
    // carry markup, so the attribute goes on the image itself
    r = await save({ about_image: '/uploads/me.webp', th: { ...base.th, about_image_alt: 'ผมกับทะเล' }, en: base.en });
    assert.equal(r.status, 303);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image_alt' AND lang = 'en'"), undefined);
    r = await h.req('/en/about');
    assert.ok(r.text.includes('<img class="about-portrait" src="/uploads/me.webp" alt="ผมกับทะเล" lang="th" decoding="async">'), r.text);

    // an absolute URL is what an R2 upload returns, and it is kept as it is
    r = await save({ about_image: 'https://cdn.example.com/me.webp' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), { value: 'https://cdn.example.com/me.webp' });
    r = await h.req('/th/about');
    assert.ok(r.text.includes('src="https://cdn.example.com/me.webp"'), r.text);
    // no alt saved for either language now: the image is left decorative rather than described wrongly
    assert.ok(r.text.includes('alt=""'), r.text);

    // anything that is neither is treated as empty on save, the same silent handling as the social URLs
    for (const bad of ['javascript:alert(1)', '//evil.example.com/me.png', 'me.webp']) {
      await save({ about_image: bad });
      assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined, bad);
    }

    // a row written straight into SQLite skips the form's filtering, so /about filters again on the way out
    await run("INSERT INTO settings (key, lang, value) VALUES ('about_image', '*', 'javascript:alert(1)')");
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(!r.text.includes('javascript:alert(1)'), r.text);

    // clearing the field deletes the row and the page goes back to one column
    r = await save({ about_image: '' });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined);
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(r.text.includes('<div class="about-intro">'), r.text);
  } finally {
    await h.stop();
  }
});
