import _ from 'underscore';

import CommonKey from './common-key';

export default class Key extends CommonKey {
  constructor(...args) {
    super(...args);
  }

  async get(subkey) {
    let data = await this.client.get(this.fullKey(subkey));
    return this.parse(data);
  }

  async set(data, subkey) {
    return await this.client.set(this.fullKey(subkey), this.stringify(data));
  }
}
