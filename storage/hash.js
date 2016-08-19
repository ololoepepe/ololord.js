'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

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

var Hash = function () {
  function Hash(client, key) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var parse = _ref.parse;
    var stringify = _ref.stringify;

    _classCallCheck(this, Hash);

    this.client = client;
    this.key = key;
    this.parse = Tools.selectParser(parse);
    this.stringify = Tools.selectStringifier(stringify);
  }

  _createClass(Hash, [{
    key: 'fullKey',
    value: function fullKey(subkey, separator) {
      return this.key + (subkey ? '' + (separator || ':') + subkey : '');
    }
  }, {
    key: 'getOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(id, subkey) {
        var data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.client.hget(this.fullKey(subkey), id);

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

      function getOne(_x2, _x3) {
        return ref.apply(this, arguments);
      }

      return getOne;
    }()
  }, {
    key: 'getSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(ids, subkey) {
        var _client$hmget;

        var data;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(!(0, _underscore2.default)(ids).isArray() || ids.length <= 0)) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return', []);

              case 2:
                _context2.next = 4;
                return (_client$hmget = this.client.hmget).call.apply(_client$hmget, [this.client, this.fullKey(subkey)].concat(_toConsumableArray(ids)));

              case 4:
                data = _context2.sent;
                return _context2.abrupt('return', data.map(this.parse));

              case 6:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getSome(_x4, _x5) {
        return ref.apply(this, arguments);
      }

      return getSome;
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
                return this.client.hgetall(this.fullKey(subkey));

              case 2:
                data = _context3.sent;
                return _context3.abrupt('return', (0, _underscore2.default)(data).mapObject(this.parse));

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getAll(_x6) {
        return ref.apply(this, arguments);
      }

      return getAll;
    }()
  }, {
    key: 'exists',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(subkey) {
        var exists;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.client.exists(this.fullKey(subkey));

              case 2:
                exists = _context4.sent;
                return _context4.abrupt('return', !!exists);

              case 4:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function exists(_x7) {
        return ref.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: 'existsOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(id, subkey) {
        var exists;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.client.hexists(this.fullKey(subkey), id);

              case 2:
                exists = _context5.sent;
                return _context5.abrupt('return', !!exists);

              case 4:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function existsOne(_x8, _x9) {
        return ref.apply(this, arguments);
      }

      return existsOne;
    }()
  }, {
    key: 'setOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(id, data, subkey) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.client.hset(this.fullKey(subkey), id, this.stringify(data));

              case 2:
                return _context6.abrupt('return', _context6.sent);

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function setOne(_x10, _x11, _x12) {
        return ref.apply(this, arguments);
      }

      return setOne;
    }()
  }, {
    key: 'setSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(items, subkey) {
        var _client$hmset;

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!((typeof items === 'undefined' ? 'undefined' : _typeof(items)) !== 'object')) {
                  _context7.next = 2;
                  break;
                }

                return _context7.abrupt('return', 0);

              case 2:
                if (!(0, _underscore2.default)(items).isArray()) {
                  items = (0, _underscore2.default)(items).map(function (value, key) {
                    return [key, value];
                  });
                  items = (0, _underscore2.default)(items).flatten();
                }

                if (!(items.length <= 0)) {
                  _context7.next = 5;
                  break;
                }

                return _context7.abrupt('return', 0);

              case 5:
                _context7.next = 7;
                return (_client$hmset = this.client.hmset).call.apply(_client$hmset, [this.client, this.fullKey(subkey)].concat(_toConsumableArray(items)));

              case 7:
                return _context7.abrupt('return', _context7.sent);

              case 8:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function setSome(_x13, _x14) {
        return ref.apply(this, arguments);
      }

      return setSome;
    }()
  }, {
    key: 'incrementBy',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(id, n, subkey) {
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.client.hincrby(this.fullKey(subkey), key, n);

              case 2:
                return _context8.abrupt('return', _context8.sent);

              case 3:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function incrementBy(_x15, _x16, _x17) {
        return ref.apply(this, arguments);
      }

      return incrementBy;
    }()
  }, {
    key: 'deleteOne',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(id, subkey) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this.client.hdel(this.fullKey(subkey), id);

              case 2:
                return _context9.abrupt('return', _context9.sent);

              case 3:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function deleteOne(_x18, _x19) {
        return ref.apply(this, arguments);
      }

      return deleteOne;
    }()
  }, {
    key: 'deleteSome',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(ids, subkey) {
        var _client;

        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                if (!(0, _underscore2.default)(ids).isArray()) {
                  ids = [ids];
                }

                if (!(ids.length <= 0)) {
                  _context10.next = 3;
                  break;
                }

                return _context10.abrupt('return', 0);

              case 3:
                _context10.next = 5;
                return (_client = this.client).hdel.apply(_client, [this.fullKey(subkey)].concat(_toConsumableArray(ids)));

              case 5:
                return _context10.abrupt('return', _context10.sent);

              case 6:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function deleteSome(_x20, _x21) {
        return ref.apply(this, arguments);
      }

      return deleteSome;
    }()
  }, {
    key: 'keys',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(subkey) {
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return this.client.hkeys(this.fullKey(subkey));

              case 2:
                return _context11.abrupt('return', _context11.sent);

              case 3:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function keys(_x22) {
        return ref.apply(this, arguments);
      }

      return keys;
    }()
  }, {
    key: 'count',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(subkey) {
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return this.client.hlen(this.fullKey(subkey));

              case 2:
                return _context12.abrupt('return', _context12.sent);

              case 3:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function count(_x23) {
        return ref.apply(this, arguments);
      }

      return count;
    }()
  }, {
    key: 'find',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(query, subkey) {
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                query = typeof query !== 'undefined' ? ':' + query : ':*';
                _context13.next = 3;
                return this.client.keys(this.fullKey(subkey) + query);

              case 3:
                return _context13.abrupt('return', _context13.sent);

              case 4:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function find(_x24, _x25) {
        return ref.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'delete',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(subkey) {
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return this.client.del(this.fullKey(subkey));

              case 2:
                return _context14.abrupt('return', _context14.sent);

              case 3:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function _delete(_x26) {
        return ref.apply(this, arguments);
      }

      return _delete;
    }()
  }]);

  return Hash;
}();

exports.default = Hash;
//# sourceMappingURL=hash.js.map
