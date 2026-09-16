const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertProject, run } = require('./helpers');
const strings = require('../src/strings');

test('12 project order', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="project-card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);

    // before any project: /projects says so, and the home page has no featured section
    let r = await h.req('/th/projects');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(strings.th.noProjects), r.text);
    r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes(strings.th.featuredProjects), r.text);

    // spec test 12: A (featured, sort 2), B (featured, sort 1), C (not featured, sort 0)
    const { lastID: tagId } = await run(
      "INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')"
    );
    await insertProject({ featured: 1, sort_order: 2, demo_url: 'https://a.example.com', th: { slug: 'project-a', title: 'โปรเจกต์ A' } });
    const b = await insertProject({
      featured: 1,
      sort_order: 1,
      thumbnail: '/uploads/b.png',
      repo_url: 'https://github.com/example/b',
      tags: [tagId],
      th: {
        slug: 'project-b',
        title: 'โปรเจกต์ B',
        summary: 'สรุปของโปรเจกต์ B',
        thumbnail_alt: 'ภาพหน้าจอโปรเจกต์ B',
        body_markdown: '```js\nconst b = 1;\n```\n'
      },
      en: { status: 'draft', slug: 'project-b', title: 'EN DRAFT B', thumbnail_alt: 'Project B screenshot' }
    });
    await insertProject({ featured: 0, sort_order: 0, th: { slug: 'project-c', title: 'โปรเจกต์ C' } });

    r = await h.req('/th/projects');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a', '/th/projects/project-c']);

    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a']);
    assert.ok(!r.text.includes('โปรเจกต์ C'), r.text);
    assert.ok(r.text.includes('<h2>' + strings.th.featuredProjects + '</h2>'), r.text);
    assert.ok(r.text.includes('href="/th/projects">' + strings.th.allProjects + '</a>'), r.text);

    // sort_order beats insertion order, id breaks a tie, a draft never shows even when featured,
    // and a project with only an English translation is an English card with a badge on the Thai page
    await insertProject({ th: { slug: 'project-d', title: 'โปรเจกต์ D' } });
    await insertProject({ sort_order: -1, en: { slug: 'english-only', title: 'English only project' } });
    await insertProject({ featured: 1, th: { status: 'draft', slug: 'secret-project', title: 'โปรเจกต์ลับ' } });
    const order = ['/th/projects/project-b', '/th/projects/project-a', '/en/projects/english-only', '/th/projects/project-c', '/th/projects/project-d'];

    r = await h.req('/th/projects');
    assert.deepEqual(hrefs(r.text), order);
    assert.ok(!r.text.includes('โปรเจกต์ลับ'), r.text);
    let card = cards(r.text).find(c => c.includes('English only project'));
    assert.ok(card.startsWith('<article class="project-card" lang="en">'), card);
    assert.ok(card.includes(strings.th.badgeOtherLang), card);
    card = cards(r.text).find(c => c.includes('โปรเจกต์ B'));
    assert.ok(card.startsWith('<article class="project-card">'), card);
    assert.ok(card.includes('<img class="project-thumb" src="/uploads/b.png" alt="" loading="lazy">'), card);
    assert.ok(card.includes('สรุปของโปรเจกต์ B'), card);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/projects">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/projects">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects" lang="en" hreflang="en"'), r.text);
    assert.equal((await h.req('/th/projects/secret-project')).status, 404);

    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a']);

    // /en/projects keeps the same order, and Thai projects are Thai cards with a badge
    r = await h.req('/en/projects');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), order);
    card = cards(r.text).find(c => c.includes('โปรเจกต์ B'));
    assert.ok(card.startsWith('<article class="project-card" lang="th">'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);
    assert.ok(!r.text.includes('EN DRAFT B'), r.text);

    // the project page: summary, a repo link without a demo link, text-only tag chips and the thumbnail alt of this language
    r = await h.req('/th/projects/project-b');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>โปรเจกต์ B</h1>'), r.text);
    assert.ok(r.text.includes('<p class="project-summary">สรุปของโปรเจกต์ B</p>'), r.text);
    assert.ok(r.text.includes('<a href="https://github.com/example/b">' + strings.th.projectRepo + '</a>'), r.text);
    assert.ok(!r.text.includes(strings.th.projectDemo), r.text);
    assert.ok(r.text.includes('<span class="tag">คอนเทนเนอร์</span>'), r.text);
    assert.ok(!r.text.includes('/tags/containers'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/b.png" alt="ภาพหน้าจอโปรเจกต์ B">'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/projects/project-b">'), r.text);
    assert.ok(r.text.includes('<meta property="og:image" content="http://test.local/uploads/b.png">'), r.text);
    // English is still a draft: no hreflang, and the switch link goes to the English project list
    assert.ok(!r.text.includes('rel="alternate"'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects" lang="en" hreflang="en"'), r.text);
    assert.ok(r.text.includes('href="/th/projects">' + strings.th.backToProjects + '</a>'), r.text);
    assert.ok(!r.text.includes('preview-bar'), r.text);
    assert.equal((await h.req('/en/projects/project-b')).status, 404);

    // project A has a demo link and no repo link
    r = await h.req('/th/projects/project-a');
    assert.ok(r.text.includes('<a href="https://a.example.com">' + strings.th.projectDemo + '</a>'), r.text);
    assert.ok(!r.text.includes(strings.th.projectRepo), r.text);

    // once English is published, the two project pages point at each other
    await run(
      "UPDATE project_translations SET status = 'published', title = 'Project B', published_at = ? WHERE project_id = ? AND lang = 'en'",
      ['2026-09-13T08:00:00.000Z', b]
    );
    r = await h.req('/en/projects/project-b');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/b.png" alt="Project B screenshot">'), r.text);
    assert.ok(r.text.includes('<span class="tag">Containers</span>'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="th" href="http://test.local/th/projects/project-b">'), r.text);
    r = await h.req('/th/projects/project-b');
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/projects/project-b">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects/project-b" lang="en" hreflang="en"'), r.text);
  } finally {
    await h.stop();
  }
});
