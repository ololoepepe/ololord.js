'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (name) {
  if (!name) {
    name = 'main';
  }
  var client = clients.get(name);
  if (!client) {
    client = createClient(name);
    clients.set(name, client);
  }
  return client;
};

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

var clients = new Map();

function createClient(name) {
  return new Promise(function (resolve, reject) {
    var db = new _sqlite2.default.Database(__dirname + '/../sqlite/' + name + '.sqlite', function (err) {
      if (err) {
        reject(err);
        return;
      }
      db.initialize = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var path, exists, schema, statements;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                path = __dirname + '/../sqlite/' + name + '.schema';
                _context2.next = 3;
                return _fs2.default.exists(path);

              case 3:
                exists = _context2.sent;
                _context2.next = 6;
                return _fs2.default.read(path);

              case 6:
                schema = _context2.sent;

                schema = schema.replace(/\/\*(.|\r?\n)*\*\//g, '');
                schema = schema.replace(/\-\-.*/g, '');
                schema = schema.replace(/\r?\n+/g, ' ');
                statements = schema.split(';').filter(function (statement) {
                  return !/^\s+$/.test(statement);
                });
                _context2.next = 13;
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

              case 13:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
      resolve(db);
    });
  });
}
//# sourceMappingURL=sql-client-factory.js.map
