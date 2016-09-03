'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _commonKey = require('./common-key');

var _commonKey2 = _interopRequireDefault(_commonKey);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

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
    this.client.on('message', function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(channel, message) {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!(channel !== this.name)) {
                  _context3.next = 2;
                  break;
                }

                return _context3.abrupt('return');

              case 2:
                message = this.parse(message);
                _context3.prev = 3;
                return _context3.delegateYield(regeneratorRuntime.mark(function _callee2() {
                  var skip;
                  return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                      switch (_context2.prev = _context2.next) {
                        case 0:
                          skip = true;
                          _context2.next = 3;
                          return Tools.series(_this.handlers, function () {
                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(handler) {
                              var result;
                              return regeneratorRuntime.wrap(function _callee$(_context) {
                                while (1) {
                                  switch (_context.prev = _context.next) {
                                    case 0:
                                      if (!skip) {
                                        _context.next = 2;
                                        break;
                                      }

                                      return _context.abrupt('return');

                                    case 2:
                                      _context.next = 4;
                                      return handler(message);

                                    case 4:
                                      result = _context.sent;

                                      if (result) {
                                        skip = false;
                                      }

                                    case 6:
                                    case 'end':
                                      return _context.stop();
                                  }
                                }
                              }, _callee, this);
                            }));

                            return function (_x4) {
                              return ref.apply(this, arguments);
                            };
                          }());

                        case 3:
                        case 'end':
                          return _context2.stop();
                      }
                    }
                  }, _callee2, _this);
                })(), 't0', 5);

              case 5:
                _context3.next = 10;
                break;

              case 7:
                _context3.prev = 7;
                _context3.t1 = _context3['catch'](3);

                _logger2.default.error(_context3.t1.stack || _context3.t1);

              case 10:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[3, 7]]);
      }));

      return function (_x2, _x3) {
        return ref.apply(this, arguments);
      };
    }());
  }

  _createClass(Channel, [{
    key: 'publish',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(data) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.client.publish(this.name, this.stringify(data));

              case 2:
                return _context4.abrupt('return', _context4.sent);

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function publish(_x5) {
        return ref.apply(this, arguments);
      }

      return publish;
    }()
  }, {
    key: 'subscribe',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(handler) {
        var shouldSubscribe;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                shouldSubscribe = this.handlers.length <= 0;

                if (!(typeof handler !== 'function')) {
                  _context5.next = 3;
                  break;
                }

                return _context5.abrupt('return');

              case 3:
                this.handlers.push(handler);

                if (!shouldSubscribe) {
                  _context5.next = 8;
                  break;
                }

                _context5.next = 7;
                return this.client.subscribe(this.name);

              case 7:
                return _context5.abrupt('return', _context5.sent);

              case 8:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function subscribe(_x6) {
        return ref.apply(this, arguments);
      }

      return subscribe;
    }()
  }, {
    key: 'unsubscribe',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(handler) {
        var index;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (!(typeof handler === 'undefined')) {
                  _context6.next = 4;
                  break;
                }

                this.handlers = [];
                _context6.next = 9;
                break;

              case 4:
                if (!(typeof handler === 'function')) {
                  _context6.next = 9;
                  break;
                }

                index = this.handlers.indexOf(handler);

                if (!(index < 0)) {
                  _context6.next = 8;
                  break;
                }

                return _context6.abrupt('return');

              case 8:
                this.handlers.splice(index, 1);

              case 9:
                if (!(this.handlers.length <= 0)) {
                  _context6.next = 13;
                  break;
                }

                _context6.next = 12;
                return this.client.unsubscribe(this.name);

              case 12:
                return _context6.abrupt('return', _context6.sent);

              case 13:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function unsubscribe(_x7) {
        return ref.apply(this, arguments);
      }

      return unsubscribe;
    }()
  }]);

  return Channel;
}();

exports.default = Channel;
//# sourceMappingURL=channel.js.map
