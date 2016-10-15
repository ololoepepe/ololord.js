import Kue from 'kue';
import UUID from 'uuid';

import redisClient from '../storage/redis-client-factory';

let queue = Kue.createQueue({
  redis: {
    createClientFactory: () => {
      return redisClient(UUID.v4());
    }
  }
});

export default queue;
