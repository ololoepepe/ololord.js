'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _kue = require('kue');

var _kue2 = _interopRequireDefault(_kue);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var queue = kue.createQueue({
  redis: {
    createClientFactory: function createClientFactory() {
      return (0, _redisClientFactory2.default)('queue');
    }
  }
});

exports.default = queue;
//# sourceMappingURL=queue.js.map
