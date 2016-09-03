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

var clients = new Map();

function createClient(name) {
  return new Promise(function (resolve, reject) {
    var db = new _sqlite2.default.Database(__projroot + '/../sqlite/' + name + '.sqlite', function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}
//# sourceMappingURL=sql-client-factory.js.map
