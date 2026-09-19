const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/common');

hljs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  highlight: (code, lang) =>
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : ''
});

// Only link URLs with a scheme (https://...) and emails. Fuzzy links would
// turn file names like index.md or run.sh into links (.md and .sh are TLDs).
md.linkify.set({ fuzzyLink: false });

// linkify-it treats Thai letters as part of a URL, so "https://x.comครับ"
// would link the whole thing. Cut each match at its first Thai character.
function trimThai(link) {
  if (!link) return link;
  const thai = link.text.search(/[\u0E00-\u0E7F]/);
  if (thai < 0) return link;
  const text = link.text.slice(0, thai).replace(/[.,;:!?]+$/, '');
  const cut = link.text.length - text.length;
  if (!/[^:/]$/.test(text) || text.length <= (link.schema || '').length + 2) return null;
  link.text = text;
  link.raw = link.raw.slice(0, link.raw.length - cut);
  link.url = link.url.slice(0, link.url.length - cut);
  link.lastIndex -= cut;
  return link;
}

const match = md.linkify.match.bind(md.linkify);
const matchAtStart = md.linkify.matchAtStart.bind(md.linkify);
md.linkify.match = (text) => {
  const links = match(text);
  return links && links.map(trimThai).filter(Boolean);
};
md.linkify.matchAtStart = (text) => trimThai(matchAtStart(text));

// A paragraph that holds nothing but one image becomes a <figure>, and the alt text is repeated below it as a
// <figcaption> - the way a picture sits in a long-form article, captioned rather than floating in a paragraph.
// The caption is pushed as a text token, so markdown-it's renderer escapes it like any other text.
md.core.ruler.push('image_figure', state => {
  const tokens = state.tokens;
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open' || tokens[i + 2].type !== 'paragraph_close') continue;
    const inline = tokens[i + 1];
    if (inline.type !== 'inline') continue;
    const children = inline.children.filter(token => token.type !== 'text' || token.content.trim());
    if (children.length !== 1 || children[0].type !== 'image') continue;

    tokens[i].tag = 'figure';
    tokens[i + 2].tag = 'figure';
    inline.children = children;

    const alt = children[0].content;
    if (!alt) continue;
    const open = new state.Token('figcaption_open', 'figcaption', 1);
    const text = new state.Token('text', '', 0);
    text.content = alt;
    inline.children.push(open, text, new state.Token('figcaption_close', 'figcaption', -1));
  }
});

module.exports = md;
