'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removePostIndex = exports.updatePostIndex = exports.getPostIndex = exports.indexPost = undefined;

var indexPost = exports.indexPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_ref) {
    var boardName = _ref.boardName;
    var postNumber = _ref.postNumber;
    var threadNumber = _ref.threadNumber;
    var plainText = _ref.plainText;
    var subject = _ref.subject;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return es.index({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber,
              body: {
                plainText: plainText,
                subject: subject,
                boardName: boardName,
                threadNumber: threadNumber
              }
            });

          case 3:
            _context.next = 8;
            break;

          case 5:
            _context.prev = 5;
            _context.t0 = _context['catch'](0);

            _logger2.default.error(_context.t0.stack || _context.t0);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 5]]);
  }));

  return function indexPost(_x) {
    return ref.apply(this, arguments);
  };
}();

var getPostIndex = exports.getPostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, postNumber) {
    var data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return es.get({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber
            });

          case 3:
            data = _context2.sent;
            return _context2.abrupt('return', data._source);

          case 7:
            _context2.prev = 7;
            _context2.t0 = _context2['catch'](0);

            _logger2.default.error(_context2.t0.stack || _context2.t0);
            return _context2.abrupt('return', { _source: {} });

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 7]]);
  }));

  return function getPostIndex(_x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var updatePostIndex = exports.updatePostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, postNumber, transformer) {
    var body;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!(typeof transformer !== 'function')) {
              _context3.next = 2;
              break;
            }

            return _context3.abrupt('return');

          case 2:
            _context3.prev = 2;
            _context3.next = 5;
            return getPostIndex(boardName, postNumber);

          case 5:
            body = _context3.sent;
            _context3.next = 8;
            return transformer(body);

          case 8:
            body = _context3.sent;
            _context3.next = 11;
            return es.index({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber,
              body: body
            });

          case 11:
            _context3.next = 16;
            break;

          case 13:
            _context3.prev = 13;
            _context3.t0 = _context3['catch'](2);

            _logger2.default.error(_context3.t0.stack || _context3.t0);

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[2, 13]]);
  }));

  return function updatePostIndex(_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var removePostIndex = exports.removePostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return es.delete({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber
            });

          case 2:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function removePostIndex(_x7, _x8) {
    return ref.apply(this, arguments);
  };
}();

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

try {
  var es = new _elasticsearch2.default.Client({ host: (0, _config2.default)('system.elasticsearch.host') });
} catch (err) {
  var es = null;
}

var INDEX_NAME = 'ololord.js';
//# sourceMappingURL=search.js.map
