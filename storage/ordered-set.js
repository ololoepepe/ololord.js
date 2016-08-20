'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _commonKey = require('./common-key');

var _commonKey2 = _interopRequireDefault(_commonKey);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var OrderedSet = function (_CommonKey) {
  _inherits(OrderedSet, _CommonKey);

  function OrderedSet() {
    var _Object$getPrototypeO;

    _classCallCheck(this, OrderedSet);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(OrderedSet)).call.apply(_Object$getPrototypeO, [this].concat(args)));
  }

  _createClass(OrderedSet, [{
    key: 'getSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(lb, ub, subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.client.zrange(this.fullKey(subkey), lb, ub);

              case 2:
                data = _context.sent;
                return _context.abrupt('return', data.map(this.parse));

              case 4:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getSome(_x, _x2, _x3) {
        return ref.apply(this, arguments);
      }

      return getSome;
    }()
  }, {
    key: 'getSomeByScore',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(lb, ub, subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.client.zrangebyscore(this.fullKey(subkey), lb, ub);

              case 2:
                data = _context2.sent;
                return _context2.abrupt('return', data.map(this.parse));

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getSomeByScore(_x4, _x5, _x6) {
        return ref.apply(this, arguments);
      }

      return getSomeByScore;
    }()
  }, {
    key: 'getAll',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.client.zrange(this.fullKey(subkey), 0, -1);

              case 2:
                data = _context3.sent;
                return _context3.abrupt('return', data.map(this.parse));

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getAll(_x7) {
        return ref.apply(this, arguments);
      }

      return getAll;
    }()
  }, {
    key: 'addOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(data, score, subkey) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.client.zadd(this.fullKey(subkey), this.stringify(data), score);

              case 2:
                return _context4.abrupt('return', _context4.sent);

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function addOne(_x8, _x9, _x10) {
        return ref.apply(this, arguments);
      }

      return addOne;
    }()
  }, {
    key: 'addSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(list, subkey) {
        var _client$zadd,
            _this2 = this;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!(!list || !(0, _underscore2.default)(list).isArray() || list.length <= 0 || list.some(function (item) {
                  return (typeof item === 'undefined' ? 'undefined' : _typeof(item)) !== 'object';
                }))) {
                  _context5.next = 2;
                  break;
                }

                return _context5.abrupt('return', 0);

              case 2:
                _context5.next = 4;
                return (_client$zadd = this.client.zadd).call.apply(_client$zadd, [this.client, this.fullKey(subkey)].concat(_toConsumableArray((0, _underscore2.default)(list.map(function (item) {
                  return [item.score, _this2.stringify(item.data)];
                })).flatten())));

              case 4:
                return _context5.abrupt('return', _context5.sent);

              case 5:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function addSome(_x11, _x12) {
        return ref.apply(this, arguments);
      }

      return addSome;
    }()
  }, {
    key: 'removeOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(data, subkey) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.client.zrem(this.fullKey(subkey), this.stringify(data));

              case 2:
                return _context6.abrupt('return', _context6.sent);

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function removeOne(_x13, _x14) {
        return ref.apply(this, arguments);
      }

      return removeOne;
    }()
  }, {
    key: 'removeSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(list, subkey) {
        var _client$zrem;

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!(!list || !(0, _underscore2.default)(list).isArray() || list.length <= 0)) {
                  _context7.next = 2;
                  break;
                }

                return _context7.abrupt('return', 0);

              case 2:
                _context7.next = 4;
                return (_client$zrem = this.client.zrem).call.apply(_client$zrem, [this.client, this.fullKey(subkey)].concat(_toConsumableArray(list.map(this.stringify))));

              case 4:
                return _context7.abrupt('return', _context7.sent);

              case 5:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function removeSome(_x15, _x16) {
        return ref.apply(this, arguments);
      }

      return removeSome;
    }()
  }, {
    key: 'count',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(subkey) {
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.client.zcard(this.fullKey(subkey));

              case 2:
                return _context8.abrupt('return', _context8.sent);

              case 3:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function count(_x17) {
        return ref.apply(this, arguments);
      }

      return count;
    }()
  }]);

  return OrderedSet;
}(_commonKey2.default);

exports.default = OrderedSet;
//# sourceMappingURL=ordered-set.js.map
