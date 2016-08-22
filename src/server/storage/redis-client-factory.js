import _ from 'underscore';
import Redis from 'ioredis';

import config from '../helpers/config';

let defaultClient = null;
let clients = new Map();

function createOptions() {
  return {
    host: config('system.redis.host'),
    port: config('system.redis.port'),
    family: config('system.redis.family'),
    password: config('system.redis.password'),
    db: config('system.redis.db')
  }
};

function createClient() {
  let redisNodes = config('system.redis.nodes');
  if (_.isArray(redisNodes) && redisNodes.length > 0) {
    return new Redis.Cluster(redisNodes, {
      clusterRetryStrategy: config('system.redis.clusterRetryStrategy', (times) => {
          return Math.min(100 + times * 2, 2000);
      }),
      enableReadyCheck: config('system.redis.enableReadyCheck'),
      scaleReads: config('system.redis.scaleReads'),
      maxRedirections: config('system.redis.maxRedirections'),
      retryDelayOnFailover: config('system.redis.retryDelayOnFailover'),
      retryDelayOnClusterDown: config('system.redis.retryDelayOnClusterDown'),
      retryDelayOnTryAgain: config('system.redis.retryDelayOnTryAgain'),
      redisOptions: createOptions()
    });
  } else {
    return new Redis(createOptions());
  }
}

export default function(id) {
  if (id && (typeof id === 'object' || typeof id === 'boolean')) {
    return createClient();
  }
  if (!id) {
    if (!defaultClient) {
      defaultClient = createClient();
    }
    return defaultClient;
  }
  let client = clients.get(id);
  if (!client) {
    client = createClient();
    clients.set(id, client);
  }
  return client;
}
