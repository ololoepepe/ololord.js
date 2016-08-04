'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (force) {
  var redisNodes = (0, _config2.default)('system.redis.nodes');
  if (client && !force) {
    return client;
  }
  if (_underscore2.default.isArray(redisNodes) && redisNodes.length > 0) {
    var c = new _ioredis2.default.Cluster(redisNodes, {
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
    var c = new _ioredis2.default(createOptions());
  }
  if (!client) {
    client = c;
  }
  return c;
};

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _ioredis = require('ioredis');

var _ioredis2 = _interopRequireDefault(_ioredis);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var client = null;

function createOptions() {
  return {
    host: (0, _config2.default)('system.redis.host'),
    port: (0, _config2.default)('system.redis.port'),
    family: (0, _config2.default)('system.redis.family'),
    password: (0, _config2.default)('system.redis.password'),
    db: (0, _config2.default)('system.redis.db')
  };
};
//# sourceMappingURL=client-factory.js.map
