// The about page embeds one YouTube video. The owner pastes whatever link YouTube gave them, and this file
// pulls the video id out of it: an id is exactly 11 characters of [A-Za-z0-9_-], so a value that matches
// nothing here has no id and the block is left out. Only an id this file recognised ever reaches the embed
// URL in about.ejs, which is what keeps an arbitrary string out of an <iframe src>.
const ID = '([A-Za-z0-9_-]{11})';
const HOST = '(?:www\\.|m\\.)?';
const PATTERNS = [
  new RegExp('^' + ID + '$'),
  new RegExp('^https?://' + HOST + 'youtube\\.com/watch\\?(?:[^#]*&)?v=' + ID + '(?:[&#].*)?$', 'i'),
  new RegExp('^https?://' + HOST + 'youtube\\.com/(?:embed|shorts|live|v)/' + ID + '(?:[?/#].*)?$', 'i'),
  new RegExp('^https?://' + HOST + 'youtube-nocookie\\.com/embed/' + ID + '(?:[?/#].*)?$', 'i'),
  new RegExp('^https?://youtu\\.be/' + ID + '(?:[?#].*)?$', 'i')
];

function videoId(value) {
  const text = String(value || '').trim();
  for (const pattern of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[1];
  }
  return '';
}

module.exports = { videoId };
