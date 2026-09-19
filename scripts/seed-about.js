// Fills in the settings that the about page is built from, so the owner does not have to retype them into
// /admin/settings after a fresh deploy. Reads a JSON file (scripts/about-seed.json by default) and upserts
// every value in it.
//
//   node scripts/seed-about.js [file] [--dry-run]
//
// The values go through the same src/settings.js filtering as the admin form, and an unknown key or a value
// the form would reject stops the run before anything is written - a seed that half-applied would be worse
// than one that refused. A blank value is skipped rather than written, so a template file with empty fields
// cannot wipe settings that were already filled in from the admin page; null clears a setting on purpose.
const fs = require('node:fs');
const path = require('node:path');
const { GLOBAL_KEYS, LANG_KEYS, clean } = require('../src/settings');

const LANGS = ['th', 'en'];

// Turns the file into the rows to write, or throws with every problem it found at once, so a typo in the
// file is reported in full instead of one run at a time.
function plan(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('the seed file must be a JSON object with "global", "th" and "en" sections');
  }
  const problems = [];
  const rows = [];

  const section = (name, keys, lang) => {
    const values = data[name];
    if (values === undefined) return;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      problems.push(`"${name}" must be an object of key/value pairs`);
      return;
    }
    for (const [key, value] of Object.entries(values)) {
      if (!keys.includes(key)) {
        problems.push(`"${name}.${key}" is not a setting this site has`);
        continue;
      }
      if (value === null) {
        rows.push({ key, lang, value: '', action: 'delete' });
        continue;
      }
      if (typeof value !== 'string') {
        problems.push(`"${name}.${key}" must be a string, or null to clear it`);
        continue;
      }
      if (!value.trim()) {
        rows.push({ key, lang, value: '', action: 'skip' });
        continue;
      }
      const cleaned = clean(key, value);
      if (!cleaned) {
        problems.push(`"${name}.${key}" is not a value the settings form would accept, so it was not written`);
        continue;
      }
      rows.push({ key, lang, value: cleaned, action: 'set' });
    }
  };

  section('global', GLOBAL_KEYS, '*');
  for (const lang of LANGS) section(lang, LANG_KEYS, lang);

  for (const name of Object.keys(data)) {
    if (name !== 'global' && !LANGS.includes(name)) problems.push(`"${name}" is not a section (expected global, th or en)`);
  }
  if (problems.length) throw new Error('nothing was written:\n  - ' + problems.join('\n  - '));
  return rows;
}

// Separate from plan() so a test can check the file is understood without touching a database.
async function seed(data, { dryRun = false } = {}) {
  const rows = plan(data);
  if (dryRun) return rows;
  const { ready, run, transaction } = require('../src/db');
  await ready;
  await transaction(async () => {
    for (const row of rows) {
      if (row.action === 'skip') continue;
      if (row.action === 'set') {
        await run(`INSERT INTO settings (key, lang, value) VALUES (?, ?, ?)
                   ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value`, [row.key, row.lang, row.value]);
      } else {
        await run('DELETE FROM settings WHERE key = ? AND lang = ?', [row.key, row.lang]);
      }
    }
  });
  return rows;
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const file = argv.find(arg => !arg.startsWith('--')) || path.join(__dirname, 'about-seed.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`cannot read ${file}: ${err.message}`);
    process.exit(1);
  }
  let rows;
  try {
    rows = await seed(data, { dryRun });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  for (const row of rows) {
    const where = row.lang === '*' ? '' : ' [' + row.lang + ']';
    console.log(`${row.action.padEnd(6)} ${row.key}${where}`);
  }
  const written = rows.filter(row => row.action !== 'skip').length;
  const skipped = rows.length - written;
  console.log(`${dryRun ? 'would write' : 'wrote'} ${written} setting(s) from ${file}` + (skipped ? `, skipped ${skipped} blank` : ''));
  if (!dryRun) await require('../src/db').close();
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { plan, seed };
