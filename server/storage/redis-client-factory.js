'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.default = function (id) {
  if (id && ((typeof id === 'undefined' ? 'undefined' : _typeof(id)) === 'object' || typeof id === 'boolean')) {
    return createClient();
  }
  if (!id) {
    if (!defaultClient) {
      defaultClient = createClient();
    }
    return defaultClient;
  }
  var client = clients.get(id);
  if (!client) {
    client = createClient();
    clients.set(id, client);
  }
  return client;
};

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _ioredis = require('ioredis');

var _ioredis2 = _interopRequireDefault(_ioredis);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultClient = null;
var clients = new Map();
var scripts = new Map();

function loadScripts(path) {
  _fs2.default.readdirSync(path).forEach(function (entry) {
    var entryPath = path + '/' + entry;
    var stat = _fs2.default.statSync(entryPath);
    if (stat.isFile()) {
      var match = entry.match(/^(.+?)\.((\d+)\.)?lua$/);
      if (match) {
        scripts.set(match[1], {
          numberOfKeys: match[3] || 0,
          lua: _fs2.default.readFileSync(entryPath, 'utf8')
        });
      }
    } else if (stat.isDirectory()) {
      loadScripts(entryPath);
    }
  });
}

loadScripts(__dirname + '/../../misc/lua');

function createOptions() {
  return {
    host: (0, _config2.default)('system.redis.host'),
    port: (0, _config2.default)('system.redis.port'),
    family: (0, _config2.default)('system.redis.family'),
    password: (0, _config2.default)('system.redis.password'),
    db: (0, _config2.default)('system.redis.db')
  };
}

function createClient() {
  var redisNodes = (0, _config2.default)('system.redis.nodes');
  var client = void 0;
  if (_underscore2.default.isArray(redisNodes) && redisNodes.length > 0) {
    client = new _ioredis2.default.Cluster(redisNodes, {
      clusterRetryStrategy: (0, _config2.default)('system.redis.clusterRetryStrategy', function (times) {
        return Math.min(100 + times * 2, 2000);
      }),
      enableReadyCheck: (0, _config2.default)('system.redis.enableReadyCheck'),
      scaleReads: (0, _config2.default)('system.redis.scaleReads'),
      maxRedirections: (0, _config2.default)('system.redis.maxRedirections'),
      retryDelayOnFailover: (0, _config2.default)('system.redis.retryDelayOnFailover'),
      retryDelayOnClusterDown: (0, _config2.default)('system.redis.retryDelayOnClusterDown'),
      retryDelayOnTryAgain: (0, _config2.default)('system.redis.retryDelayOnTryAgain'),
      redisOptions: createOptions()
    });
  } else {
    client = new _ioredis2.default(createOptions());
  }
  scripts.forEach(function (script, name) {
    client.defineCommand(name, script);
  });
  return client;
}
//# sourceMappingURL=redis-client-factory.js.map
