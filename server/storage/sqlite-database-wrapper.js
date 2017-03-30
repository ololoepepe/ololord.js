'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var METADATA_SCHEMA = 'CREATE TABLE IF NOT EXISTS _ololord_metadata (name TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL)';
var KEYS_SCHEMA = 'CREATE TABLE IF NOT EXISTS _ololord_keys (key TEXT PRIMARY KEY NOT NULL, value TEXT)';

var SQLiteDatabaseWrapper = function () {
  function SQLiteDatabaseWrapper(client, adapter) {
    _classCallCheck(this, SQLiteDatabaseWrapper);

    this._client = client;
    this._adapter = adapter;
    this._initialized = false;
    this._transactionQueue = [];
    this._currentTransaction = false;
  }

  _createClass(SQLiteDatabaseWrapper, [{
    key: '_awaitClient',
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this._initialized) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:
                _context.next = 4;
                return this._client;

              case 4:
                this._client = _context.sent;

                if (this._client.manualTransaction) {
                  _context.next = 8;
                  break;
                }

                _context.next = 8;
                return this._runRaw('BEGIN TRANSACTION');

              case 8:
                _context.next = 10;
                return this._runRaw(METADATA_SCHEMA);

              case 10:
                _context.next = 12;
                return this._runRaw(KEYS_SCHEMA);

              case 12:
                if (this._client.manualTransaction) {
                  _context.next = 15;
                  break;
                }

                _context.next = 15;
                return this._runRaw('COMMIT TRANSACTION');

              case 15:
                this._initialized = true;

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function _awaitClient() {
        return _ref.apply(this, arguments);
      }

      return _awaitClient;
    }()
  }, {
    key: '_runRaw',
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(statement) {
        var _this = this;

        for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          params[_key - 1] = arguments[_key];
        }

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt('return', new Promise(function (resolve, reject) {
                  _this._client.run(statement, params, function (err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve();
                    }
                  });
                }));

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _runRaw(_x) {
        return _ref2.apply(this, arguments);
      }

      return _runRaw;
    }()
  }, {
    key: 'run',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var _args3 = arguments;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this._awaitClient();

              case 2:
                _context3.next = 4;
                return this._runRaw.apply(this, _args3);

              case 4:
                return _context3.abrupt('return', _context3.sent);

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function run() {
        return _ref3.apply(this, arguments);
      }

      return run;
    }()
  }, {
    key: 'get',
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(statement) {
        var _this2 = this;

        for (var _len2 = arguments.length, params = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          params[_key2 - 1] = arguments[_key2];
        }

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this._awaitClient();

              case 2:
                return _context4.abrupt('return', new Promise(function (resolve, reject) {
                  _this2._client.get(statement, params, function (err, row) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(row);
                    }
                  });
                }));

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function get(_x2) {
        return _ref4.apply(this, arguments);
      }

      return get;
    }()
  }, {
    key: 'all',
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(statement) {
        var _this3 = this;

        for (var _len3 = arguments.length, params = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          params[_key3 - 1] = arguments[_key3];
        }

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this._awaitClient();

              case 2:
                return _context5.abrupt('return', new Promise(function (resolve, reject) {
                  _this3._client.all(statement, params, function (err, rows) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(rows);
                    }
                  });
                }));

              case 3:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function all(_x3) {
        return _ref5.apply(this, arguments);
      }

      return all;
    }()
  }, {
    key: '_checkTransactionQueue',
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
        var _this4 = this;

        var next, state;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (!(this._transactionQueue.length <= 0)) {
                  _context6.next = 3;
                  break;
                }

                this._currentTransaction = false;
                return _context6.abrupt('return');

              case 3:
                next = this._transactionQueue.shift();

                this._currentTransaction = true;
                _context6.next = 7;
                return this._awaitClient();

              case 7:
                _context6.prev = 7;

                if (this._client.manualTransaction) {
                  _context6.next = 11;
                  break;
                }

                _context6.next = 11;
                return this._runRaw('BEGIN TRANSACTION');

              case 11:
                state = void 0;

                next.resolve({
                  state: state,
                  commit: function commit() {
                    return new Promise(function (resolve, reject) {
                      Promise.resolve().then(function () {
                        if (!_this4._client.manualTransaction) {
                          return _this4._runRaw('COMMIT TRANSACTION');
                        }
                      }).then(function () {
                        state = true;
                        resolve();
                        _this4._checkTransactionQueue();
                      }).catch(function (err) {
                        reject(err);
                        _this4._checkTransactionQueue();
                      });
                    });
                  },
                  rollback: function rollback() {
                    return new Promise(function (resolve, reject) {
                      Promise.resolve().then(function () {
                        if (!_this4._client.manualTransaction) {
                          return _this4._runRaw('ROLLBACK TRANSACTION');
                        }
                      }).then(function () {
                        state = false;
                        resolve();
                        _this4._checkTransactionQueue();
                      }).catch(function (err) {
                        reject(err);
                        _this4._checkTransactionQueue();
                      });
                    });
                  }
                });
                _context6.next = 18;
                break;

              case 15:
                _context6.prev = 15;
                _context6.t0 = _context6['catch'](7);

                next.reject(_context6.t0);

              case 18:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this, [[7, 15]]);
      }));

      function _checkTransactionQueue() {
        return _ref6.apply(this, arguments);
      }

      return _checkTransactionQueue;
    }()
  }, {
    key: '_transaction',
    value: function () {
      var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
        var _this5 = this;

        var promise;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                promise = new Promise(function (resolve, reject) {
                  _this5._transactionQueue.push({
                    resolve: resolve,
                    reject: reject
                  });
                });

                if (!this._currentTransaction) {
                  this._checkTransactionQueue();
                }
                return _context7.abrupt('return', promise);

              case 3:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _transaction() {
        return _ref7.apply(this, arguments);
      }

      return _transaction;
    }()
  }, {
    key: 'transaction',
    value: function () {
      var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(f) {
        var t, result, committed;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                t = void 0;
                _context8.prev = 1;
                _context8.next = 4;
                return this._transaction();

              case 4:
                t = _context8.sent;
                result = void 0;
                committed = false;
                _context8.next = 9;
                return f.call(this._adapter, function (res) {
                  committed = true;
                  result = res;
                }, function (res) {
                  committed = false;
                  result = res;
                });

              case 9:
                if (!committed) {
                  _context8.next = 14;
                  break;
                }

                _context8.next = 12;
                return t.commit();

              case 12:
                _context8.next = 16;
                break;

              case 14:
                _context8.next = 16;
                return t.rollback();

              case 16:
                return _context8.abrupt('return', result);

              case 19:
                _context8.prev = 19;
                _context8.t0 = _context8['catch'](1);

                if (!(t && typeof t.state === 'undefined')) {
                  _context8.next = 30;
                  break;
                }

                _context8.prev = 22;
                _context8.next = 25;
                return t.rollback();

              case 25:
                _context8.next = 30;
                break;

              case 27:
                _context8.prev = 27;
                _context8.t1 = _context8['catch'](22);
                throw _context8.t1;

              case 30:
                throw _context8.t0;

              case 31:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this, [[1, 19], [22, 27]]);
      }));

      function transaction(_x4) {
        return _ref8.apply(this, arguments);
      }

      return transaction;
    }()
  }]);

  return SQLiteDatabaseWrapper;
}();

exports.default = SQLiteDatabaseWrapper;
//# sourceMappingURL=sqlite-database-wrapper.js.map
