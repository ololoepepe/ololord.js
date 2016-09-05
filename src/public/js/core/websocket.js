import _ from 'underscore';
import { EventEmitter } from 'events';
import SockJS from 'sockjs-client';
import UUID from 'uuid';

import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Tools from '../helpers/tools';

class WebSocketWrapper extends EventEmitter {
  constructor() {
    super();
  }

  async open(url) {
    if (this.ws) {
      return;
    }
    this.ws = new SockJS(url || `/${Tools.sitePathPrefix()}ws`);
    this.ws.onopen = () => {
      this.emit('open');
    };
    this.ws.onclose = () => {
      delete this.ws;
      this.emit('close');
    };
    this.ws.onmessage = (message) => {
      try {
        message = JSON.parse(message.data);
      } catch (err) {
        console.log(Tools.translate('Error parsing WebSocket message:'), err);
      }
      this.emit('message', message);
    };
    return new Promise((resolve, reject) => {
      this.on('open', resolve).on('close', reject);
    });
  }

  async close() {
    if (!this.ws) {
      return;
    }
    let promise = new Promise((resolve) => {
      this.on('close', resolve);
    });
    this.ws.close();
    return promise;
  }

  send(o) {
    if (!this.ws) {
      return;
    }
    this.ws.send(JSON.stringify(o));
  }
}

const MESSAGE_TIMEOUT = 5 * Constants.SECOND;
const CONNECTION_RETRY_DELAY_MIN = 1 * Constants.SECOND;
const CONNECTION_RETRY_DELAY_MAX = 30 * Constants.SECOND;

let ws = new WebSocketWrapper();
let initialized = false;
let readyTimeout = null;
let ready = false;
let connectionRetryCount = 0;
let queue = [];
let messages = {};
let currentMessage = null;
let handlers = {};

Settings.useWebSockets.subscribe((value) => {
  if (!initialized) {
    return;
  }
  ws[value ? 'open' : 'close']();
});

function checkQueue() {
  if (!ready || queue.length < 1) {
    return;
  }
  let message = queue.shift();
  messages[message.id] = message;
  currentMessage = message;
  ws.send({
    id: message.id,
    type: message.type,
    data: message.data
  });
}

function handleMessage(message) {
  let msg = messages[message.id];
  if (msg) {
    delete messages[message.id];
    if (!message.error) {
      msg.resolve(message.data);
    } else {
      msg.reject(message.error);
    }
    checkQueue();
  } else {
    if ('_error' === message.id) {
      DOM.handleError(message.error);
    } else {
      (handlers[message.type] || []).filter(Tools.testFilter).sort(Tools.priorityPredicate).forEach((h) => {
        h.handler(message);
      });
    }
  }
}

ws.on('open', () => {
  ws.send({
    type: 'init',
    data: { hashpass: Storage.hashpass() }
  });
  readyTimeout = setTimeout(() => {
    clearTimeout(readyTimeout);
    readyTimeout = null;
    ws.close();
  }, MESSAGE_TIMEOUT);
});

ws.on('message', (message) => {
  if ('init' === message.type) {
    if (readyTimeout) {
      clearTimeout(readyTimeout);
      readyTimeout = null;
    }
    connectionRetryCount = 0;
    ready = true;
    checkQueue();
  } else {
    handleMessage(message);
  }
});

ws.on('close', () => {
  ready = false;
  if (currentMessage) {
    currentMessage.reject(Tools.translate('WebSocket connection closed'));
    delete messages[currentMessage.id];
    currentMessage = null;
  }
  if (Settings.useWebSockets()) {
    ++connectionRetryCount;
    setTimeout(() => {
      ws.open();
    }, Math.min(CONNECTION_RETRY_DELAY_MIN * Math.pow(2, connectionRetryCount), CONNECTION_RETRY_DELAY_MAX));
  }
});

export let registerHandler = Tools.createRegisterFunction(handlers, 'handler');

export async function sendMessage(type, data) {
  if (!Settings.useWebSockets()) {
    return Promise.reject(Tools.translate('WebSocket communication is disabled'));
  }
  let promise = new Promise((resolve, reject) => {
    let id = UUID.v4();
    queue.push({
      id: id,
      type: type,
      data: data,
      resolve: resolve,
      reject: reject
    });
    setTimeout(() => {
      let index = _(queue).findIndex((message) => { return id === message.id; });
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }, MESSAGE_TIMEOUT);
  });
  if (ready) {
    checkQueue();
  }
  return promise;
}

export function initialize() {
  if (initialized) {
    return;
  }
  if (Settings.useWebSockets()) {
    ws.open();
  }
  initialized = true;
}
