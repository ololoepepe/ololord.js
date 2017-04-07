'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _commonKey = require('./common-key');

var _commonKey2 = _interopRequireDefault(_commonKey);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Channel = function () {
  function Channel(client, name) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var parse = _ref.parse;
    var stringify = _ref.stringify;

    _classCallCheck(this, Channel);

    this.client = client;
    this.name = name;
    this.parse = _commonKey2.default.selectParser(parse);
    this.stringify = _commonKey2.default.selectStringifier(stringify);
    this.handlers = [];
    this.client.on('message', this._handleMessage.bind(this));
  }

  _createClass(Channel, [{
    key: 'publish',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(data) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.client.publish(this.name, this.stringify(data));

              case 2:
                return _context.abrupt('return', _context.sent);

              case 3:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function publish(_x2) {
        return ref.apply(this, arguments);
      }

      return publish;
    }()
  }, {
    key: 'subscribe',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(handler) {
        var shouldSubscribe;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                shouldSubscribe = this.handlers.length <= 0;

                if (!(typeof handler !== 'function')) {
                  _context2.next = 3;
                  break;
                }

                return _context2.abrupt('return');

              case 3:
                this.handlers.push(handler);

                if (!shouldSubscribe) {
                  _context2.next = 8;
                  break;
                }

                _context2.next = 7;
                return this.client.subscribe(this.name);

              case 7:
                return _context2.abrupt('return', _context2.sent);

              case 8:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function subscribe(_x3) {
        return ref.apply(this, arguments);
      }

      return subscribe;
    }()
  }, {
    key: 'unsubscribe',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(handler) {
        var index;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!(typeof handler === 'undefined')) {
                  _context3.next = 4;
                  break;
                }

                this.handlers = [];
                _context3.next = 9;
                break;

              case 4:
                if (!(typeof handler === 'function')) {
                  _context3.next = 9;
                  break;
                }

                index = this.handlers.indexOf(handler);

                if (!(index < 0)) {
                  _context3.next = 8;
                  break;
                }

                return _context3.abrupt('return');

              case 8:
                this.handlers.splice(index, 1);

              case 9:
                if (!(this.handlers.length <= 0)) {
                  _context3.next = 13;
                  break;
                }

                _context3.next = 12;
                return this.client.unsubscribe(this.name);

              case 12:
                return _context3.abrupt('return', _context3.sent);

              case 13:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function unsubscribe(_x4) {
        return ref.apply(this, arguments);
      }

      return unsubscribe;
    }()
  }, {
    key: '_handleMessage',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(channel, message) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!(channel !== this.name)) {
                  _context5.next = 2;
                  break;
                }

                return _context5.abrupt('return');

              case 2:
                message = this.parse(message);
                _context5.prev = 3;
                _context5.next = 6;
                return Tools.series(this.handlers, function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(handler) {
                    return regeneratorRuntime.wrap(function _callee4$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.next = 2;
                            return handler(message);

                          case 2:
                          case 'end':
                            return _context4.stop();
                        }
                      }
                    }, _callee4, this);
                  }));

                  return function (_x7) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 6:
                _context5.next = 11;
                break;

              case 8:
                _context5.prev = 8;
                _context5.t0 = _context5['catch'](3);

                _logger2.default.error(_context5.t0.stack || _context5.t0);

              case 11:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[3, 8]]);
      }));

      function _handleMessage(_x5, _x6) {
        return ref.apply(this, arguments);
      }

      return _handleMessage;
    }()
  }]);

  return Channel;
}();

exports.default = Channel;
//# sourceMappingURL=channel.js.map
