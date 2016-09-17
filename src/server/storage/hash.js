import _ from 'underscore';

import CommonKey from './common-key';

export default class Hash extends CommonKey {
  constructor(...args) {
    super(...args);
  }

  async getOne(id, subkey) {
    let data = await this.client.hget(this.fullKey(subkey), id);
    return this.parse(data);
  }

  async getSome(ids, subkey) {
    if (!_(ids).isArray() || ids.length <= 0) {
      return [];
    }
    let data = await this.client.hmget.call(this.client, this.fullKey(subkey), ...ids);
    return data.map(this.parse);
  }

  async getAll(subkey) {
    let data = await this.client.hgetall(this.fullKey(subkey));
    return _(data).mapObject(this.parse);
  }

  async existsOne(id, subkey) {
    let exists = await this.client.hexists(this.fullKey(subkey), id);
    return !!exists;
  }

  async setOne(id, data, subkey) {
    return await this.client.hset(this.fullKey(subkey), id, this.stringify(data));
  }

  async setSome(items, subkey) {
    if (typeof items !== 'object') {
      return 0;
    }
    if (!_(items).isArray()) {
      items = _(items).map((value, key) => { return [key, value]; });
      items = _(items).flatten();
    }
    if (items.length <= 0) {
      return 0;
    }
    return await this.client.hmset.call(this.client, this.fullKey(subkey), ...items.map((item, index) => {
      return (index % 2) ? this.stringify(item) : item;
    }));
  }

  async incrementBy(id, n, subkey) {
    return await this.client.hincrby(this.fullKey(subkey), id, n);
  }

  async deleteOne(id, subkey) {
    return await this.client.hdel(this.fullKey(subkey), id);
  }

  async deleteSome(ids, subkey) {
    if (!_(ids).isArray()) {
      ids = [ids];
    }
    if (ids.length <= 0) {
      return 0;
    }
    return await this.client.hdel(this.fullKey(subkey), ...ids);
  }

  async keys(subkey) {
    return await this.client.hkeys(this.fullKey(subkey));
  }

  async count(subkey) {
    return await this.client.hlen(this.fullKey(subkey));
  }
}
