const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');
const { plan, seed } = require('../scripts/seed-about');

// scripts/seed-about.js writes the about page's settings from a JSON file. It goes through the same
// src/settings.js filtering as the admin form, so it cannot put a value on the page that the form would
// have refused.
test('20 seed about', async () => {
  const h = await start();
  try {
    // a blank value leaves whatever is already there alone, so running a template file cannot wipe a page
    // that was filled in from the admin page
    await seed({ th: { about_name: 'กรวิชญ์' } });
    await seed({ th: { about_name: '   ' } });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_name' AND lang = 'th'"), { value: 'กรวิชญ์' });

    await seed({
      global: {
        about_colors: '#EDE7F6, #D1C4E9, #B39DDB, #9575CD',
        about_video: 'https://youtu.be/dQw4w9WgXcQ',
        instagram_url: 'https://instagram.com/example'
      },
      th: { about_quote: 'จงรักชีวิตของคุณ', about_quote_source: 'วอลเดน' },
      en: { about_quote: 'Love your life, poor as it is.' }
    });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_colors' AND lang = '*'"), { value: '#EDE7F6, #D1C4E9, #B39DDB, #9575CD' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_quote' AND lang = 'en'"), { value: 'Love your life, poor as it is.' });

    // and the page really is built from what was seeded
    let r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<p class="about-name">กรวิชญ์</p>'), r.text);
    assert.ok(r.text.includes('<blockquote class="about-quote">จงรักชีวิตของคุณ</blockquote>'), r.text);
    assert.ok(r.text.includes('style="background: #B39DDB"'), r.text);
    assert.ok(r.text.includes('data-embed-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"'), r.text);
    assert.ok(r.text.includes('<li><a href="https://instagram.com/example">Instagram</a></li>'), r.text);

    // null clears a setting on purpose, which is the only way the script removes a row
    await seed({ th: { about_name: null } });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_name' AND lang = 'th'"), undefined);

    // a typo in a key name, a wrong shape, or a value the form would reject stops the whole run
    for (const [data, hint] of [
      [{ global: { about_colour: '#fff' } }, 'not a setting'],
      [{ nope: { about_name: 'x' } }, 'not a section'],
      [{ global: { github_url: 'javascript:alert(1)' } }, 'would accept'],
      [{ global: { about_image: '//evil.example.com/x.png' } }, 'would accept'],
      [{ global: { about_video: 'https://evil.example.com/watch?v=dQw4w9WgXcQ' } }, 'would accept'],
      [{ th: { about_name: 42 } }, 'must be a string'],
      [{ th: ['about_name'] }, 'key/value pairs'],
      ['not an object', 'JSON object']
    ]) {
      assert.throws(() => plan(data), err => err.message.includes(hint), JSON.stringify(data));
    }

    // a refused value leaves the database untouched, rather than writing the rows that came before it
    await assert.rejects(seed({ global: { email: 'hello@example.com', github_url: 'javascript:alert(1)' } }));
    assert.equal(await get("SELECT value FROM settings WHERE key = 'email' AND lang = '*'"), undefined);

    // --dry-run reports what it would do and writes nothing
    const rows = await seed({ global: { email: 'hello@example.com' } }, { dryRun: true });
    assert.deepEqual(rows, [{ key: 'email', lang: '*', value: 'hello@example.com', action: 'set' }]);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'email' AND lang = '*'"), undefined);

    // session_epoch is not a settings key, so the script can never touch the admin's sessions
    assert.throws(() => plan({ global: { session_epoch: '9' } }), /not a setting/);
  } finally {
    await h.stop();
  }
});
