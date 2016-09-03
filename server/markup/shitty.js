'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RX_SYMBOL = /(\^H)+/gi;
var RX_WORD = /(\^W)+/gi;

function processStrikedOutShitty(info) {
  var match = info.find(RX_SYMBOL);
  while (match) {
    var s = match.index - match[0].length / 2;
    if (s < 0) {
      match = info.find(RX_SYMBOL, match.index + match[0].length);
      continue;
    }
    info.replace(match.index, match[0].length, '</s>', 0);
    info.insert(s, '<s>');
    match = info.find(RX_SYMBOL, match.index + 7);
  }
}

function processStrikedOutShittyWord(info) {
  var match = info.find(RX_WORD);
  var txt = info.text;
  while (match) {
    var count = match[0].length / 2;
    var pcount = count;
    var s = match.index - 1;
    while (count > 0) {
      while (s >= 0 && /\s/.test(txt[s])) {
        --s;
      }
      while (s >= 0 && !/\s/.test(txt[s])) {
        --s;
      }
      --count;
    }
    info.replace(match.index, match[0].length, '</s>', 0);
    info.insert(s + 1, '<s>');
    match = info.find(RX_WORD, match.index + 7 * pcount);
  }
}

function convertTooltipShitty(_1, _2, matchs, _3, options) {
  options.type = _processingContext2.default.NO_SKIP;
  var tooltip = matchs[2];
  options.op = '<span class=\'tooltip js-with-tooltip\' title=\'' + tooltip + '\'>';
  options.cl = '</span>';
  return matchs[1];
}

exports.default = [{
  priority: 1900,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShitty
}, {
  priority: 2000,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShittyWord
}, {
  priority: 2100,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertTooltipShitty,
  op: /([^\?\s]+)\?{3}"([^"]+)"/gi,
  cl: null
}];
//# sourceMappingURL=shitty.js.map
