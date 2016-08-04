'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UnorderedSet = function () {
  function UnorderedSet(client, key) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var parse = _ref.parse;
    var stringify = _ref.stringify;

    _classCallCheck(this, UnorderedSet);

    this.client = client;
    this.key = key;
    this.parse = Tools.selectParser(parse);
    this.stringify = Tools.selectStringifier(stringify);
  }

  _createClass(UnorderedSet, [{
    key: 'fullKey',
    value: function fullKey(subkey, separator) {
      return this.key + (subkey ? '' + (separator || ':') + subkey : '');
    }
  }, {
    key: 'getOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.client.srandmember(this.fullKey(subkey));

              case 2:
                data = _context.sent;
                return _context.abrupt('return', this.parse(data));

              case 4:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getOne(_x2) {
        return ref.apply(this, arguments);
      }

      return getOne;
    }()
  }, {
    key: 'getAll',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.client.smembers(this.fullKey(subkey));

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

      function getAll(_x3) {
        return ref.apply(this, arguments);
      }

      return getAll;
    }()
  }, {
    key: 'exists',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(subkey) {
        var exists;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.client.exists(this.fullKey(subkey));

              case 2:
                exists = _context3.sent;
                return _context3.abrupt('return', !!exists);

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function exists(_x4) {
        return ref.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: 'addOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(data, subkey) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.client.sadd(this.fullKey(subkey), this.stringify(data));

              case 2:
                return _context4.abrupt('return', _context4.sent);

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function addOne(_x5, _x6) {
        return ref.apply(this, arguments);
      }

      return addOne;
    }()
  }, {
    key: 'addSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(list, subkey) {
        var _client$sadd;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!(!list || !(0, _underscore2.default)(list).isArray() || list.length <= 0)) {
                  _context5.next = 2;
                  break;
                }

                return _context5.abrupt('return', 0);

              case 2:
                _context5.next = 4;
                return (_client$sadd = this.client.sadd).call.apply(_client$sadd, [this.client, this.fullKey(subkey)].concat(_toConsumableArray(list.map(this.stringify))));

              case 4:
                return _context5.abrupt('return', _context5.sent);

              case 5:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function addSome(_x7, _x8) {
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
                return this.client.srem(this.fullKey(subkey), this.stringify(data));

              case 2:
                return _context6.abrupt('return', _context6.sent);

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function removeOne(_x9, _x10) {
        return ref.apply(this, arguments);
      }

      return removeOne;
    }()
  }, {
    key: 'removeSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(list, subkey) {
        var _client$srem;

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
                return (_client$srem = this.client.srem).call.apply(_client$srem, [this.client, this.fullKey(subkey)].concat(_toConsumableArray(list.map(this.stringify))));

              case 4:
                return _context7.abrupt('return', _context7.sent);

              case 5:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function removeSome(_x11, _x12) {
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
                return this.client.scard(this.fullKey(subkey));

              case 2:
                return _context8.abrupt('return', _context8.sent);

              case 3:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function count(_x13) {
        return ref.apply(this, arguments);
      }

      return count;
    }()
  }, {
    key: 'find',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(query, subkey) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                query = typeof query !== 'undefined' ? ':' + query : ':*';
                _context9.next = 3;
                return this.client.keys(this.fullKey(subkey) + query);

              case 3:
                return _context9.abrupt('return', _context9.sent);

              case 4:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function find(_x14, _x15) {
        return ref.apply(this, arguments);
      }

      return find;
    }()
  }]);

  return UnorderedSet;
}();

exports.default = UnorderedSet;
//# sourceMappingURL=unordered-set.js.map
