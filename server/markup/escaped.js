'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function convertMonospace(_1, text, _2, _3, options) {
  options.op = "<font face='monospace'>";
  options.cl = '</font>';
  options.type = _processingContext2.default.CODE_SKIP;
  return Renderer.toHTML(text);
}

function convertNomarkup(_1, text, _2, _3, options) {
  options.type = _processingContext2.default.CODE_SKIP;
  return Renderer.toHTML(text);
}

function convertPre(_1, text, _2, _3, options) {
  options.op = '<pre>';
  options.cl = '</pre>';
  options.type = _processingContext2.default.CODE_SKIP;
  return text;
}

exports.default = [{
  priority: 0,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertMonospace,
  op: '``',
  escapable: true
}, {
  priority: 100,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertNomarkup,
  op: "''",
  escapable: true
}, {
  priority: 200,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertPre,
  op: /\/\\-\\-pre\s+/g,
  cl: /\s+\\\\\\-\\-/g,
  escapable: true,
  pre: true
}, {
  priority: 700,
  markupModes: ['BB_CODE'],
  convert: convertPre,
  op: '[pre]',
  cl: '[/pre]',
  escapable: true,
  pre: true
}, {
  priority: 1100,
  markupModes: ['BB_CODE'],
  convert: convertMonospace,
  op: '[m]',
  cl: '[/m]'
}, {
  priority: 1200,
  markupModes: ['BB_CODE'],
  convert: convertNomarkup,
  op: '[n]',
  cl: '[/n]'
}];
//# sourceMappingURL=escaped.js.map
