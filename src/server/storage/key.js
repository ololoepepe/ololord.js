import _ from 'underscore';

import * as Tools from '../helpers/tools';

export default class Key {
  constructor(client, key, { parse, stringify } = {}) {
    this.client = client;
    this.key = key;
    this.parse = Tools.selectParser(parse);
    this.stringify = Tools.selectStringifier(stringify);
  }

  fullKey(subkey, separator) {
    return this.key + (subkey ? `${separator || ':'}${subkey}` : '');
  }

  async get(subkey) {
    let data = await this.client.get(this.fullKey(subkey));
    return this.parse(data);
  }

  async set(data, subkey) {
    return await this.client.set(this.fullKey(subkey), this.stringify(data));
  }

  async delete() {
    return await this.client.del(this.fullKey(subkey));
  }

  async find(query, subkey) {
    query = (typeof query !== 'undefined') ? `:${query}` : ':*';
    return await this.client.keys(this.fullKey(subkey) + query);
  }
}
