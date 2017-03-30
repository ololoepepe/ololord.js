'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sqlAdapter = require('./sql-adapter');

var _sqlAdapter2 = _interopRequireDefault(_sqlAdapter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CommonKey = function () {
  _createClass(CommonKey, null, [{
    key: 'selectParser',
    value: function selectParser(parse) {
      if (typeof parse === 'function') {
        return function (data) {
          if (typeof data === 'null' || typeof data === 'undefined') {
            return data;
          }
          return parse(data);
        };
      } else if (parse || typeof parse === 'undefined') {
        return function (data) {
          if (typeof data !== 'string') {
            return data;
          }
          return JSON.parse(data);
        };
      } else {
        return function (data) {
          return data;
        };
      }
    }
  }, {
    key: 'selectStringifier',
    value: function selectStringifier(stringify) {
      if (typeof stringify === 'function') {
        return function (data) {
          if (typeof data === 'null' || typeof data === 'undefined') {
            return data;
          }
          return stringify(data);
        };
      } else if (stringify || typeof stringify === 'undefined') {
        return JSON.stringify.bind(JSON);
      } else {
        return function (data) {
          return data;
        };
      }
    }
  }]);

  function CommonKey(client, key) {
    var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        parse = _ref.parse,
        stringify = _ref.stringify;

    _classCallCheck(this, CommonKey);

    this.client = client instanceof Promise ? new _sqlAdapter2.default(client) : client;
    this.key = key;
    this.parse = CommonKey.selectParser(parse);
    this.stringify = CommonKey.selectStringifier(stringify);
  }

  _createClass(CommonKey, [{
    key: 'fullKey',
    value: function fullKey(subkey, separator) {
      return this.key + (subkey ? '' + (separator || ':') + subkey : '');
    }
  }, {
    key: 'exists',
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(subkey) {
        var exists;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.client.exists(this.fullKey(subkey));

              case 2:
                exists = _context.sent;
                return _context.abrupt('return', !!exists);

              case 4:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function exists(_x2) {
        return _ref2.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: 'find',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(query, subkey) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                query = typeof query !== 'undefined' ? ':' + query : ':*';
                _context2.next = 3;
                return this.client.keys(this.fullKey(subkey) + query);

              case 3:
                return _context2.abrupt('return', _context2.sent);

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function find(_x3, _x4) {
        return _ref3.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'delete',
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(subkey) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.client.del(this.fullKey(subkey));

              case 2:
                return _context3.abrupt('return', _context3.sent);

              case 3:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function _delete(_x5) {
        return _ref4.apply(this, arguments);
      }

      return _delete;
    }()
  }, {
    key: 'expire',
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(ttl, subkey) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.client.expire(this.fullKey(subkey), ttl);

              case 2:
                return _context4.abrupt('return', _context4.sent);

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function expire(_x6, _x7) {
        return _ref5.apply(this, arguments);
      }

      return expire;
    }()
  }, {
    key: 'ttl',
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(subkey) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.client.ttl(this.fullKey(subkey));

              case 2:
                return _context5.abrupt('return', _context5.sent);

              case 3:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function ttl(_x8) {
        return _ref6.apply(this, arguments);
      }

      return ttl;
    }()
  }]);

  return CommonKey;
}();

exports.default = CommonKey;
//# sourceMappingURL=common-key.js.map
