import _ from 'underscore';

import CommonKey from './common-key';

export default class UnorderedSet extends CommonKey {
  constructor(...args) {
    super(...args);
  }

  async getOne(subkey) {
    let data = await this.client.srandmember(this.fullKey(subkey));
    return this.parse(data);
  }

  async getAll(subkey) {
    let data = await this.client.smembers(this.fullKey(subkey));
    return data.map(this.parse);
  }

  async contains(data, subkey) {
    let contains = await this.client.sismember(this.fullKey(subkey), this.stringify(data));
    return !!contains;
  }

  async addOne(data, subkey) {
    return await this.client.sadd(this.fullKey(subkey), this.stringify(data));
  }

  async addSome(list, subkey) {
    if (!list || !_(list).isArray() || list.length <= 0) {
      return 0;
    }
    return await this.client.sadd.call(this.client, this.fullKey(subkey), ...list.map(this.stringify));
  }

  async deleteOne(data, subkey) {
    return await this.client.srem(this.fullKey(subkey), this.stringify(data));
  }

  async deleteSome(list, subkey) {
    if (!list || !_(list).isArray() || list.length <= 0) {
      return 0;
    }
    return await this.client.srem.call(this.client, this.fullKey(subkey), ...list.map(this.stringify));
  }

  async count(subkey) {
    return await this.client.scard(this.fullKey(subkey));
  }
}
