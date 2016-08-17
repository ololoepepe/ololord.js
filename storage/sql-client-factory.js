'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getClient;

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _sqlite = require('sqlite3');

var _sqlite2 = _interopRequireDefault(_sqlite);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var db = null;

function getClient() {
  return db;
}

geolocation.initialize = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
  var schema, statements;
  return regeneratorRuntime.wrap(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return new Promise(function (resolve, reject) {
            db = new _sqlite2.default.Database(__dirname + '/../sqlite/main.sqlite', function (err) {
              if (err) {
                db = null;
                reject(err);
                return;
              }
              resolve();
            });
          });

        case 2:
          _context2.next = 4;
          return _fs2.default.read(__dirname + '/../sqlite/main.schema');

        case 4:
          schema = _context2.sent;

          schema = schema.replace(/\/\*(.|\r?\n)*\*\//g, '');
          sehema = schema.replace(/\-\-.*/g, '');
          schema = schema.replace(/\r?\n+/g, ' ');
          statements = schema.split(';').filter(function (statement) {
            return !/^\s+$/.test(statement);
          });
          _context2.next = 11;
          return Tools.series(statements, function () {
            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(statement) {
              return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      _context.next = 2;
                      return new Promise(function (resolve, reject) {
                        db.run(statement, [], function (err) {
                          if (err) {
                            reject(err);
                          } else {
                            resolve();
                          }
                        });
                      });

                    case 2:
                      return _context.abrupt('return', _context.sent);

                    case 3:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _callee, this);
            }));

            return function (_x) {
              return ref.apply(this, arguments);
            };
          }());

        case 11:
        case 'end':
          return _context2.stop();
      }
    }
  }, _callee2, this);
}));
//# sourceMappingURL=sql-client-factory.js.map
