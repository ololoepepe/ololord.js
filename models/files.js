'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fileInfoExistsByHash = exports.fileInfoExistsByName = exports.getFileInfoByHash = exports.getFileInfoByName = undefined;

var getFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(name, hash) {
    var info, fileInfo;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(!name && hash)) {
              _context.next = 5;
              break;
            }

            _context.next = 3;
            return FileHashes.getOne(hash);

          case 3:
            info = _context.sent;

            if (info) {
              name = info.name;
            }

          case 5:
            if (name) {
              _context.next = 7;
              break;
            }

            return _context.abrupt('return', Promise.reject(Tools.translate('No such file')));

          case 7:
            fileInfo = FileInfos.getOne(name);

            if (fileInfo) {
              _context.next = 10;
              break;
            }

            return _context.abrupt('return', Promise.reject(Tools.translate('No such file')));

          case 10:
            return _context.abrupt('return', fileInfo);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getFileInfo(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var getFileInfoByName = exports.getFileInfoByName = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(name) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return getFileInfo(name);

          case 2:
            return _context2.abrupt('return', _context2.sent);

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getFileInfoByName(_x3) {
    return ref.apply(this, arguments);
  };
}();

var getFileInfoByHash = exports.getFileInfoByHash = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(hash) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getFileInfo(null, hash);

          case 2:
            return _context3.abrupt('return', _context3.sent);

          case 3:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getFileInfoByHash(_x4) {
    return ref.apply(this, arguments);
  };
}();

var fileInfoExistsByName = exports.fileInfoExistsByName = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(name) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return FileInfos.existsOne(name);

          case 2:
            return _context4.abrupt('return', _context4.sent);

          case 3:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function fileInfoExistsByName(_x5) {
    return ref.apply(this, arguments);
  };
}();

var fileInfoExistsByHash = exports.fileInfoExistsByHash = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(hash) {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return FileHashes.exists(hash);

          case 2:
            return _context5.abrupt('return', _context5.sent);

          case 3:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function fileInfoExistsByHash(_x6) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var FileHashes = new _unorderedSet2.default((0, _clientFactory2.default)(), 'fileHashes');
var FileInfos = new _hash2.default((0, _clientFactory2.default)(), 'fileInfos');
//# sourceMappingURL=files.js.map
