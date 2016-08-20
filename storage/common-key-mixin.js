'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

exports.default = {
  find: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(query, subkey) {
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              query = typeof query !== 'undefined' ? ':' + query : ':*';
              _context.next = 3;
              return this.client.keys(this.fullKey(subkey) + query);

            case 3:
              return _context.abrupt('return', _context.sent);

            case 4:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function find(_x, _x2) {
      return ref.apply(this, arguments);
    }

    return find;
  }(),
  delete: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(subkey) {
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.client.del(this.fullKey(subkey));

            case 2:
              return _context2.abrupt('return', _context2.sent);

            case 3:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function _delete(_x3) {
      return ref.apply(this, arguments);
    }

    return _delete;
  }()
};
//# sourceMappingURL=common-key-mixin.js.map
