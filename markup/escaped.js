'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function convertMonospace(_1, text, _2, _3, options) {
  options.op = "<font face='monospace'>";
  options.cl = '</font>';
  options.type = 'CODE_SKIP';
  return Tools.toHtml(withoutEscaped(text)); //TODO
}

function convertNomarkup(_1, text, _2, _3, options) {
  options.type = 'CODE_SKIP';
  return Tools.toHtml(withoutEscaped(text)); //TODO
}

exports.default = [{
  priority: 0,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertMonospace,
  op: '``',
  //cl: undefined,
  //nestable: undefined,
  escapable: true
}, //check: undefined
{
  priority: 100,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertNomarkup,
  op: "''",
  //cl: undefined,
  //nestable: undefined,
  escapable: true
}];
//# sourceMappingURL=escaped.js.map
