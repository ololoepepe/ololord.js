'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var markupLaTeX = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(text, inline) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return new Promise(function (resolve, reject) {
              _mjSingle2.default.typeset({
                math: text,
                format: inline ? 'inline-TeX' : 'TeX',
                svg: true
              }, function (data) {
                if (data.errors) {
                  return reject(data.errors[0] || data.errors);
                }
                var tagName = inline ? 'span' : 'div';
                resolve('<' + tagName + ' class=\'latex-' + (inline ? 'inline' : 'block') + '\'>' + data.svg + '</' + tagName + '>');
              });
            });

          case 2:
            return _context.abrupt('return', _context.sent);

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function markupLaTeX(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _highlight = require('highlight.js');

var _highlight2 = _interopRequireDefault(_highlight);

var _mjSingle = require('mathjax-node/lib/mj-single.js');

var _mjSingle2 = _interopRequireDefault(_mjSingle);

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_highlight2.default.configure({
  tabReplace: '    ',
  useBR: true
});

_mjSingle2.default.config({ MathJax: {} });
_mjSingle2.default.start();

var langs = _highlight2.default.listLanguages().map(function (lang) {
  var aliases = _highlight2.default.getLanguage(lang).aliases || [];
  aliases.unshift(lang);
  return aliases;
});
langs = (0, _underscore2.default)(langs).flatten().map(function (lang) {
  return Tools.escapeRegExp(lang);
}).join('|');

function markupCode(text, lang) {
  var result = lang ? _highlight2.default.highlight(lang, text, true) : _highlight2.default.highlightAuto(text);
  text = result.value;
  lang = result.language || lang;
  var langClass = lang ? ' ' + lang : '';
  var langNames = MiscModel.codeLangNames();
  var langName = langNames.hasOwnProperty(lang) ? langNames[lang] : lang;
  return {
    op: '<div class=\'code-block' + langClass + ' hljs js-with-tooltip\' title=\'' + (langName || '') + '\'>',
    cl: '</div>',
    text: _highlight2.default.fixMarkup(text)
  };
}

function convertCode(_1, text, matchs, _2, options) {
  options.type = _processingContext2.default.CODE_SKIP;
  var result = markupCode(text, matchs[1]);
  options.op = result.op;
  options.cl = result.cl;
  return result.text;
}

function convertLatex(inline, _1, text, _2, _3, options) {
  options.type = _processingContext2.default.HTML_SKIP;
  return markupLaTeX(text, inline);
}

function checkLangsMatch(info, matchs, matche) {
  return matchs && matche && matchs[1] && matchs[1] === matche[1];
}

var elements = [{
  priority: 300,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertCode,
  op: new RegExp('/\\-\\-code\\s+(' + langs + ')\\s+', 'gi'),
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
  op: new RegExp('\\[code\\s+lang\\="?(\'' + langs + ')"?\\s*\\]', 'gi'),
  cl: '[/code]'
}, {
  priority: 1000,
  markupModes: ['BB_CODE'],
  convert: convertCode,
  op: new RegExp('\\[(' + langs + ')\\]', 'gi'),
  cl: new RegExp('\\[/(' + langs + ')\\]', 'gi'),
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

Object.defineProperty(elements, "markupCode", { value: markupCode });
Object.defineProperty(elements, 'markupLaTeX', { value: markupLaTeX });

exports.default = elements;
//# sourceMappingURL=code.js.map
