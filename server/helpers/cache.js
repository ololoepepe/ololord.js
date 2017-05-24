'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeFile = exports.writeFile = exports.readFile = undefined;

var readFile = exports.readFile = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(fileName) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _fs2.default.read(ROOT_PATH + '/' + fileName);

          case 2:
            return _context.abrupt('return', _context.sent);

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function readFile(_x) {
    return _ref.apply(this, arguments);
  };
}();

var writeFile = exports.writeFile = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(fileName, data) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return Files.writeFile(ROOT_PATH + '/' + fileName, data);

          case 2:
            return _context2.abrupt('return', _context2.sent);

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function writeFile(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
}();

var removeFile = exports.removeFile = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(fileName) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return _fs2.default.remove(ROOT_PATH + '/' + fileName);

          case 2:
            return _context3.abrupt('return', _context3.sent);

          case 3:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function removeFile(_x4) {
    return _ref3.apply(this, arguments);
  };
}();

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var ROOT_PATH = __dirname + '/../../public';
//# sourceMappingURL=cache.js.map
