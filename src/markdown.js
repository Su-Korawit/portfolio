const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/common');

hljs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));

module.exports = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  highlight: (code, lang) =>
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : ''
});
