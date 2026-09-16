const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');
const strings = require('../src/strings');

test('14 settings and about', async () => {
  const h = await start();
  try {
    // before anything is saved, /about has just a heading: no body, no social links
    let r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.th.navAbout + '</h1>'), r.text);
    assert.ok(!r.text.includes('class="prose"'), r.text);
    assert.ok(!r.text.includes('class="social-list"'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.navAbout + ' | Portfolio</title>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/about">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/about">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/about" lang="en" hreflang="en"'), r.text);

    await h.login();

    // the empty settings form: every field blank, plus the revoke-all button
    r = await h.req('/admin/settings');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<a href="/admin/settings" aria-current="page">ตั้งค่า</a>'), r.text);
    assert.ok(r.text.includes('<form class="admin-form" method="post" action="/admin/settings">'), r.text);
    assert.ok(r.text.includes('name="site_name" value=""'), r.text);
    assert.ok(r.text.includes('name="th[tagline]" value=""'), r.text);
    assert.ok(r.text.includes('name="en[about_body]"') && /<textarea[^>]*name="en\[about_body\]"[^>]*>\s*<\/textarea>/.test(r.text), r.text);
    assert.ok(r.text.includes('type="url" name="github_url" value=""'), r.text);
    assert.ok(r.text.includes('<form method="post" action="/admin/sessions/revoke">'), r.text);
    assert.ok(r.text.includes('>ออกจากระบบทุกเครื่อง<'), r.text);

    // a field sent twice arrives as an array, which text() turns into an empty string instead of a 500
    r = await h.req('/admin/settings', { method: 'POST', form: { site_name: ['a', 'b'] } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/settings?saved=1');
    assert.equal(await get("SELECT value FROM settings WHERE key = 'site_name'"), undefined);

    // spec test 14: th[about_body] is bold markdown, github_url stays empty; the rest of the form is filled too
    const form1 = {
      site_name: 'พอร์ตของผม',
      th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
      en: { tagline: 'English tagline', about_body: '' },
      github_url: '',
      linkedin_url: 'https://linkedin.com/in/example',
      x_url: 'https://x.com/example',
      email: 'hello@example.com'
    };
    r = await h.req('/admin/settings', { method: 'POST', form: form1 });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/settings?saved=1');
    r = await h.req(r.location);
    assert.ok(r.text.includes('<p class="form-saved" role="status">บันทึกแล้ว</p>'), r.text);
    // session_epoch is not a field in the form, so it is never touched by saving settings
    assert.equal(await get("SELECT value FROM settings WHERE key = 'session_epoch'"), undefined);

    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'site_name' AND lang = '*'"), { value: 'พอร์ตของผม' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'tagline' AND lang = 'th'"), { value: 'แท็กไลน์ไทย' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_body' AND lang = 'th'"), { value: '**หนา**' });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_body' AND lang = 'en'"), undefined);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'github_url'"), undefined);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'linkedin_url'"), { value: 'https://linkedin.com/in/example' });

    // spec test 14: /th/about has the rendered bold markdown and no GitHub link
    r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<strong>หนา</strong>'), r.text);
    assert.ok(!r.text.includes('github.com'), r.text);
    assert.ok(r.text.includes('<div class="prose">'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.navAbout + ' | พอร์ตของผม</title>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://linkedin.com/in/example">LinkedIn</a></li>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://x.com/example">X</a></li>'), r.text);
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);

    // English about is still empty, so /en/about falls back to the Thai body wrapped with lang="th"
    r = await h.req('/en/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<div class="prose" lang="th">'), r.text);
    assert.ok(r.text.includes('<strong>หนา</strong>'), r.text);

    // the tagline and social links also show on the home page footer
    r = await h.req('/th');
    assert.ok(r.text.includes('<p class="tagline">แท็กไลน์ไทย</p>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://linkedin.com/in/example">LinkedIn</a></li>'), r.text);
    assert.ok(!r.text.includes('github.com'), r.text);

    // saving again: fill github_url and en[about_body]; the settings page round-trips the saved values
    r = await h.req('/admin/settings', {
      method: 'POST',
      form: {
        site_name: 'พอร์ตของผม',
        th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
        en: { tagline: 'English tagline', about_body: '**Bold**' },
        github_url: 'https://github.com/example',
        linkedin_url: 'https://linkedin.com/in/example',
        x_url: 'https://x.com/example',
        email: 'hello@example.com'
      }
    });
    assert.equal(r.status, 303);
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('type="url" name="github_url" value="https://github.com/example"'), r.text);
    assert.ok(/<textarea[^>]*name="en\[about_body\]"[^>]*>\*\*Bold\*\*<\/textarea>/.test(r.text), r.text);

    // English about now has its own content, not the Thai fallback
    r = await h.req('/en/about');
    assert.ok(r.text.includes('<div class="prose">'), r.text);
    assert.ok(!r.text.includes('<div class="prose" lang="th">'), r.text);
    assert.ok(r.text.includes('<strong>Bold</strong>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://github.com/example">GitHub</a></li>'), r.text);

    // clearing github_url again deletes the row instead of leaving a stale one behind
    r = await h.req('/admin/settings', {
      method: 'POST',
      form: {
        site_name: 'พอร์ตของผม',
        th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
        en: { tagline: 'English tagline', about_body: '**Bold**' },
        github_url: '',
        linkedin_url: 'https://linkedin.com/in/example',
        x_url: 'https://x.com/example',
        email: 'hello@example.com'
      }
    });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'github_url'"), undefined);
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('github.com'), r.text);

    // the revoke-all button on the settings page uses the route from Task 8
    r = await h.req('/admin/sessions/revoke', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/settings');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
