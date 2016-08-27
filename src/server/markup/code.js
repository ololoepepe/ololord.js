import _ from 'underscore';
import Highlight from 'highlight.js';
import MathJax from 'mathjax-node/lib/mj-single.js';

import * as Tools from '../helpers/tools';
import * as MiscModel from '../models/misc';

Highlight.configure({
  tabReplace: '    ',
  useBR: true
});

MathJax.config({ MathJax: {} });
MathJax.start();

let langs = Highlight.listLanguages().map((lang) => {
  let aliases = Highlight.getLanguage(lang).aliases || [];
  aliases.unshift(lang);
  return aliases;
});
langs = _(langs).flatten().map(lang => Tools.escapeRegExp(lang)).join('|');

function markupCode(text, lang) {
  let result = lang ? Highlight.highlight(lang, text, true) : Highlight.highlightAuto(text);
  text = result.value;
  lang = result.language || lang;
  let langClass = lang ? ` ${lang}` : '';
  let langNames = MiscModel.codeLangNames();
  let langName = langNames.hasOwnProperty(lang) ? langNames[lang] : lang;
  return {
    op: `<div class='code-block${langClass} hljs js-with-tooltip' title='${langName || ''}'>`,
    cl: '</div>',
    text: Highlight.fixMarkup(text)
  };
}

async function markupLaTeX(text, inline) {
  return await new Promise(function(resolve, reject) {
    MathJax.typeset({
      math: text,
      format: inline ? 'inline-TeX' : 'TeX',
      svg: true
    }, (data) => {
      if (data.errors) {
        return reject(data.errors[0] || data.errors);
      }
      let tagName = inline ? 'span' : 'div';
      resolve(`<${tagName} class='latex-${inline ? 'inline' : 'block'}'>${data.svg}</${tagName}>`);
    });
  });
}

function convertCode(_1, text, matchs, _2, options) {
  options.type = 'CODE_SKIP';
  let result = markupCode(text, matchs[1]);
  options.op = result.op;
  options.cl = result.cl;
  return result.text;
}

function convertLatex(inline, _1, text, _2, _3, options) {
  options.type = 'HTML_SKIP';
  return markupLaTeX(text, inline);
}

function checkLangsMatch(info, matchs, matche) {
  return matchs && matche && matchs[1] && matchs[1] === matche[1];
}

let elements = [{
  priority: 300,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertCode,
  op: new RegExp(`/\\-\\-code\\s+(${langs})\\s+`, 'gi'),
  cl: /\s+\\\\\\-\\-/g
}, {
  priority: 400,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertLatex.bind(null, false),
  op: '$$$'
}, {
  priority: 500,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertLatex.bind(null, true),
  op: '$$'
}, {
  priority: 800,
  markupModes: ['BB_CODE'],
  convert: convertCode,
  op: '[code]',
  cl: '[/code]'
}, {
  priority: 900,
  markupModes: ['BB_CODE'],
  convert: convertCode,
  op: new RegExp(`\\[code\\s+lang\\=\"?('${langs})\"?\\s*\\]`, 'gi'),
  cl: '[/code]'
}, {
  priority: 1000,
  markupModes: ['BB_CODE'],
  convert: convertCode,
  op: new RegExp(`\\[(${langs})\\]`, 'gi'),
  cl: new RegExp(`\\[/(${langs})\\]`, 'gi'),
  check: checkLangsMatch
}, {
  priority: 1300,
  markupModes: ['BB_CODE'],
  convert: convertLatex.bind(null, false),
  op: '[latex]',
  cl: '[/latex]'
}, {
  priority: 1400,
  markupModes: ['BB_CODE'],
  convert: convertLatex.bind(null, true),
  op: '[l]',
  cl: '[/l]'
}];

elements.markupCode = markupCode;
elements.markupLaTeX = markupLaTeX;

export default elements;
