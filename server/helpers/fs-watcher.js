'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _fs3 = require('fs');

var _fs4 = _interopRequireDefault(_fs3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FSWatcher = function (_EventEmitter) {
  _inherits(FSWatcher, _EventEmitter);

  _createClass(FSWatcher, null, [{
    key: 'createWatchedResource',
    value: function createWatchedResource(path, synchronous, asynchronous) {
      if (!_fs4.default.existsSync(path)) {
        return;
      }
      if (typeof asynchronous === 'function') {
        new FSWatcher(path).on('change', _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
          var exists;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.prev = 0;
                  _context.next = 3;
                  return _fs2.default.exists(path);

                case 3:
                  exists = _context.sent;

                  if (!exists) {
                    _context.next = 7;
                    break;
                  }

                  _context.next = 7;
                  return asynchronous(path);

                case 7:
                  _context.next = 12;
                  break;

                case 9:
                  _context.prev = 9;
                  _context.t0 = _context['catch'](0);

                  require('./logger').default.error(_context.t0.stack || _context.t0);

                case 12:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, this, [[0, 9]]);
        })));
      }
      return synchronous(path);
    }
  }]);

  function FSWatcher(fileName) {
    _classCallCheck(this, FSWatcher);

    var _this = _possibleConstructorReturn(this, (FSWatcher.__proto__ || Object.getPrototypeOf(FSWatcher)).call(this));

    _this.fileName = fileName;
    _this.resetWatcher();
    return _this;
  }

  _createClass(FSWatcher, [{
    key: 'resetWatcher',
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var _this2 = this;

        var exists;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (this.watcher) {
                  this.watcher.removeAllListeners('change');
                  this.watcher.close();
                }
                _context2.next = 3;
                return _fs2.default.exists(this.fileName);

              case 3:
                exists = _context2.sent;

                if (exists) {
                  _context2.next = 6;
                  break;
                }

                return _context2.abrupt('return');

              case 6:
                this.watcher = _fs4.default.watch(this.fileName);
                this.watcher.on('change', function (type, fileName) {
                  if ('rename' === type) {
                    if (_this2.fileName.split('/').pop() !== fileName) {
                      return;
                    }
                    _this2.resetWatcher();
                  } else if ('change' === type) {
                    _this2.emit('change');
                  }
                });

              case 8:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function resetWatcher() {
        return _ref2.apply(this, arguments);
      }

      return resetWatcher;
    }()
  }]);

  return FSWatcher;
}(_events.EventEmitter);

exports.default = FSWatcher;
//# sourceMappingURL=fs-watcher.js.map
