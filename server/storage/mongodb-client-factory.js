'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = function () {
  if (!client) {
    client = new MongoDBClient();
  }
  return client;
};

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mongodb = require('mongodb');

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var INDEX_PATH = __dirname + '/../../misc/mongodb/indexes';
var INDEXES = (0, _underscore2.default)([INDEX_PATH, INDEX_PATH + '/custom'].map(function (path) {
  return _fs2.default.readdirSync(path).map(function (entry) {
    return path + '/' + entry;
  }).filter(function (entry) {
    return entry.split('.').slice(-1)[0] === 'json' && _fs2.default.statSync(entry).isFile();
  });
})).flatten().map(function (file) {
  try {
    var json = require(file);
    return {
      collectionName: json.collectionName || file.split('.').slice(0, -1).join('.'),
      indexes: json.indexes
    };
  } catch (err) {
    console.log(err);
  }
}).filter(function (index) {
  return !!index;
}).reduce(function (acc, index) {
  var indexes = acc[index.collectionName];
  if (!indexes) {
    indexes = {};
  }
  (0, _underscore2.default)(index.indexes).each(function (index, name) {
    indexes[name] = index;
  });
  acc[index.collectionName] = indexes;
  return acc;
}, {});

var client = null;

function createClient(url, options) {
  url = url || (0, _config2.default)('system.mongodb.url');
  options = options || { uri_decode_auth: (0, _config2.default)('system.mongodb.uri_decode_auth') };
  return new Promise(function (resolve, reject) {
    _mongodb.MongoClient.connect(url, options, function (err, db) {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

var MongoDBClient = function () {
  function MongoDBClient() {
    //

    _classCallCheck(this, MongoDBClient);
  }

  _createClass(MongoDBClient, [{
    key: 'addUser',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var _db$addUser;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.waitForConnected();

              case 2:
                _context.next = 4;
                return (_db$addUser = this._db.addUser).call.apply(_db$addUser, [this._db].concat(args));

              case 4:
                return _context.abrupt('return', _context.sent);

              case 5:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function addUser(_x) {
        return ref.apply(this, arguments);
      }

      return addUser;
    }()
  }, {
    key: 'admin',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var _db$admin;

        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.waitForConnected();

              case 2:
                _context2.next = 4;
                return (_db$admin = this._db.admin).call.apply(_db$admin, [this._db].concat(args));

              case 4:
                return _context2.abrupt('return', _context2.sent);

              case 5:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function admin(_x2) {
        return ref.apply(this, arguments);
      }

      return admin;
    }()
  }, {
    key: 'authenticate',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var _db$authenticate;

        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.waitForConnected();

              case 2:
                _context3.next = 4;
                return (_db$authenticate = this._db.authenticate).call.apply(_db$authenticate, [this._db].concat(args));

              case 4:
                return _context3.abrupt('return', _context3.sent);

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function authenticate(_x3) {
        return ref.apply(this, arguments);
      }

      return authenticate;
    }()
  }, {
    key: 'close',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var _db$close;

        for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
          args[_key4] = arguments[_key4];
        }

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.waitForConnected();

              case 2:
                _context4.next = 4;
                return (_db$close = this._db.close).call.apply(_db$close, [this._db].concat(args));

              case 4:
                return _context4.abrupt('return', _context4.sent);

              case 5:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function close(_x4) {
        return ref.apply(this, arguments);
      }

      return close;
    }()
  }, {
    key: 'collection',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        var _db$collection;

        for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
          args[_key5] = arguments[_key5];
        }

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.waitForConnected();

              case 2:
                _context5.next = 4;
                return (_db$collection = this._db.collection).call.apply(_db$collection, [this._db].concat(args));

              case 4:
                return _context5.abrupt('return', _context5.sent);

              case 5:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function collection(_x5) {
        return ref.apply(this, arguments);
      }

      return collection;
    }()
  }, {
    key: 'collections',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
        var _db$collections;

        for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
          args[_key6] = arguments[_key6];
        }

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.waitForConnected();

              case 2:
                _context6.next = 4;
                return (_db$collections = this._db.collections).call.apply(_db$collections, [this._db].concat(args));

              case 4:
                return _context6.abrupt('return', _context6.sent);

              case 5:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function collections(_x6) {
        return ref.apply(this, arguments);
      }

      return collections;
    }()
  }, {
    key: 'command',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
        var _db$command;

        for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
          args[_key7] = arguments[_key7];
        }

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.waitForConnected();

              case 2:
                _context7.next = 4;
                return (_db$command = this._db.command).call.apply(_db$command, [this._db].concat(args));

              case 4:
                return _context7.abrupt('return', _context7.sent);

              case 5:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function command(_x7) {
        return ref.apply(this, arguments);
      }

      return command;
    }()
  }, {
    key: 'createCollection',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
        var _db$createCollection;

        for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
          args[_key8] = arguments[_key8];
        }

        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.waitForConnected();

              case 2:
                _context8.next = 4;
                return (_db$createCollection = this._db.createCollection).call.apply(_db$createCollection, [this._db].concat(args));

              case 4:
                return _context8.abrupt('return', _context8.sent);

              case 5:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function createCollection(_x8) {
        return ref.apply(this, arguments);
      }

      return createCollection;
    }()
  }, {
    key: 'createIndex',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
        var _db$createIndex;

        for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
          args[_key9] = arguments[_key9];
        }

        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this.waitForConnected();

              case 2:
                _context9.next = 4;
                return (_db$createIndex = this._db.createIndex).call.apply(_db$createIndex, [this._db].concat(args));

              case 4:
                return _context9.abrupt('return', _context9.sent);

              case 5:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function createIndex(_x9) {
        return ref.apply(this, arguments);
      }

      return createIndex;
    }()
  }, {
    key: 'db',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
        var _db$db;

        for (var _len10 = arguments.length, args = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
          args[_key10] = arguments[_key10];
        }

        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return this.waitForConnected();

              case 2:
                _context10.next = 4;
                return (_db$db = this._db.db).call.apply(_db$db, [this._db].concat(args));

              case 4:
                return _context10.abrupt('return', _context10.sent);

              case 5:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function db(_x10) {
        return ref.apply(this, arguments);
      }

      return db;
    }()
  }, {
    key: 'dropCollection',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
        var _db$dropCollection;

        for (var _len11 = arguments.length, args = Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
          args[_key11] = arguments[_key11];
        }

        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return this.waitForConnected();

              case 2:
                _context11.next = 4;
                return (_db$dropCollection = this._db.dropCollection).call.apply(_db$dropCollection, [this._db].concat(args));

              case 4:
                return _context11.abrupt('return', _context11.sent);

              case 5:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function dropCollection(_x11) {
        return ref.apply(this, arguments);
      }

      return dropCollection;
    }()
  }, {
    key: 'dropDatabase',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
        var _db$dropDatabase;

        for (var _len12 = arguments.length, args = Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
          args[_key12] = arguments[_key12];
        }

        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return this.waitForConnected();

              case 2:
                _context12.next = 4;
                return (_db$dropDatabase = this._db.dropDatabase).call.apply(_db$dropDatabase, [this._db].concat(args));

              case 4:
                return _context12.abrupt('return', _context12.sent);

              case 5:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function dropDatabase(_x12) {
        return ref.apply(this, arguments);
      }

      return dropDatabase;
    }()
  }, {
    key: 'executeDbAdminCommand',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
        var _db$executeDbAdminCom;

        for (var _len13 = arguments.length, args = Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
          args[_key13] = arguments[_key13];
        }

        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _context13.next = 2;
                return this.waitForConnected();

              case 2:
                _context13.next = 4;
                return (_db$executeDbAdminCom = this._db.executeDbAdminCommand).call.apply(_db$executeDbAdminCom, [this._db].concat(args));

              case 4:
                return _context13.abrupt('return', _context13.sent);

              case 5:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function executeDbAdminCommand(_x13) {
        return ref.apply(this, arguments);
      }

      return executeDbAdminCommand;
    }()
  }, {
    key: 'indexInformation',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
        var _db$indexInformation;

        for (var _len14 = arguments.length, args = Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
          args[_key14] = arguments[_key14];
        }

        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return this.waitForConnected();

              case 2:
                _context14.next = 4;
                return (_db$indexInformation = this._db.indexInformation).call.apply(_db$indexInformation, [this._db].concat(args));

              case 4:
                return _context14.abrupt('return', _context14.sent);

              case 5:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function indexInformation(_x14) {
        return ref.apply(this, arguments);
      }

      return indexInformation;
    }()
  }, {
    key: 'listCollections',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15() {
        var _db$listCollections;

        for (var _len15 = arguments.length, args = Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
          args[_key15] = arguments[_key15];
        }

        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return this.waitForConnected();

              case 2:
                _context15.next = 4;
                return (_db$listCollections = this._db.listCollections).call.apply(_db$listCollections, [this._db].concat(args));

              case 4:
                return _context15.abrupt('return', _context15.sent);

              case 5:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function listCollections(_x15) {
        return ref.apply(this, arguments);
      }

      return listCollections;
    }()
  }, {
    key: 'logout',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16() {
        var _db$logout;

        for (var _len16 = arguments.length, args = Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
          args[_key16] = arguments[_key16];
        }

        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                _context16.next = 2;
                return this.waitForConnected();

              case 2:
                _context16.next = 4;
                return (_db$logout = this._db.logout).call.apply(_db$logout, [this._db].concat(args));

              case 4:
                return _context16.abrupt('return', _context16.sent);

              case 5:
              case 'end':
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function logout(_x16) {
        return ref.apply(this, arguments);
      }

      return logout;
    }()
  }, {
    key: 'open',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17() {
        var _db$open;

        for (var _len17 = arguments.length, args = Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
          args[_key17] = arguments[_key17];
        }

        return regeneratorRuntime.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                _context17.next = 2;
                return this.waitForConnected();

              case 2:
                _context17.next = 4;
                return (_db$open = this._db.open).call.apply(_db$open, [this._db].concat(args));

              case 4:
                return _context17.abrupt('return', _context17.sent);

              case 5:
              case 'end':
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function open(_x17) {
        return ref.apply(this, arguments);
      }

      return open;
    }()
  }, {
    key: 'removeUser',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18() {
        var _db$removeUser;

        for (var _len18 = arguments.length, args = Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
          args[_key18] = arguments[_key18];
        }

        return regeneratorRuntime.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                _context18.next = 2;
                return this.waitForConnected();

              case 2:
                _context18.next = 4;
                return (_db$removeUser = this._db.removeUser).call.apply(_db$removeUser, [this._db].concat(args));

              case 4:
                return _context18.abrupt('return', _context18.sent);

              case 5:
              case 'end':
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function removeUser(_x18) {
        return ref.apply(this, arguments);
      }

      return removeUser;
    }()
  }, {
    key: 'renameCollection',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19() {
        var _db$renameCollection;

        for (var _len19 = arguments.length, args = Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
          args[_key19] = arguments[_key19];
        }

        return regeneratorRuntime.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                _context19.next = 2;
                return this.waitForConnected();

              case 2:
                _context19.next = 4;
                return (_db$renameCollection = this._db.renameCollection).call.apply(_db$renameCollection, [this._db].concat(args));

              case 4:
                return _context19.abrupt('return', _context19.sent);

              case 5:
              case 'end':
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function renameCollection(_x19) {
        return ref.apply(this, arguments);
      }

      return renameCollection;
    }()
  }, {
    key: 'stats',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20() {
        var _db$stats;

        for (var _len20 = arguments.length, args = Array(_len20), _key20 = 0; _key20 < _len20; _key20++) {
          args[_key20] = arguments[_key20];
        }

        return regeneratorRuntime.wrap(function _callee20$(_context20) {
          while (1) {
            switch (_context20.prev = _context20.next) {
              case 0:
                _context20.next = 2;
                return this.waitForConnected();

              case 2:
                _context20.next = 4;
                return (_db$stats = this._db.stats).call.apply(_db$stats, [this._db].concat(args));

              case 4:
                return _context20.abrupt('return', _context20.sent);

              case 5:
              case 'end':
                return _context20.stop();
            }
          }
        }, _callee20, this);
      }));

      function stats(_x20) {
        return ref.apply(this, arguments);
      }

      return stats;
    }()
  }, {
    key: 'unref',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21() {
        var _db$unref;

        for (var _len21 = arguments.length, args = Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
          args[_key21] = arguments[_key21];
        }

        return regeneratorRuntime.wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                _context21.next = 2;
                return this.waitForConnected();

              case 2:
                _context21.next = 4;
                return (_db$unref = this._db.unref).call.apply(_db$unref, [this._db].concat(args));

              case 4:
                return _context21.abrupt('return', _context21.sent);

              case 5:
              case 'end':
                return _context21.stop();
            }
          }
        }, _callee21, this);
      }));

      function unref(_x21) {
        return ref.apply(this, arguments);
      }

      return unref;
    }()
  }, {
    key: 'createIndexes',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var dropExisting = _ref.dropExisting;
        var dropAll = _ref.dropAll;
        var db;
        return regeneratorRuntime.wrap(function _callee24$(_context24) {
          while (1) {
            switch (_context24.prev = _context24.next) {
              case 0:
                _context24.next = 2;
                return this.waitForConnected();

              case 2:
                db = this._db;
                _context24.next = 5;
                return Tools.series(INDEXES, function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(indexes, collectionName) {
                    var collection;
                    return regeneratorRuntime.wrap(function _callee23$(_context23) {
                      while (1) {
                        switch (_context23.prev = _context23.next) {
                          case 0:
                            collection = db.collection(collectionName);

                            if (!dropAll) {
                              _context23.next = 4;
                              break;
                            }

                            _context23.next = 4;
                            return collection.dropIndexes();

                          case 4:
                            return _context23.abrupt('return', Tools.series(indexes, function () {
                              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(_ref2, name) {
                                var index = _ref2.index;
                                var _ref2$options = _ref2.options;
                                var options = _ref2$options === undefined ? {} : _ref2$options;
                                return regeneratorRuntime.wrap(function _callee22$(_context22) {
                                  while (1) {
                                    switch (_context22.prev = _context22.next) {
                                      case 0:
                                        if (!(dropExisting && !dropAll)) {
                                          _context22.next = 3;
                                          break;
                                        }

                                        _context22.next = 3;
                                        return collection.dropIndex(name);

                                      case 3:
                                        options.name = name;
                                        _context22.next = 6;
                                        return collection.createIndex(index, options);

                                      case 6:
                                        return _context22.abrupt('return', _context22.sent);

                                      case 7:
                                      case 'end':
                                        return _context22.stop();
                                    }
                                  }
                                }, _callee22, this);
                              }));

                              return function (_x26, _x27) {
                                return ref.apply(this, arguments);
                              };
                            }()));

                          case 5:
                          case 'end':
                            return _context23.stop();
                        }
                      }
                    }, _callee23, this);
                  }));

                  return function (_x24, _x25) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 5:
              case 'end':
                return _context24.stop();
            }
          }
        }, _callee24, this);
      }));

      function createIndexes(_x22) {
        return ref.apply(this, arguments);
      }

      return createIndexes;
    }()
  }, {
    key: 'waitForConnected',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25() {
        return regeneratorRuntime.wrap(function _callee25$(_context25) {
          while (1) {
            switch (_context25.prev = _context25.next) {
              case 0:
                if (this._db) {
                  _context25.next = 5;
                  break;
                }

                console.log(Tools.translate('Connecting to MongoDB, please, wait…'));
                _context25.next = 4;
                return createClient();

              case 4:
                this._db = _context25.sent;

              case 5:
              case 'end':
                return _context25.stop();
            }
          }
        }, _callee25, this);
      }));

      function waitForConnected() {
        return ref.apply(this, arguments);
      }

      return waitForConnected;
    }()
  }]);

  return MongoDBClient;
}();
//# sourceMappingURL=mongodb-client-factory.js.map
