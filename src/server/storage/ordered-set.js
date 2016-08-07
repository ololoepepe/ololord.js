import _ from 'underscore';

import * as Tools from '../helpers/tools';

export default class OrderedSet {
  constructor(client, key, { parse, stringify } = {}) {
    this.client = client;
    this.key = key;
    this.parse = Tools.selectParser(parse);
    this.stringify = Tools.selectStringifier(stringify);
  }

  fullKey(subkey, separator) {
    return this.key + (subkey ? `${separator || ':'}${subkey}` : '');
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
    return await this.client.zadd(this.fullKey(subkey), this.stringify(data), score);
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

  async find(query, subkey) {
    query = (typeof query !== 'undefined') ? `:${query}` : ':*';
    return await this.client.keys(this.fullKey(subkey) + query);
  }

  async delete(subkey) {
    return await this.client.del(this.fullKey(subkey));
  }
}
