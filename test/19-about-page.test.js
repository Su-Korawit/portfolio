const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get, run } = require('./helpers');
const strings = require('../src/strings');

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
    assert.ok(/<textarea[^>]*name="about_image"/.test(r.text), r.text);
    assert.ok(r.text.includes('multiple data-upload-target="about_image" data-upload-mode="lines"'), r.text);
    assert.ok(r.text.includes('name="about_video" value=""'), r.text);
    assert.ok(r.text.includes('name="instagram_url" value=""'), r.text);
    assert.ok(r.text.includes('name="th[about_quote_source]" value=""'), r.text);
    assert.ok(r.text.includes('name="th[about_name]" value=""'), r.text);
    assert.ok(r.text.includes('name="about_colors" value=""'), r.text);
    assert.ok(r.text.includes('name="en[about_quote]" value=""'), r.text);
    assert.ok(/<textarea[^>]*name="th\[about_facts\]"/.test(r.text), r.text);
    assert.ok(/<textarea[^>]*name="en\[about_contact\]"/.test(r.text), r.text);
    assert.ok(r.text.includes('<script src="/js/admin.js'), r.text);

    const filled = {
      site_name: 'พอร์ตของผม',
      about_image: '/uploads/me.webp',
      about_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
      instagram_url: 'https://instagram.com/example',
      // the third value is not a hex colour and is dropped rather than escaped into the style attribute
      about_colors: '#FFFFFF, #B8C4C4, red, #000',
      email: 'hello@example.com',
      th: {
        about_body: 'สวัสดี',
        about_image_alt: 'ผมกับทะเล',
        about_name: 'กรวิชญ์',
        about_facts: 'อายุ 22 ปี\n\nอยู่กรุงเทพ',
        about_quote: 'ใจดีแล้วสวย',
        about_quote_source: 'วอลเดน',
        about_contact: '123 ถนนใดก็ได้\n02-345-6789'
      },
      en: {
        about_body: 'Hello',
        about_image_alt: 'Me by the sea',
        about_name: 'Korawit',
        about_quote: 'Kindness is beautiful.'
      }
    };
    r = await h.req('/admin/settings', { method: 'POST', form: filled });
    assert.equal(r.status, 303);
    // the link is stored as it was pasted; the page turns it into an id of its own
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_video' AND lang = '*'"), { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_name' AND lang = 'th'"), { value: 'กรวิชญ์' });

    // the saved values come back into the form
    r = await h.req('/admin/settings');
    assert.ok(/<textarea[^>]*name="about_image"[^>]*>\/uploads\/me\.webp<\/textarea>/.test(r.text), r.text);
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
    assert.ok(r.text.includes('<cite>วอลเดน</cite>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://instagram.com/example">Instagram</a></li>'), r.text);
    assert.ok(r.text.includes('<li>02-345-6789</li>'), r.text);
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);

    // The video waits for consent: with no answer yet the page makes no request to YouTube at all. The embed
    // URL sits in a data attribute for the script to use once the reader accepts, and the block offers a plain
    // link out in the meantime. GA is not configured in these tests, so the accept button is there for the
    // embed alone - without it the reader would have no way to say yes.
    assert.ok(r.text.includes('class="about-video-frame about-video-wait"'), r.text);
    assert.ok(r.text.includes('data-embed-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"'), r.text);
    assert.ok(!r.text.includes('<iframe'), r.text);
    assert.ok(r.text.includes('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"'), r.text);
    assert.ok(r.text.includes(strings.th.consentTextEmbed), r.text);
    assert.ok(r.text.includes('<button type="button" data-consent="granted">'), r.text);

    // once the reader has accepted, the server renders the player itself, built from the parsed id on the
    // nocookie host - never from the link as it was pasted
    r = await h.req('/th/about', { cookie: 'consent=granted' });
    assert.ok(r.text.includes('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="รู้จักฉันมากขึ้น"'), r.text);
    assert.ok(!r.text.includes('about-video-wait'), r.text);
    assert.ok(!r.text.includes('&amp;t=30'), r.text);
    // rejecting leaves the placeholder in place
    r = await h.req('/th/about', { cookie: 'consent=denied' });
    assert.ok(r.text.includes('about-video-wait'), r.text);
    assert.ok(!r.text.includes('<iframe'), r.text);

    // the cookie table on /privacy lists the YouTube row while a video is set
    r = await h.req('/th/privacy');
    assert.ok(r.text.includes('>YouTube<'), r.text);
    assert.ok(r.text.includes(strings.th.cookiePurposeYouTube), r.text);

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
      await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_image: bad } });
      assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined, bad);
      // and the same line among good ones is the only one dropped
      await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_image: '/uploads/ok.webp\n' + bad } });
      assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), { value: '/uploads/ok.webp' }, bad);
    }
    // a link with no video id in it is stored as empty rather than kept to fail silently on the page
    for (const bad of ['https://evil.example.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'not a link']) {
      await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_video: bad } });
      assert.equal(await get("SELECT value FROM settings WHERE key = 'about_video' AND lang = '*'"), undefined, bad);
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

    // Several pictures, one per line, make the portrait a slideshow: every slide is rendered with the first
    // one showing, so the page is right before the script runs and with JavaScript off. The line that is not
    // a picture is dropped on the way in rather than shown as a broken image.
    await h.req('/admin/settings', {
      method: 'POST',
      form: { ...filled, about_image: '/uploads/one.webp\n  not-a-picture  \n/uploads/two.webp\nhttps://cdn.example.com/three.webp' }
    });
    assert.deepEqual(
      await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"),
      { value: '/uploads/one.webp\n/uploads/two.webp\nhttps://cdn.example.com/three.webp' }
    );
    r = await h.req('/th/about');
    assert.ok(r.text.includes('<div class="about-slides" data-slides>'), r.text);
    assert.ok(r.text.includes('<div class="about-slide is-current">'), r.text);
    assert.ok(r.text.includes('<div class="about-slide" aria-hidden="true">'), r.text);
    assert.ok(!r.text.includes('not-a-picture'), r.text);
    // the dots, and the script that moves the slideshow along, only exist when there is more than one picture
    assert.equal((r.text.match(/data-slide-to="/g) || []).length, 3);
    assert.ok(r.text.includes('aria-label="รูปที่ 2"'), r.text);
    assert.ok(r.text.includes('<script src="/js/about.js?v='), r.text);

    // one picture stays one plain image, with no slideshow machinery around it
    await h.req('/admin/settings', { method: 'POST', form: { ...filled, about_image: '/uploads/one.webp' } });
    r = await h.req('/th/about');
    assert.ok(r.text.includes('<img class="about-portrait" src="/uploads/one.webp"'), r.text);
    assert.ok(!r.text.includes('about-slides'), r.text);
    assert.ok(!r.text.includes('/js/about.js'), r.text);

    // clearing the fields deletes the rows and the blocks disappear again
    await h.req('/admin/settings', { method: 'POST', form: { site_name: 'พอร์ตของผม', email: 'hello@example.com' } });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_image' AND lang = '*'"), undefined);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_quote' AND lang = 'th'"), undefined);
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('about-portrait'), r.text);
    assert.ok(!r.text.includes('about-quote'), r.text);
    assert.ok(!r.text.includes('about-swatch'), r.text);
    assert.ok(!r.text.includes('youtube-nocookie'), r.text);
    // with no video left, /privacy drops the YouTube row again
    r = await h.req('/th/privacy');
    assert.ok(!r.text.includes('>YouTube<'), r.text);
    // the contact block stays, because the email alone is enough to fill it
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);
  } finally {
    await h.stop();
  }
});
