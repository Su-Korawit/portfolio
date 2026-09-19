// How long a post takes to read, shown next to the date on a card and under the byline of a post.
//
// Thai is counted per character and English per word, because Thai text has no spaces between words: splitting
// a Thai paragraph on whitespace counts it as one or two "words" and gives every Thai post one minute. A Thai
// word is about 5.5 characters and a reader gets through roughly 60 of them a minute.
const THAI_CHARS_PER_MINUTE = 330;
const WORDS_PER_MINUTE = 220;

const THAI = /[฀-๿]/g;

// Markdown is stripped down to what is actually read: a fenced block is skipped (code is scanned, not read
// line by line), an image is dropped, a link keeps its text but not its URL, and the remaining syntax
// characters go so "## หัวข้อ" is not counted as two extra words.
function readable(markdown) {
  return String(markdown || '')
    .replace(/```[^]*?(?:```|$)/g, ' ')
    .replace(/~~~[^]*?(?:~~~|$)/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_~`|[\]()]/g, ' ');
}

// Minutes, rounded, never below 1 - a two-line post still takes a moment to read.
function readingMinutes(markdown) {
  const text = readable(markdown);
  const thai = (text.match(THAI) || []).length;
  const words = text.replace(THAI, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(thai / THAI_CHARS_PER_MINUTE + words / WORDS_PER_MINUTE));
}

module.exports = { readingMinutes };
