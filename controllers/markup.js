'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _highlight = require('highlight.js');

var _highlight2 = _interopRequireDefault(_highlight);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _markup = require('../helpers/markup');

var _markup2 = _interopRequireDefault(_markup);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

var CODE_TO_MARKUP = 'static const int x = 0;';
var LATEX_TO_MARKUP = 'v=v_0+\\frac{at^2}{2}';
var INLINE_LATEX_TO_MARKUP = 'E=mc^2';

router.paths = function () {
  return ['/markup.html'];
};

router.render = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
  var result, markedUpLatex, markedUpInlineLatex, model;
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _highlight2.default.configure({
            tabReplace: '    ',
            useBR: true
          });
          result = _markup2.default.markpCode(CODE_TO_MARKUP, 'cpp');
          _context.next = 4;
          return Tools.markupLatex(LATEX_TO_MARKUP);

        case 4:
          markedUpLatex = _context.sent;
          _context.next = 7;
          return Tools.markupLatex(INLINE_LATEX_TO_MARKUP, true);

        case 7:
          markedUpInlineLatex = _context.sent;
          model = _defineProperty({
            title: Tools.translate('Markup', 'pageTitle'),
            codeToMarkup: CODE_TO_MARKUP,
            markedUpCode: result.op + result.text + result.cl,
            latexToMarkup: LATEX_TO_MARKUP,
            markedUpLatex: markedUpLatex,
            inlineLatexToMarkup: INLINE_LATEX_TO_MARKUP
          }, 'inlineLatexToMarkup', inlineLatexToMarkup);
          return _context.abrupt('return', { 'markup.html': Renderer.render('pages/markup', model) });

        case 10:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, this);
}));

module.exports = router;
//# sourceMappingURL=markup.js.map
