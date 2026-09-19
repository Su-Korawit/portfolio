const test = require('node:test');
const assert = require('node:assert/strict');

// spec test 17: this file sets GA_MEASUREMENT_ID before requiring helpers.js, which never overwrites it
process.env.GA_MEASUREMENT_ID = 'G-TEST';

const { start, run } = require('./helpers');
const strings = require('../src/strings');

test('17 consent, analytics and privacy', async () => {
  const h = await start();
  try {
    // spec test 17, part 1: a page with no cookies at all shows the consent bar and carries the analytics id
    let r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('data-consent-bar'), r.text);
    assert.ok(r.text.includes('data-ga-id="G-TEST"'), r.text);
    assert.ok(r.text.includes(strings.th.consentAccept), r.text);
    assert.ok(r.text.includes(strings.th.consentReject), r.text);

    // spec test 17, part 2: a reader who already said "denied" gets no bar; the script still loads either way,
    // because the reader can still change their mind later on the privacy page
    r = await h.req('/th', { jar: false, cookie: 'consent=denied' });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('data-consent-bar'), r.text);
    assert.ok(r.text.includes('data-ga-id="G-TEST"'), r.text);

    // spec test 17, part 3: an admin preview never carries the bar or the analytics id, even with consent=granted
    await h.login();
    r = await h.req('/admin/posts/preview/th', {
      method: 'POST',
      cookie: 'consent=granted',
      form: { th: { status: 'draft', title: 'ตัวอย่างพรีวิว', slug: 'preview-post' } }
    });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('G-TEST'), r.text);
    assert.ok(!r.text.includes('data-consent-bar'), r.text);

    // spec test 17, part 4: /th/privacy lists ta_admin, lang, consent and _ga (GA_MEASUREMENT_ID is set in this file)
    r = await h.req('/th/privacy');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ta_admin'), r.text);
    assert.ok(r.text.includes('>lang<'), r.text);
    assert.ok(r.text.includes('>consent<'), r.text);
    assert.ok(r.text.includes('_ga'), r.text);

    // the footer's link to privacy is on every public page
    r = await h.req('/en/blog');
    assert.ok(r.text.includes('href="/en/privacy"'), r.text);

    // privacy_body is markdown the owner writes in admin settings (spec 4.2), rendered the same as about_body
    await run(`INSERT INTO settings (key, lang, value) VALUES ('privacy_body', 'th', ?)`, ['เว็บนี้ดูแลโดย **เจ้าของ**']);
    r = await h.req('/th/privacy');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<strong>เจ้าของ</strong>'), r.text);
    // the settings page has textareas for both languages, the same convention as about_body
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="th[privacy_body]"'), r.text);
    assert.ok(r.text.includes('name="en[privacy_body]"'), r.text);
    assert.ok(r.text.includes('เว็บนี้ดูแลโดย **เจ้าของ**'), r.text);

    // public/js/consent.js is served as a real static file, and the tag that loads it carries the version query
    r = await h.req('/js/consent.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /javascript/);
    assert.ok(r.text.includes('googletagmanager.com'), r.text);
    r = await h.req('/th');
    assert.ok(r.text.includes('<script src="/js/consent.js?v='), r.text);

    // consent.js hides the bar with the hidden attribute, and .consent-bar sets display: flex - an author
    // rule that beats the browser's own [hidden] { display: none }, so the bar stayed on screen after the
    // reader answered until the stylesheet said otherwise. This keeps that rule from being dropped again.
    r = await h.req('/css/site.css');
    assert.equal(r.status, 200);
    assert.ok(/\.consent-bar\[hidden\]\s*\{[^}]*display:\s*none/.test(r.text), r.text);
  } finally {
    await h.stop();
  }
});
