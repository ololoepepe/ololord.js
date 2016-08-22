'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var processStrikedOutShitty = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(info) {
    var match, s;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            match = info.find(RX_SYMBOL);

          case 1:
            if (!match) {
              _context.next = 11;
              break;
            }

            s = match.index - match[0].length / 2;

            if (!(s < 0)) {
              _context.next = 6;
              break;
            }

            match = info.find(RX_SYMBOL, match.index + match[0].length);
            return _context.abrupt('continue', 1);

          case 6:
            info.replace(match.index, match[0].length, '</s>', 0);
            info.insert(s, '<s>');
            match = info.find(RX_SYMBOL, match.index + 7);
            _context.next = 1;
            break;

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function processStrikedOutShitty(_x) {
    return ref.apply(this, arguments);
  };
}();

var processStrikedOutShittyWord = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(info) {
    var match, txt, count, pcount, s;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            match = info.find(RX_WORD);
            txt = info.text;

            while (match) {
              count = match[0].length / 2;
              pcount = count;
              s = match.index - 1;

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

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function processStrikedOutShittyWord(_x2) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var RX_SYMBOL = /(\^H)+/gi;
var RX_WORD = /(\^W)+/gi;

exports.default = [{
  priority: 100500,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShitty
}, {
  priority: 100600,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShittyWord
}];
//# sourceMappingURL=striked-out.js.map
