import Kue from 'kue';

import redisClient from '../storage/redis-client-factory';

let queue = kue.createQueue({
  redis: {
    createClientFactory: () => {
      return redisClient('queue');
    }
  }
});

export default queue;
