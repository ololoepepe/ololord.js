import _ from 'underscore';

import CommonKey from './common-key';

export default class OrderedSet extends CommonKey {
  constructor(...args) {
    super(...args);
  }

  async getSome(lb, ub, subkey) {
    let data = await this.client.zrange(this.fullKey(subkey), lb, ub);
    return data.map(this.parse);
  }

  async getSomeByScore(lb, ub, subkey) {
    let data = await this.client.zrangebyscore(this.fullKey(subkey), lb, ub);
    return data.map(this.parse);
  }

  async getAll(subkey) {
    let data = await this.client.zrange(this.fullKey(subkey), 0, -1);
    return data.map(this.parse);
  }

  async addOne(data, score, subkey) {
    return await this.client.zadd(this.fullKey(subkey), score, this.stringify(data));
  }

  async addSome(list, subkey) {
    if (!list || !_(list).isArray() || list.length <= 0 || list.some((item) => { return typeof item !== 'object'; })) {
      return 0;
    }
    return await this.client.zadd.call(this.client, this.fullKey(subkey),
      ..._(list.map(item => [item.score, this.stringify(item.data)])).flatten());
  }

  async removeOne(data, subkey) {
    return await this.client.zrem(this.fullKey(subkey), this.stringify(data));
  }

  async removeSome(list, subkey) {
    if (!list || !_(list).isArray() || list.length <= 0) {
      return 0;
    }
    return await this.client.zrem.call(this.client, this.fullKey(subkey), ...list.map(this.stringify));
  }

  async count(subkey) {
    return await this.client.zcard(this.fullKey(subkey));
  }
}
