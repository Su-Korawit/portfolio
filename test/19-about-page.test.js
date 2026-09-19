const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get, run } = require('./helpers');

// /about is built out of settings: two pictures and the swatch row are one value for the whole site
// (lang '*'), every piece of text has a Thai and an English row. Each block is optional and each one falls
// back to the other language on its own.
test('19 about page blocks', async () => {
  const h = await start();
  try {
    // nothing saved: the card is there with only its heading, no picture and no contact block
    let r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<article class="about-card">'), r.text);
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(!r.text.includes('about-contact'), r.text);

    await h.login();

    // the settings form has a field for every block
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="about_image" value=""'), r.text);
    assert.ok(r.text.includes('data-upload-target="about_image"'), r.text);
    assert.ok(r.text.includes('data-upload-target="about_photo"'), r.text);
    assert.ok(r.text.includes('name="th[about_name]" value=""'), r.text);
    assert.ok(r.text.includes('name="about_colors" value=""'), r.text);
    assert.ok(r.text.includes('name="en[about_quote]" value=""'), r.text);
    assert.ok(r.text.includes('name="th[about_photo_caption]" value=""'), r.text);
    assert.ok(/<textarea[^>]*name="th\[about_facts\]"/.test(r.text), r.text);
    assert.ok(/<textarea[^>]*name="en\[about_contact\]"/.test(r.text), r.text);
    assert.ok(r.text.includes('<script src="/js/admin.js'), r.text);

    const filled = {
      site_name: 'พอร์ตของผม',
      about_image: '/uploads/me.webp',
      about_photo: '/uploads/cat.webp',
      // the third value is not a hex colour and is dropped rather than escaped into the style attribute
      about_colors: '#FFFFFF, #B8C4C4, red, #000',
      email: 'hello@example.com',
      th: {
        about_body: 'สวัสดี',
        about_image_alt: 'ผมกับทะเล',
        about_name: 'กรวิชญ์',
        about_facts: 'อายุ 22 ปี\n\nอยู่กรุงเทพ',
        about_quote: 'ใจดีแล้วสวย',
        about_photo_caption: 'แมวของผม: คริสตัล',
        about_contact: '123 ถนนใดก็ได้\n02-345-6789'
      },
      en: {
        about_body: 'Hello',
        about_image_alt: 'Me by the sea',
        about_name: 'Korawit',
        about_quote: 'Kindness is beautiful.',
        about_photo_caption: 'My cat: Crystal'
      }
    };
    r = await h.req('/admin/settings', { method: 'POST', form: filled });
    assert.equal(r.status, 303);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_photo' AND lang = '*'"), { value: '/uploads/cat.webp' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_name' AND lang = 'th'"), { value: 'กรวิชญ์' });

    // the saved values come back into the form
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="about_image" value="/uploads/me.webp"'), r.text);
    assert.ok(r.text.includes('name="en[about_quote]" value="Kindness is beautiful."'), r.text);
    assert.ok(/<textarea[^>]*name="th\[about_facts\]"[^>]*>อายุ 22 ปี/.test(r.text), r.text);

    // every block on /th/about
    r = await h.req('/th/about');
    assert.ok(r.text.includes('<h1>เกี่ยวกับ</h1>'), r.text);
    assert.ok(r.text.includes('<img class="about-portrait" src="/uploads/me.webp" alt="ผมกับทะเล" decoding="async">'), r.text);
    assert.ok(r.text.includes('<p class="about-name">กรวิชญ์</p>'), r.text);
    assert.ok(r.text.includes('<div class="prose">'), r.text);
    // a blank line between two facts is not an empty bullet
    assert.ok(r.text.includes('<li>อายุ 22 ปี</li>'), r.text);
    assert.ok(r.text.includes('<li>อยู่กรุงเทพ</li>'), r.text);
    assert.ok(!/<li>\s*<\/li>/.test(r.text), r.text);
    assert.ok(r.text.includes('style="background: #FFFFFF"'), r.text);
    assert.ok(r.text.includes('style="background: #000"'), r.text);
    assert.ok(!r.text.includes('background: red'), r.text);
    assert.ok(r.text.includes('<blockquote class="about-quote">ใจดีแล้วสวย</blockquote>'), r.text);
    assert.ok(r.text.includes('<img class="about-photo" src="/uploads/cat.webp" alt="แมวของผม: คริสตัล"'), r.text);
    assert.ok(r.text.includes('<li>02-345-6789</li>'), r.text);
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);

    // /en/about uses the English text it has; about_facts and about_contact have no English row, so those two
    // blocks fall back and say so with lang="th" while the rest of the page stays English
    r = await h.req('/en/about');
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<p class="about-name">Korawit</p>'), r.text);
    assert.ok(r.text.includes('<blockquote class="about-quote">Kindness is beautiful.</blockquote>'), r.text);
    assert.ok(r.text.includes('alt="Me by the sea"'), r.text);
    assert.ok(/<ul lang="th">\s*<li>อายุ 22 ปี<\/li>/.test(r.text), r.text);
    assert.ok(r.text.includes('<ul class="about-contact-lines" lang="th">'), r.text);

    // an unsafe or malformed picture value is treated as empty on save, the same silent handling as the URLs
    for (const bad of ['javascript:alert(1)', '//evil.example.com/me.png', 'me.webp']) {
      await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_image: bad, about_photo: bad } });
      assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined, bad);
      assert.equal(await get("SELECT value FROM settings WHERE key = 'about_photo' AND lang = '*'"), undefined, bad);
    }

    // a row written straight into SQLite skips the form's filtering, so /about filters again on the way out
    const write = (key, value) => run(
      `INSERT INTO settings (key, lang, value) VALUES (?, '*', ?)
       ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value`, [key, value]
    );
    await write('about_image', 'javascript:alert(1)');
    await write('about_colors', 'url(x)');
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(!r.text.includes('javascript:alert(1)'), r.text);
    assert.ok(!r.text.includes('about-swatch'), r.text);

    // an absolute URL is what an R2 upload returns, and it is kept as it is
    await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_image: 'https://cdn.example.com/me.webp' } });
    r = await h.req('/th/about');
    assert.ok(r.text.includes('src="https://cdn.example.com/me.webp"'), r.text);

    // clearing the fields deletes the rows and the blocks disappear again
    await h.req('/admin/settings', { method: 'POST', form: { site_name: 'พอร์ตของผม', email: 'hello@example.com' } });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_quote' AND lang = 'th'"), undefined);
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(!r.text.includes('about-quote'), r.text);
    assert.ok(!r.text.includes('about-swatch'), r.text);
    // the contact block stays, because the email alone is enough to fill it
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);
  } finally {
    await h.stop();
  }
});
