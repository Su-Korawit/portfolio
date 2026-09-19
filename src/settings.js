const { videoId } = require('./youtube');

// The settings the site knows about, and what a value of each may contain. The admin form and
// scripts/seed-about.js both go through this file, so a value written by the script is filtered exactly like
// one typed into the form - nothing reaches an href, an <img src> or a style attribute that the form would
// have rejected.
const GLOBAL_KEYS = [
  'site_name', 'about_image', 'about_video', 'about_colors',
  'github_url', 'linkedin_url', 'x_url', 'instagram_url', 'email'
];
const LANG_KEYS = [
  'tagline', 'about_body', 'about_image_alt', 'about_name', 'about_facts',
  'about_quote', 'about_quote_source', 'about_contact', 'privacy_body'
];

// The social links become href in about.ejs, footer.ejs and privacy.ejs, where <%= %> escapes HTML but lets a
// javascript: link through. The same pattern as admin-projects.js's URL_PATTERN.
const URL_KEYS = ['github_url', 'linkedin_url', 'x_url', 'instagram_url'];
const URL_PATTERN = /^https?:\/\/\S+$/i;
// about_image becomes an <img src>. /admin/upload answers with '/uploads/<name>' locally and an absolute R2
// URL in production, so both shapes are allowed and nothing else is - '//host/x' and a javascript: or data:
// value are not.
const IMAGE_PATTERN = /^(https?:\/\/\S+|\/[^\s/]\S*)$/i;

// Returns the value to store: the trimmed input when it passes, or '' when it does not. An empty result
// deletes the row, which is how the form clears a field, so a rejected value never lingers as a stale row.
function clean(key, value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (URL_KEYS.includes(key)) return URL_PATTERN.test(text) ? text : '';
  if (key === 'about_image') return IMAGE_PATTERN.test(text) ? text : '';
  if (key === 'about_video') return videoId(text) ? text : '';
  return text;
}

module.exports = { GLOBAL_KEYS, LANG_KEYS, URL_KEYS, clean };
