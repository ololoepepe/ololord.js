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

var _sqlite = require('sqlite3');

var _sqlite2 = _interopRequireDefault(_sqlite);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var clients = new Map();

function createClient(name) {
  return new Promise(function (resolve, reject) {
    var db = new _sqlite2.default.Database(__dirname + '/../../sqlite/' + name + '.sqlite', function (err) {
      if (err) {
        reject(err);
        return;
      }
      db.transaction = function () {
        return new Promise(function (resolve, reject) {
          db.run('BEGIN TRANSACTION', [], function (err) {
            if (err) {
              reject(err);
            } else {
              db.manualTransaction = true;
              resolve();
            }
          });
        });
      };
      db.commit = function () {
        return new Promise(function (resolve, reject) {
          db.run('COMMIT TRANSACTION', [], function (err) {
            db.manualTransaction = false;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      };
      db.rollback = function () {
        return new Promise(function (resolve, reject) {
          db.run('ROLLBACK TRANSACTION', [], function (err) {
            db.manualTransaction = false;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      };
      resolve(db);
    });
  });
}
//# sourceMappingURL=sql-client-factory.js.map
