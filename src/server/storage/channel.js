import CommonKey from './common-key';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

export default class Channel {
  constructor(client, name, { parse, stringify } = {}) {
    this.client = client;
    this.name = name;
    this.parse = CommonKey.selectParser(parse);
    this.stringify = CommonKey.selectStringifier(stringify);
    this.handlers = [];
    this.client.on('message', this._handleMessage.bind(this));
  }

  async publish(data) {
    return await this.client.publish(this.name, this.stringify(data));
  }

  async subscribe(handler) {
    let shouldSubscribe = (this.handlers.length <= 0);
    if (typeof handler !== 'function') {
      return;
    }
    this.handlers.push(handler);
    if (shouldSubscribe) {
      return await this.client.subscribe(this.name);
    }
  }

  async unsubscribe(handler) {
    if (typeof handler === 'undefined') {
      this.handlers = [];
    } else if (typeof handler === 'function') {
      let index = this.handlers.indexOf(handler);
      if (index < 0) {
        return;
      }
      this.handlers.splice(index, 1);
    }
    if (this.handlers.length <= 0) {
      return await this.client.unsubscribe(this.name);
    }
  }

  async _handleMessage(channel, message) {
    if (channel !== this.name) {
      return;
    }
    message = this.parse(message);
    try {
      await Tools.series(this.handlers, async function(handler) {
        await handler(message);
      });
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }
}
