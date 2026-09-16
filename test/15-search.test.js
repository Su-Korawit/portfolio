const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject } = require('./helpers');
const strings = require('../src/strings');

test('15 search', async () => {
  const h = await start();
  try {
    // spec test 15, part 1: a Thai word in the middle of a sentence is found; a draft with the same word is not
    await insertPost({
      th: {
        slug: 'trip-japan',
        title: 'เที่ยวญี่ปุ่น',
        excerpt: 'บันทึกทริปปีนี้',
        body_markdown: 'ปีนี้ไปเที่ยวประเทศญี่ปุ่นมา สนุกมาก'
      }
    });
    await insertPost({
      th: {
        status: 'draft',
        slug: 'trip-japan-draft',
        title: 'ร่างญี่ปุ่นที่ยังไม่เผยแพร่',
        body_markdown: 'ร่างที่พูดถึงญี่ปุ่นเหมือนกัน แต่ยังไม่เผยแพร่'
      }
    });
    let r = await h.req('/th/search?q=' + encodeURIComponent('ญี่ปุ่น'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/blog/trip-japan"'), r.text);
    assert.ok(!r.text.includes('trip-japan-draft'), r.text);
    assert.ok(!r.text.includes('ร่างญี่ปุ่นที่ยังไม่เผยแพร่'), r.text);
    // the search link is on every public page's nav
    assert.ok(r.text.includes('<a href="/th/search">' + strings.th.navSearch + '</a>'), r.text);
    // the language switch link keeps q (plan contract note for Task 17)
    assert.ok(r.text.includes('class="lang-switch" href="/en/search?q=' + encodeURIComponent('ญี่ปุ่น') + '"'), r.text);

    // spec test 15, part 2: a post published in both languages where the term is only in the Thai body still
    // shows up on /en/search, as an English card (its own published translation), not a Thai-flagged fallback
    await insertPost({
      th: { slug: 'docker-th', title: 'เริ่มต้นกับ Docker', body_markdown: 'บทความนี้พูดถึงคอนเทนเนอร์อย่างละเอียด' },
      en: { slug: 'docker-en', title: 'Getting started with Docker', body_markdown: 'This post is about containers in general.' }
    });
    r = await h.req('/en/search?q=' + encodeURIComponent('คอนเทนเนอร์'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/en/blog/docker-en"'), r.text);
    assert.ok(!r.text.includes('href="/th/blog/docker-th"'), r.text);
    assert.ok(!r.text.includes(strings.en.badgeOtherLang), r.text);

    // spec test 15, part 3: q=100% only finds text that literally contains 100%, not "100" followed by anything else
    await insertPost({ th: { slug: 'percent-post', title: 'ผลทดสอบ', body_markdown: 'ทดสอบแล้วได้ผล 100% แน่นอน' } });
    await insertPost({ th: { slug: 'percent-negative', title: 'ราคาสินค้า', body_markdown: 'ราคา 100 บาทถ้วน ไม่มีส่วนลด' } });
    r = await h.req('/th/search?q=' + encodeURIComponent('100%'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/blog/percent-post"'), r.text);
    assert.ok(!r.text.includes('href="/th/blog/percent-negative"'), r.text);

    // spec test 15, part 4: a published project whose summary has the term shows up under the project results;
    // a draft project with a different term stays out
    await insertProject({ th: { slug: 'infra-project', title: 'Infra Toolkit', summary: 'จัดการ infrastructure ด้วย terraform' } });
    await insertProject({ th: { status: 'draft', slug: 'infra-draft', title: 'Draft Infra', summary: 'ใช้ terraform-draft-only ยังไม่เผยแพร่' } });
    r = await h.req('/th/search?q=terraform');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/projects/infra-project"'), r.text);
    assert.ok(r.text.includes('<h2>' + strings.th.searchProjectsHeading + '</h2>'), r.text);
    r = await h.req('/th/search?q=terraform-draft-only');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('infra-draft'), r.text);
    assert.ok(r.text.includes(strings.th.searchNoResults), r.text);

    // spec test 15, part 5: noindex, no canonical or hreflang, and a 500-character q does not error - it is
    // trimmed to 100 characters before it reaches the query or the page
    const longQ = 'x'.repeat(100) + 'y'.repeat(400);
    r = await h.req('/th/search?q=' + longQ);
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(!r.text.includes('rel="canonical"'), r.text);
    assert.ok(!r.text.includes('rel="alternate"'), r.text);
    const m = r.text.match(/id="q" name="q" maxlength="100" value="([^"]*)"/);
    assert.ok(m, r.text);
    assert.equal(m[1], 'x'.repeat(100));

    // an empty or too-short query shows the hint instead of running any query, and the switch link drops ?q=
    r = await h.req('/en/search');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(strings.en.searchHint), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/th/search"'), r.text);
  } finally {
    await h.stop();
  }
});
