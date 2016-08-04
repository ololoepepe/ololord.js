import _ from 'underscore';

import * as Tools from '../helpers/tools';

export default class UnorderedSet {
  constructor(client, key, { parse, stringify } = {}) {
    this.client = client;
    this.key = key;
    this.parse = Tools.selectParser(parse);
    this.stringify = Tools.selectStringifier(stringify);
  }

  fullKey(subkey, separator) {
    return this.key + (subkey ? `${separator || ':'}${subkey}` : '');
  }

  async getOne(subkey) {
    let data = await this.client.srandmember(this.fullKey(subkey));
    return this.parse(data);
  }

  async getAll(subkey) {
    let data = await this.client.smembers(this.fullKey(subkey));
    return data.map(this.parse);
  }

  async exists(subkey) {
    let exists = await this.client.exists(this.fullKey(subkey));
    return !!exists;
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

  async removeOne(data, subkey) {
    return await this.client.srem(this.fullKey(subkey), this.stringify(data));
  }

  async removeSome(list, subkey) {
    if (!list || !_(list).isArray() || list.length <= 0) {
      return 0;
    }
    return await this.client.srem.call(this.client, this.fullKey(subkey), ...list.map(this.stringify));
  }

  async count(subkey) {
    return await this.client.scard(this.fullKey(subkey));
  }

  async find(query, subkey) {
    query = (typeof query !== 'undefined') ? `:${query}` : ':*';
    return await this.client.keys(this.fullKey(subkey) + query);
  }
}
