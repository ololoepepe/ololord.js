'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function selectParser(parse) {
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

function selectStringifier(stringify) {
  if (typeof stringify === 'function') {
    return function (data) {
      if (typeof data === 'null' || typeof data === 'undefined') {
        return data;
      }
      return stringify(data);
    };
  } else if (stringify || typeof stringify === 'undefined') {
    return JSON.stringify.bind(null);
  } else {
    return function (data) {
      return data;
    };
  }
}

var CommonKey = function () {
  function CommonKey(client, key) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var parse = _ref.parse;
    var stringify = _ref.stringify;

    _classCallCheck(this, CommonKey);

    this.client = client;
    this.key = key;
    this.parse = selectParser(parse);
    this.stringify = selectStringifier(stringify);
  }

  _createClass(CommonKey, [{
    key: 'fullKey',
    value: function fullKey(subkey, separator) {
      return this.key + (subkey ? '' + (separator || ':') + subkey : '');
    }
  }, {
    key: 'exists',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(subkey) {
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
        return ref.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: 'find',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(query, subkey) {
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
        return ref.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'delete',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(subkey) {
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
        return ref.apply(this, arguments);
      }

      return _delete;
    }()
  }]);

  return CommonKey;
}();

exports.default = CommonKey;
//# sourceMappingURL=common-key.js.map
