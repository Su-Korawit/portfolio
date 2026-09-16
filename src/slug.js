// Slugs are ASCII only (spec 2.3). Thai letters are stripped, so a title in Thai only gives ''.
const toSlug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The class is U+0E00 to U+0E7F, the Thai block, written with literal characters exactly as in spec 2.3.
const hasThai = s => /[฀-๿]/.test(s || '');

const ACTIVE = ['draft', 'published'];

// Steps 1 and 2 of spec 2.3 for one language: the typed slug, otherwise the title when it has no Thai letters.
// A slug typed in Thai still counts as typed, so it strips to '' and goes on to step 3, not step 2.
function ownSlug({ slug, title }) {
  if (String(slug || '').trim()) return toSlug(slug);
  return hasThai(title) ? '' : toSlug(title);
}

// input is { th: { status, slug, title }, en: { status, slug, title } }. A language that is none gets ''.
// Step 3 borrows the other language's slug from steps 1 and 2, and a language that is none has nothing to lend.
// A language that is still '' is step 4, and the caller shows the error.
function resolveSlugs(input) {
  const active = lang => ACTIVE.includes((input[lang] || {}).status);
  const own = lang => (active(lang) ? ownSlug(input[lang]) : '');
  return {
    th: active('th') ? own('th') || own('en') : '',
    en: active('en') ? own('en') || own('th') : ''
  };
}

module.exports = { toSlug, hasThai, resolveSlugs };
