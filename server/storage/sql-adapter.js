'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sqliteDatabaseWrapper = require('./sqlite-database-wrapper');

var _sqliteDatabaseWrapper2 = _interopRequireDefault(_sqliteDatabaseWrapper);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SQLAdapter = function () {
  function SQLAdapter(client) {
    _classCallCheck(this, SQLAdapter);

    this._wrapper = new _sqliteDatabaseWrapper2.default(client, this);
  }

  _createClass(SQLAdapter, [{
    key: '_checkType',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(key, expectedType, create) {
        var t;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.type(key);

              case 2:
                t = _context.sent;

                if (!create) {
                  _context.next = 27;
                  break;
                }

                if (!(expectedType !== t && 'none' !== t)) {
                  _context.next = 6;
                  break;
                }

                throw new Error('Operation against a key holding the wrong kind of value');

              case 6:
                if (!('none' === t)) {
                  _context.next = 25;
                  break;
                }

                _context.next = 9;
                return this._wrapper.run('INSERT INTO _ololord_metadata (name, type) VALUES (?, ?)', key, expectedType);

              case 9:
                _context.t0 = expectedType;
                _context.next = _context.t0 === 'hash' ? 12 : _context.t0 === 'list' ? 15 : _context.t0 === 'set' ? 18 : _context.t0 === 'zset' ? 21 : 24;
                break;

              case 12:
                _context.next = 14;
                return this._wrapper.run('CREATE TABLE IF NOT EXISTS ' + key + ' (id TEXT PRIMARY KEY NOT NULL, value TEXT)');

              case 14:
                return _context.abrupt('break', 25);

              case 15:
                _context.next = 17;
                return this._wrapper.run('CREATE TABLE IF NOT EXISTS ' + key + ' (value TEXT)');

              case 17:
                return _context.abrupt('break', 25);

              case 18:
                _context.next = 20;
                return this._wrapper.run('CREATE TABLE IF NOT EXISTS ' + key + ' (value TEXT PRIMARY KEY NOT NULL)');

              case 20:
                return _context.abrupt('break', 25);

              case 21:
                _context.next = 23;
                return this._wrapper.run('CREATE TABLE IF NOT EXISTS ' + key + ' (value TEXT PRIMARY KEY, score INTEGER)');

              case 23:
                return _context.abrupt('break', 25);

              case 24:
                return _context.abrupt('break', 25);

              case 25:
                _context.next = 33;
                break;

              case 27:
                if (!('none' === t)) {
                  _context.next = 31;
                  break;
                }

                return _context.abrupt('return', null);

              case 31:
                if (!(expectedType !== t)) {
                  _context.next = 33;
                  break;
                }

                throw new Error('Operation against a key holding the wrong kind of value');

              case 33:
                return _context.abrupt('return', true);

              case 34:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function _checkType(_x, _x2, _x3) {
        return ref.apply(this, arguments);
      }

      return _checkType;
    }()
  }, {
    key: 'type',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(key) {
        var result;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this._wrapper.get('SELECT type FROM _ololord_metadata WHERE name = ?', key);

              case 2:
                result = _context2.sent;
                return _context2.abrupt('return', result ? result.type : 'none');

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function type(_x4) {
        return ref.apply(this, arguments);
      }

      return type;
    }()
  }, {
    key: 'exists',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(key) {
        var t;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.type(key);

              case 2:
                t = _context3.sent;
                return _context3.abrupt('return', 'none' !== type);

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function exists(_x5) {
        return ref.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: 'find',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(query) {
        var results;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                //TODO: improve replacing, handle unsupported symbols
                query = query.split('*').join('%').split('?').join('_');
                _context4.next = 3;
                return this._wrapper.get('SELECT name FROM _ololord_metadata WHERE name LIKE ?', query);

              case 3:
                results = _context4.sent;
                return _context4.abrupt('return', results.map(function (result) {
                  return result.name;
                }));

              case 5:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function find(_x6) {
        return ref.apply(this, arguments);
      }

      return find;
    }()
  }, {
    key: 'delete',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(key) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(commit, rollback) {
                    var t;
                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            _context5.next = 2;
                            return this.type(key);

                          case 2:
                            t = _context5.sent;

                            if (!('none' === t)) {
                              _context5.next = 7;
                              break;
                            }

                            commit(0);
                            _context5.next = 17;
                            break;

                          case 7:
                            _context5.next = 9;
                            return this._wrapper.run('DELETE FROM _ololord_metadata WHERE name LIKE ?', key);

                          case 9:
                            if (!('string' === t)) {
                              _context5.next = 14;
                              break;
                            }

                            _context5.next = 12;
                            return this._wrapper.run('DELETE FROM _ololord_keys WHERE key = ?', key);

                          case 12:
                            _context5.next = 16;
                            break;

                          case 14:
                            _context5.next = 16;
                            return this._wrapper.run('DROP TABLE ' + key);

                          case 16:
                            commit(1);

                          case 17:
                          case 'end':
                            return _context5.stop();
                        }
                      }
                    }, _callee5, this);
                  }));

                  return function (_x8, _x9) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _delete(_x7) {
        return ref.apply(this, arguments);
      }

      return _delete;
    }()
  }, {
    key: 'expire',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(key) {
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function expire(_x10) {
        return ref.apply(this, arguments);
      }

      return expire;
    }()
  }, {
    key: 'get',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(key) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee8$(_context8) {
                      while (1) {
                        switch (_context8.prev = _context8.next) {
                          case 0:
                            _context8.next = 2;
                            return this._checkType(key, 'string');

                          case 2:
                            result = _context8.sent;

                            if (result) {
                              _context8.next = 5;
                              break;
                            }

                            return _context8.abrupt('return', rollback(result));

                          case 5:
                            _context8.next = 7;
                            return this._wrapper.get('SELECT value FROM _ololord_keys WHERE key = ?', key);

                          case 7:
                            result = _context8.sent;

                            result = result || {};
                            commit(typeof result.value !== 'undefined' ? result.value : null);

                          case 10:
                          case 'end':
                            return _context8.stop();
                        }
                      }
                    }, _callee8, this);
                  }));

                  return function (_x12, _x13) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context9.abrupt('return', _context9.sent);

              case 3:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function get(_x11) {
        return ref.apply(this, arguments);
      }

      return get;
    }()
  }, {
    key: 'set',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(key, data) {
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(commit, rollback) {
                    return regeneratorRuntime.wrap(function _callee10$(_context10) {
                      while (1) {
                        switch (_context10.prev = _context10.next) {
                          case 0:
                            _context10.next = 2;
                            return this._checkType(key, 'string', true);

                          case 2:
                            _context10.next = 4;
                            return this._wrapper.run('UPDATE _ololord_keys SET value = ? WHERE key = ?', data, key);

                          case 4:
                            _context10.next = 6;
                            return this._wrapper.run('INSERT OR IGNORE INTO _ololord_keys (key, value) VALUES (?, ?)', key, data);

                          case 6:
                            commit();

                          case 7:
                          case 'end':
                            return _context10.stop();
                        }
                      }
                    }, _callee10, this);
                  }));

                  return function (_x16, _x17) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context11.abrupt('return', _context11.sent);

              case 3:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function set(_x14, _x15) {
        return ref.apply(this, arguments);
      }

      return set;
    }()
  }, {
    key: 'incrby',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(key, value) {
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _context13.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee12$(_context12) {
                      while (1) {
                        switch (_context12.prev = _context12.next) {
                          case 0:
                            _context12.next = 2;
                            return this._checkType(key, 'string', true);

                          case 2:
                            _context12.next = 4;
                            return this._wrapper.get('SELECT value FROM _ololord_keys WHERE key = ?', key);

                          case 4:
                            result = _context12.sent;

                            result = result || {};

                            if (!(result.value && isNaN(+result.value))) {
                              _context12.next = 8;
                              break;
                            }

                            throw new Error('value is not an integer');

                          case 8:
                            if (result.value) {
                              result.value = +result.value + +value;
                            } else {
                              result.value = +value;
                            }
                            _context12.next = 11;
                            return this._wrapper.run('UPDATE _ololord_keys SET value = ? WHERE key = ?', result.value, key);

                          case 11:
                            _context12.next = 13;
                            return this._wrapper.run('INSERT OR IGNORE INTO _ololord_keys (key, value) VALUES (?, ?)', key, result.value);

                          case 13:
                            commit(result.value);

                          case 14:
                          case 'end':
                            return _context12.stop();
                        }
                      }
                    }, _callee12, this);
                  }));

                  return function (_x20, _x21) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context13.abrupt('return', _context13.sent);

              case 3:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function incrby(_x18, _x19) {
        return ref.apply(this, arguments);
      }

      return incrby;
    }()
  }, {
    key: 'hget',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(key, id) {
        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee14$(_context14) {
                      while (1) {
                        switch (_context14.prev = _context14.next) {
                          case 0:
                            _context14.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context14.sent;

                            if (result) {
                              _context14.next = 5;
                              break;
                            }

                            return _context14.abrupt('return', rollback(result));

                          case 5:
                            _context14.next = 7;
                            return this._wrapper.get('SELECT value FROM ' + key + ' WHERE id = ?', id);

                          case 7:
                            result = _context14.sent;

                            result = result || {};
                            commit(typeof result.value !== 'undefined' ? result.value : null);

                          case 10:
                          case 'end':
                            return _context14.stop();
                        }
                      }
                    }, _callee14, this);
                  }));

                  return function (_x24, _x25) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context15.abrupt('return', _context15.sent);

              case 3:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function hget(_x22, _x23) {
        return ref.apply(this, arguments);
      }

      return hget;
    }()
  }, {
    key: 'hmget',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(key) {
        for (var _len = arguments.length, ids = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          ids[_key - 1] = arguments[_key];
        }

        return regeneratorRuntime.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                _context17.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(commit, rollback) {
                    var _wrapper;

                    var result, q, results;
                    return regeneratorRuntime.wrap(function _callee16$(_context16) {
                      while (1) {
                        switch (_context16.prev = _context16.next) {
                          case 0:
                            _context16.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context16.sent;

                            if (result) {
                              _context16.next = 5;
                              break;
                            }

                            return _context16.abrupt('return', rollback(result));

                          case 5:
                            q = 'SELECT id, value FROM ' + key + ' WHERE id IN (' + ids.map(function (_1) {
                              return '?';
                            }).join(', ') + ')';
                            _context16.next = 8;
                            return (_wrapper = this._wrapper).get.apply(_wrapper, [q, key].concat(ids));

                          case 8:
                            results = _context16.sent;

                            results = results.reduce(function (acc, res) {
                              acc[res.id] = res.value;
                              return acc;
                            }, {});
                            commit(ids.reduce(function (acc, id) {
                              var res = results[id];
                              if (typeof res === 'undefined') {
                                acc[id] = null;
                              } else {
                                acc[id] = typeof res.value !== 'undefined' ? res.value : null;
                              }
                              return acc;
                            }, {}));

                          case 11:
                          case 'end':
                            return _context16.stop();
                        }
                      }
                    }, _callee16, this);
                  }));

                  return function (_x28, _x29) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context17.abrupt('return', _context17.sent);

              case 3:
              case 'end':
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function hmget(_x26, _x27) {
        return ref.apply(this, arguments);
      }

      return hmget;
    }()
  }, {
    key: 'hgetall',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(key) {
        return regeneratorRuntime.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                _context19.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(commit, rollback) {
                    var result, results;
                    return regeneratorRuntime.wrap(function _callee18$(_context18) {
                      while (1) {
                        switch (_context18.prev = _context18.next) {
                          case 0:
                            _context18.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context18.sent;

                            if (result) {
                              _context18.next = 5;
                              break;
                            }

                            return _context18.abrupt('return', rollback(result));

                          case 5:
                            _context18.next = 7;
                            return this._wrapper.get('SELECT id, value FROM ' + key);

                          case 7:
                            results = _context18.sent;

                            commit(results.reduce(function (acc, res) {
                              acc[res.id] = typeof res.value !== 'undefined' ? res.value : null;
                              return acc;
                            }, {}));

                          case 9:
                          case 'end':
                            return _context18.stop();
                        }
                      }
                    }, _callee18, this);
                  }));

                  return function (_x31, _x32) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context19.abrupt('return', _context19.sent);

              case 3:
              case 'end':
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function hgetall(_x30) {
        return ref.apply(this, arguments);
      }

      return hgetall;
    }()
  }, {
    key: 'hexists',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(key, id) {
        return regeneratorRuntime.wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                _context21.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee20$(_context20) {
                      while (1) {
                        switch (_context20.prev = _context20.next) {
                          case 0:
                            _context20.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context20.sent;

                            if (result) {
                              _context20.next = 5;
                              break;
                            }

                            return _context20.abrupt('return', rollback(0));

                          case 5:
                            _context20.next = 7;
                            return this._wrapper.get('SELECT id FROM ' + key + ' WHERE id = ?', id);

                          case 7:
                            result = _context20.sent;

                            result = result || {};
                            commit(typeof result.id !== 'undefined' ? 1 : 0);

                          case 10:
                          case 'end':
                            return _context20.stop();
                        }
                      }
                    }, _callee20, this);
                  }));

                  return function (_x35, _x36) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context21.abrupt('return', _context21.sent);

              case 3:
              case 'end':
                return _context21.stop();
            }
          }
        }, _callee21, this);
      }));

      function hexists(_x33, _x34) {
        return ref.apply(this, arguments);
      }

      return hexists;
    }()
  }, {
    key: 'hset',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(key, id, data) {
        return regeneratorRuntime.wrap(function _callee23$(_context23) {
          while (1) {
            switch (_context23.prev = _context23.next) {
              case 0:
                _context23.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee22$(_context22) {
                      while (1) {
                        switch (_context22.prev = _context22.next) {
                          case 0:
                            _context22.next = 2;
                            return this._checkType(key, 'hash', true);

                          case 2:
                            _context22.next = 4;
                            return this._wrapper.get('SELECT id FROM ' + key + ' WHERE id = ?', id);

                          case 4:
                            result = _context22.sent;
                            _context22.next = 7;
                            return this._wrapper.run('UPDATE ' + key + ' SET value = ? WHERE id = ?', data, id);

                          case 7:
                            _context22.next = 9;
                            return this._wrapper.run('INSERT OR IGNORE INTO ' + key + ' (id, value) VALUES (?, ?)', id, data);

                          case 9:
                            result = result || {};
                            commit(result.id ? 0 : 1);

                          case 11:
                          case 'end':
                            return _context22.stop();
                        }
                      }
                    }, _callee22, this);
                  }));

                  return function (_x40, _x41) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context23.abrupt('return', _context23.sent);

              case 3:
              case 'end':
                return _context23.stop();
            }
          }
        }, _callee23, this);
      }));

      function hset(_x37, _x38, _x39) {
        return ref.apply(this, arguments);
      }

      return hset;
    }()
  }, {
    key: 'hmset',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(key) {
        for (var _len2 = arguments.length, items = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          items[_key2 - 1] = arguments[_key2];
        }

        return regeneratorRuntime.wrap(function _callee26$(_context26) {
          while (1) {
            switch (_context26.prev = _context26.next) {
              case 0:
                _context26.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(commit, rollback) {
                    var self;
                    return regeneratorRuntime.wrap(function _callee25$(_context25) {
                      while (1) {
                        switch (_context25.prev = _context25.next) {
                          case 0:
                            _context25.next = 2;
                            return this._checkType(key, 'hash', true);

                          case 2:
                            self = this;
                            _context25.next = 5;
                            return Tools.series(Tools.chunk(items, 2), function () {
                              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(chunk) {
                                return regeneratorRuntime.wrap(function _callee24$(_context24) {
                                  while (1) {
                                    switch (_context24.prev = _context24.next) {
                                      case 0:
                                        _context24.next = 2;
                                        return self._wrapper.run('UPDATE ' + key + ' SET value = ? WHERE id = ?', chunk[1], chunk[0]);

                                      case 2:
                                        _context24.next = 4;
                                        return self._wrapper.run('INSERT OR IGNORE INTO ' + key + ' (id, value) VALUES (?, ?)', chunk[0], chunk[1]);

                                      case 4:
                                      case 'end':
                                        return _context24.stop();
                                    }
                                  }
                                }, _callee24, this);
                              }));

                              return function (_x46) {
                                return ref.apply(this, arguments);
                              };
                            }());

                          case 5:
                            commit();

                          case 6:
                          case 'end':
                            return _context25.stop();
                        }
                      }
                    }, _callee25, this);
                  }));

                  return function (_x44, _x45) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context26.abrupt('return', _context26.sent);

              case 3:
              case 'end':
                return _context26.stop();
            }
          }
        }, _callee26, this);
      }));

      function hmset(_x42, _x43) {
        return ref.apply(this, arguments);
      }

      return hmset;
    }()
  }, {
    key: 'hincrby',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee28(key, id, value) {
        return regeneratorRuntime.wrap(function _callee28$(_context28) {
          while (1) {
            switch (_context28.prev = _context28.next) {
              case 0:
                _context28.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee27$(_context27) {
                      while (1) {
                        switch (_context27.prev = _context27.next) {
                          case 0:
                            _context27.next = 2;
                            return this._checkType(key, 'hash', true);

                          case 2:
                            _context27.next = 4;
                            return this._wrapper.get('SELECT id, value FROM ' + key + ' WHERE id = ?', id);

                          case 4:
                            result = _context27.sent;

                            result = result || {};

                            if (!(result.id && isNaN(+result.value))) {
                              _context27.next = 8;
                              break;
                            }

                            throw new Error('hash value is not an integer');

                          case 8:
                            if (result.id) {
                              result.value = +result.value + +value;
                            } else {
                              result.value = +value;
                            }
                            _context27.next = 11;
                            return this._wrapper.run('UPDATE ' + key + ' SET value = ? WHERE id = ?', result.value, id);

                          case 11:
                            _context27.next = 13;
                            return this._wrapper.run('INSERT OR IGNORE INTO ' + key + ' (id, value) VALUES (?, ?)', id, result.value);

                          case 13:
                            commit(result.value);

                          case 14:
                          case 'end':
                            return _context27.stop();
                        }
                      }
                    }, _callee27, this);
                  }));

                  return function (_x50, _x51) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context28.abrupt('return', _context28.sent);

              case 3:
              case 'end':
                return _context28.stop();
            }
          }
        }, _callee28, this);
      }));

      function hincrby(_x47, _x48, _x49) {
        return ref.apply(this, arguments);
      }

      return hincrby;
    }()
  }, {
    key: 'hdel',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee31(key) {
        for (var _len3 = arguments.length, ids = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          ids[_key3 - 1] = arguments[_key3];
        }

        return regeneratorRuntime.wrap(function _callee31$(_context31) {
          while (1) {
            switch (_context31.prev = _context31.next) {
              case 0:
                _context31.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee30(commit, rollback) {
                    var result, self, count;
                    return regeneratorRuntime.wrap(function _callee30$(_context30) {
                      while (1) {
                        switch (_context30.prev = _context30.next) {
                          case 0:
                            _context30.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context30.sent;

                            if (result) {
                              _context30.next = 5;
                              break;
                            }

                            return _context30.abrupt('return', rollback(0));

                          case 5:
                            self = this;
                            count = 0;
                            _context30.next = 9;
                            return Tools.series(ids, function () {
                              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee29(id) {
                                var result;
                                return regeneratorRuntime.wrap(function _callee29$(_context29) {
                                  while (1) {
                                    switch (_context29.prev = _context29.next) {
                                      case 0:
                                        _context29.next = 2;
                                        return self._wrapper.get('SELECT id FROM ' + key + ' WHERE id = ?', id);

                                      case 2:
                                        result = _context29.sent;
                                        _context29.next = 5;
                                        return self._wrapper.run('DELETE FROM ' + key + ' WHERE id = ?', id);

                                      case 5:
                                        result = result || {};
                                        if (result.id) {
                                          ++count;
                                        }

                                      case 7:
                                      case 'end':
                                        return _context29.stop();
                                    }
                                  }
                                }, _callee29, this);
                              }));

                              return function (_x56) {
                                return ref.apply(this, arguments);
                              };
                            }());

                          case 9:
                            _context30.next = 11;
                            return this._wrapper.get('SELECT count(id) FROM ' + key);

                          case 11:
                            result = _context30.sent;

                            result = result || {};

                            if (!(Tools.option(result['count(id)'], 'number', { test: function test(c) {
                                return c > 0;
                              } }) <= 0)) {
                              _context30.next = 18;
                              break;
                            }

                            _context30.next = 16;
                            return this._wrapper.run('DELETE FROM _ololord_metadata WHERE name LIKE ?', key);

                          case 16:
                            _context30.next = 18;
                            return this._wrapper.run('DROP TABLE ' + key);

                          case 18:
                            commit(count);

                          case 19:
                          case 'end':
                            return _context30.stop();
                        }
                      }
                    }, _callee30, this);
                  }));

                  return function (_x54, _x55) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context31.abrupt('return', _context31.sent);

              case 3:
              case 'end':
                return _context31.stop();
            }
          }
        }, _callee31, this);
      }));

      function hdel(_x52, _x53) {
        return ref.apply(this, arguments);
      }

      return hdel;
    }()
  }, {
    key: 'hkeys',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee33(key) {
        return regeneratorRuntime.wrap(function _callee33$(_context33) {
          while (1) {
            switch (_context33.prev = _context33.next) {
              case 0:
                _context33.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee32(commit, rollback) {
                    var result, results;
                    return regeneratorRuntime.wrap(function _callee32$(_context32) {
                      while (1) {
                        switch (_context32.prev = _context32.next) {
                          case 0:
                            _context32.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context32.sent;

                            if (!result) {
                              rollback([]);
                            }
                            _context32.next = 6;
                            return this._wrapper.get('SELECT id FROM ' + key);

                          case 6:
                            results = _context32.sent;

                            commit(results.map(function (res) {
                              return res.id;
                            }));

                          case 8:
                          case 'end':
                            return _context32.stop();
                        }
                      }
                    }, _callee32, this);
                  }));

                  return function (_x58, _x59) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context33.abrupt('return', _context33.sent);

              case 3:
              case 'end':
                return _context33.stop();
            }
          }
        }, _callee33, this);
      }));

      function hkeys(_x57) {
        return ref.apply(this, arguments);
      }

      return hkeys;
    }()
  }, {
    key: 'hlen',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee35(key) {
        return regeneratorRuntime.wrap(function _callee35$(_context35) {
          while (1) {
            switch (_context35.prev = _context35.next) {
              case 0:
                _context35.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee34(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee34$(_context34) {
                      while (1) {
                        switch (_context34.prev = _context34.next) {
                          case 0:
                            _context34.next = 2;
                            return this._checkType(key, 'hash');

                          case 2:
                            result = _context34.sent;

                            if (!result) {
                              rollback(0);
                            }
                            _context34.next = 6;
                            return this._wrapper.get('SELECT count(id) FROM ' + key);

                          case 6:
                            result = _context34.sent;

                            result = result || {};
                            commit(Tools.option(result['count(id)'], 'number', { test: function test(c) {
                                return c > 0;
                              } }));

                          case 9:
                          case 'end':
                            return _context34.stop();
                        }
                      }
                    }, _callee34, this);
                  }));

                  return function (_x61, _x62) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context35.abrupt('return', _context35.sent);

              case 3:
              case 'end':
                return _context35.stop();
            }
          }
        }, _callee35, this);
      }));

      function hlen(_x60) {
        return ref.apply(this, arguments);
      }

      return hlen;
    }()
  }, {
    key: 'srandmember',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee37(key) {
        return regeneratorRuntime.wrap(function _callee37$(_context37) {
          while (1) {
            switch (_context37.prev = _context37.next) {
              case 0:
                _context37.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee36(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee36$(_context36) {
                      while (1) {
                        switch (_context36.prev = _context36.next) {
                          case 0:
                            _context36.next = 2;
                            return this._checkType(key, 'set');

                          case 2:
                            result = _context36.sent;

                            if (result) {
                              _context36.next = 5;
                              break;
                            }

                            return _context36.abrupt('return', rollback(result));

                          case 5:
                            _context36.next = 7;
                            return this._wrapper.get('SELECT value FROM ' + key + ' LIMIT 1');

                          case 7:
                            result = _context36.sent;

                            result = result || {};
                            commit(typeof result.value !== 'undefined' ? result.value : null);

                          case 10:
                          case 'end':
                            return _context36.stop();
                        }
                      }
                    }, _callee36, this);
                  }));

                  return function (_x64, _x65) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context37.abrupt('return', _context37.sent);

              case 3:
              case 'end':
                return _context37.stop();
            }
          }
        }, _callee37, this);
      }));

      function srandmember(_x63) {
        return ref.apply(this, arguments);
      }

      return srandmember;
    }()
  }, {
    key: 'smembers',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee39(key) {
        return regeneratorRuntime.wrap(function _callee39$(_context39) {
          while (1) {
            switch (_context39.prev = _context39.next) {
              case 0:
                _context39.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee38(commit, rollback) {
                    var result, results;
                    return regeneratorRuntime.wrap(function _callee38$(_context38) {
                      while (1) {
                        switch (_context38.prev = _context38.next) {
                          case 0:
                            _context38.next = 2;
                            return this._checkType(key, 'set');

                          case 2:
                            result = _context38.sent;

                            if (result) {
                              _context38.next = 5;
                              break;
                            }

                            return _context38.abrupt('return', rollback([]));

                          case 5:
                            _context38.next = 7;
                            return this._wrapper.all('SELECT value FROM ' + key);

                          case 7:
                            results = _context38.sent;

                            commit(results.map(function (res) {
                              return typeof res.value !== 'undefined' ? res.value : null;
                            }));

                          case 9:
                          case 'end':
                            return _context38.stop();
                        }
                      }
                    }, _callee38, this);
                  }));

                  return function (_x67, _x68) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context39.abrupt('return', _context39.sent);

              case 3:
              case 'end':
                return _context39.stop();
            }
          }
        }, _callee39, this);
      }));

      function smembers(_x66) {
        return ref.apply(this, arguments);
      }

      return smembers;
    }()
  }, {
    key: 'sismember',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee41(key, data) {
        return regeneratorRuntime.wrap(function _callee41$(_context41) {
          while (1) {
            switch (_context41.prev = _context41.next) {
              case 0:
                _context41.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee40(commit, rollback) {
                    var result, results;
                    return regeneratorRuntime.wrap(function _callee40$(_context40) {
                      while (1) {
                        switch (_context40.prev = _context40.next) {
                          case 0:
                            _context40.next = 2;
                            return this._checkType(key, 'set');

                          case 2:
                            result = _context40.sent;

                            if (result) {
                              _context40.next = 5;
                              break;
                            }

                            return _context40.abrupt('return', rollback(0));

                          case 5:
                            _context40.next = 7;
                            return this._wrapper.all('SELECT count(value) FROM ' + key + ' WHERE value = ?', data);

                          case 7:
                            results = _context40.sent;

                            commit(Tools.option(result['count(value)'], 'number', { test: function test(c) {
                                return c > 0;
                              } }));

                          case 9:
                          case 'end':
                            return _context40.stop();
                        }
                      }
                    }, _callee40, this);
                  }));

                  return function (_x71, _x72) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context41.abrupt('return', _context41.sent);

              case 3:
              case 'end':
                return _context41.stop();
            }
          }
        }, _callee41, this);
      }));

      function sismember(_x69, _x70) {
        return ref.apply(this, arguments);
      }

      return sismember;
    }()
  }, {
    key: 'sadd',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee44(key) {
        for (var _len4 = arguments.length, items = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
          items[_key4 - 1] = arguments[_key4];
        }

        return regeneratorRuntime.wrap(function _callee44$(_context44) {
          while (1) {
            switch (_context44.prev = _context44.next) {
              case 0:
                _context44.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee43(commit, rollback) {
                    var self, count;
                    return regeneratorRuntime.wrap(function _callee43$(_context43) {
                      while (1) {
                        switch (_context43.prev = _context43.next) {
                          case 0:
                            _context43.next = 2;
                            return this._checkType(key, 'set', true);

                          case 2:
                            self = this;
                            count = 0;
                            _context43.next = 6;
                            return Tools.series(items, function () {
                              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee42(data) {
                                var result;
                                return regeneratorRuntime.wrap(function _callee42$(_context42) {
                                  while (1) {
                                    switch (_context42.prev = _context42.next) {
                                      case 0:
                                        _context42.next = 2;
                                        return self._wrapper.get('SELECT count(value) FROM ' + key + ' WHERE value = ?', data);

                                      case 2:
                                        result = _context42.sent;

                                        result = result || {};

                                        if (!(Tools.option(result['count(value)'], 'number', { test: function test(c) {
                                            return c > 0;
                                          } }) <= 0)) {
                                          _context42.next = 8;
                                          break;
                                        }

                                        _context42.next = 7;
                                        return self._wrapper.run('INSERT INTO ' + key + ' (value) VALUES (?)', data);

                                      case 7:
                                        ++count;

                                      case 8:
                                      case 'end':
                                        return _context42.stop();
                                    }
                                  }
                                }, _callee42, this);
                              }));

                              return function (_x77) {
                                return ref.apply(this, arguments);
                              };
                            }());

                          case 6:
                            commit(count);

                          case 7:
                          case 'end':
                            return _context43.stop();
                        }
                      }
                    }, _callee43, this);
                  }));

                  return function (_x75, _x76) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context44.abrupt('return', _context44.sent);

              case 3:
              case 'end':
                return _context44.stop();
            }
          }
        }, _callee44, this);
      }));

      function sadd(_x73, _x74) {
        return ref.apply(this, arguments);
      }

      return sadd;
    }()
  }, {
    key: 'srem',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee47(key) {
        return regeneratorRuntime.wrap(function _callee47$(_context47) {
          while (1) {
            switch (_context47.prev = _context47.next) {
              case 0:
                _context47.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee46(commit, rollback) {
                    var result, self, count;
                    return regeneratorRuntime.wrap(function _callee46$(_context46) {
                      while (1) {
                        switch (_context46.prev = _context46.next) {
                          case 0:
                            _context46.next = 2;
                            return this._checkType(key, 'set');

                          case 2:
                            result = _context46.sent;

                            if (result) {
                              _context46.next = 5;
                              break;
                            }

                            return _context46.abrupt('return', rollback(0));

                          case 5:
                            self = this;
                            count = 0;
                            _context46.next = 9;
                            return Tools.series(ids, function () {
                              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee45(data) {
                                var result;
                                return regeneratorRuntime.wrap(function _callee45$(_context45) {
                                  while (1) {
                                    switch (_context45.prev = _context45.next) {
                                      case 0:
                                        _context45.next = 2;
                                        return self._wrapper.get('SELECT count(value) FROM ' + key + ' WHERE value = ?', data);

                                      case 2:
                                        result = _context45.sent;
                                        _context45.next = 5;
                                        return self._wrapper.run('DELETE FROM ' + key + ' WHERE value = ?', data);

                                      case 5:
                                        result = result || {};
                                        if (Tools.option(result['count(value)'], 'number', { test: function test(c) {
                                            return c > 0;
                                          } }) >= 0) {
                                          ++count;
                                        }

                                      case 7:
                                      case 'end':
                                        return _context45.stop();
                                    }
                                  }
                                }, _callee45, this);
                              }));

                              return function (_x82) {
                                return ref.apply(this, arguments);
                              };
                            }());

                          case 9:
                            _context46.next = 11;
                            return this._wrapper.get('SELECT count(value) FROM ' + key);

                          case 11:
                            result = _context46.sent;

                            result = result || {};

                            if (!(Tools.option(result['count(id)'], 'number', { test: function test(c) {
                                return c > 0;
                              } }) <= 0)) {
                              _context46.next = 18;
                              break;
                            }

                            _context46.next = 16;
                            return this._wrapper.run('DELETE FROM _ololord_metadata WHERE name LIKE ?', key);

                          case 16:
                            _context46.next = 18;
                            return this._wrapper.run('DROP TABLE ' + key);

                          case 18:
                            commit(count);

                          case 19:
                          case 'end':
                            return _context46.stop();
                        }
                      }
                    }, _callee46, this);
                  }));

                  return function (_x80, _x81) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context47.abrupt('return', _context47.sent);

              case 3:
              case 'end':
                return _context47.stop();
            }
          }
        }, _callee47, this);
      }));

      function srem(_x78, _x79) {
        return ref.apply(this, arguments);
      }

      return srem;
    }()
  }, {
    key: 'scard',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee49(key) {
        return regeneratorRuntime.wrap(function _callee49$(_context49) {
          while (1) {
            switch (_context49.prev = _context49.next) {
              case 0:
                _context49.next = 2;
                return this._wrapper.transaction(function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee48(commit, rollback) {
                    var result;
                    return regeneratorRuntime.wrap(function _callee48$(_context48) {
                      while (1) {
                        switch (_context48.prev = _context48.next) {
                          case 0:
                            _context48.next = 2;
                            return this._checkType(key, 'set');

                          case 2:
                            result = _context48.sent;

                            if (!result) {
                              rollback(0);
                            }
                            _context48.next = 6;
                            return this._wrapper.get('SELECT count(value) FROM ' + key);

                          case 6:
                            result = _context48.sent;

                            result = result || {};
                            commit(Tools.option(result['count(value)'], 'number', { test: function test(c) {
                                return c > 0;
                              } }));

                          case 9:
                          case 'end':
                            return _context48.stop();
                        }
                      }
                    }, _callee48, this);
                  }));

                  return function (_x84, _x85) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
                return _context49.abrupt('return', _context49.sent);

              case 3:
              case 'end':
                return _context49.stop();
            }
          }
        }, _callee49, this);
      }));

      function scard(_x83) {
        return ref.apply(this, arguments);
      }

      return scard;
    }()
  }, {
    key: 'zrange',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee50(key, lb, ub) {
        return regeneratorRuntime.wrap(function _callee50$(_context50) {
          while (1) {
            switch (_context50.prev = _context50.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context50.stop();
            }
          }
        }, _callee50, this);
      }));

      function zrange(_x86, _x87, _x88) {
        return ref.apply(this, arguments);
      }

      return zrange;
    }()
  }, {
    key: 'zrangebyscroe',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee51(key, lb, ub) {
        return regeneratorRuntime.wrap(function _callee51$(_context51) {
          while (1) {
            switch (_context51.prev = _context51.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context51.stop();
            }
          }
        }, _callee51, this);
      }));

      function zrangebyscroe(_x89, _x90, _x91) {
        return ref.apply(this, arguments);
      }

      return zrangebyscroe;
    }()
  }, {
    key: 'zadd',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee52(key) {
        return regeneratorRuntime.wrap(function _callee52$(_context52) {
          while (1) {
            switch (_context52.prev = _context52.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context52.stop();
            }
          }
        }, _callee52, this);
      }));

      function zadd(_x92, _x93) {
        return ref.apply(this, arguments);
      }

      return zadd;
    }()
  }, {
    key: 'zrem',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee53(key) {
        return regeneratorRuntime.wrap(function _callee53$(_context53) {
          while (1) {
            switch (_context53.prev = _context53.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context53.stop();
            }
          }
        }, _callee53, this);
      }));

      function zrem(_x94, _x95) {
        return ref.apply(this, arguments);
      }

      return zrem;
    }()
  }, {
    key: 'zcard',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee54(key) {
        return regeneratorRuntime.wrap(function _callee54$(_context54) {
          while (1) {
            switch (_context54.prev = _context54.next) {
              case 0:
                _logger2.default.warn(Tools.translate('"$[1]" is not implemented for SQL tables. Table: "$[2]"', '', '', key));

              case 1:
              case 'end':
                return _context54.stop();
            }
          }
        }, _callee54, this);
      }));

      function zcard(_x96) {
        return ref.apply(this, arguments);
      }

      return zcard;
    }()
  }]);

  return SQLAdapter;
}();

exports.default = SQLAdapter;
//# sourceMappingURL=sql-adapter.js.map
