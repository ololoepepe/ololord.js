import _ from 'underscore';
import DDDoS from 'dddos';
import SockJS from 'sockjs';

import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as OnlineCounter from '../helpers/online-counter';
import * as Tools from '../helpers/tools';

const SOCKJS_URL = '//cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js';

function sendMessage(type, data) {
  if (!this) {
    return;
  }
  this.write(JSON.stringify({
    type: type,
    data: data
  }));
}

function createSockJSServer() {
  return SockJS.createServer({
    sockjs_url: SOCKJS_URL,
    log: (severity, message) => {
      switch (severity) {
      case 'error':
        Logger.error(message);
        break;
      case 'debug':
      case 'info':
      default:
        break;
      }
    }
  });
}

function getTrueIP(conn) {
  let trueIp = Tools.correctAddress(conn.remoteAddress);
  if (!trueIp) {
    return;
  }
  if (config('system.detectRealIp')) {
    let ip = conn.headers['x-forwarded-for'];
    if (!ip) {
      ip = conn.headers['x-client-ip'];
    }
    if (ip) {
      return Tools.correctAddress(ip);
    }
  }
  if (config('system.useXRealIp')) {
    return Tools.correctAddress(conn.headers['x-real-ip']);
  }
  return trueIp;
}

export default class WebSocketServer {
  constructor(server) {
    if (config('server.ddosProtection.enabled')) {
      this.ddosProtection = new DDDoS({
        maxWeight: config('server.ddosProtection.ws.maxMessageRate'),
        logFunction: (ip, _1, weight, maxWeight) => {
          Logger.error(Tools.translate('DDoS detected (too many WebSocket requests):'),
            Tools.preferIPv4(ip), weight, maxWeight);
        }
      });
    }
    this.connectionLimit = config('server.ddosProtection.ws.connectionLimit');
    this.maxMessageLength = config('server.ddosProtection.ws.maxMessageLength');
    this.server = server;
    this.wsserver = createSockJSServer();
    this.connectionCount = new Map();
    this.connectionsIP = new Map();
    this.connectionsHashpass = new Map();
    this.handlers = new Map();
    this.wsserver.on('connection', this._handleConnection.bind(this));
    this.wsserver.installHandlers(this.server, { prefix: '/ws' });
  }

  _handleConnection(conn) {
    let trueIp = getTrueIP(conn);
    if (!trueIp) {
      return conn.end();
    }
    conn.ip = trueIp;
    OnlineCounter.alive(conn.ip);
    //TODO: log
    if (this.ddosProtection) {
      let count = (this.connectionCount.get(conn.ip) || 0) + 1;
      if (count > this.connectionLimit) {
        Logger.error(Tools.translate('DDoS detected (too many WebSocket connections):'),
          Tools.preferIPv4(conn.ip), count, this.connectionLimit);
        return conn.end();
      }
      this.connectionCount.set(conn.ip, count);
    }
    conn.ws = this;
    conn.sendMessage = sendMessage;
    conn.on('data', (message) => {
      if (this.ddosProtection) {
        this.ddosProtection.request(conn.ip, '', () => {
          conn.end();
        }, () => {
          this._handleMessage(conn, message);
        });
      } else {
        this._handleMessage(conn, message);
      }
    });
    conn.on('close', this._handleClose.bind(this, conn));
  }

  _handleMessage(conn, message) {
    OnlineCounter.alive(conn.ip);
    //TODO: log
    if (this.ddosProtection && message.length > this.maxMessageLength) {
      Logger.error(Tools.translate('DDoS detected (too long WebSocket message):'),
        Tools.preferIPv4(conn.ip), message.length, this.maxMessageLength);
      return conn.end();
    }
    try {
      message = JSON.parse(message);
    } catch (err) {
      Logger.error('Failed to parse WebSocket message:', Tools.preferIPv4(conn.ip));
      message = {};
    }
    switch (message.type) {
    case 'init':
      this._handleInitMessage(conn, message);
      break;
    default:
      this._handleOtherMessage(conn, message);
      break;
    }
  }

  async _handleOtherMessage(conn, message) {
    let handler = this.handlers.get(message.type);
    if (!handler) {
      Logger.error(Tools.translate('Unknown WebSocket message type:'), Tools.preferIPv4(conn.ip), message.type);
      return;
    }
    try {
      let data = await handler(message, conn);
      conn.write(JSON.stringify({
        id: message.id,
        type: message.type,
        data: data
      }));
    } catch (err) {
      Logger.error('WebSocket:', Tools.preferIPv4(conn.ip), message.type, err.stack || err);
      try {
        conn.write(JSON.stringify({
          id: message.id,
          type: message.type,
          error: error
        }));
      } catch (err) {
        //Do nothing
      }
    }
  }

  _handleInitMessage(conn, message) {
    if (this.connectionsIP.has(conn.ip)) {
      this.connectionsIP.get(conn.ip).add(conn);
    } else {
      this.connectionsIP.set(conn.ip, new Set([conn]));
    }
    if (message.data && message.data.hashpass) {
      conn.hashpass = message.data.hashpass;
      if (this.connectionsHashpass.has(conn.hashpass)) {
        this.connectionsHashpass.get(conn.hashpass).add(conn);
      } else {
        this.connectionsHashpass.set(conn.hashpass, new Set([conn]));
      }
    }
    conn.sendMessage(message.type);
  }

  _handleClose(conn) {
    if (this.ddosProtection) {
      let count = this.connectionCount.get(conn.ip);
      this.connectionCount.set(conn.ip, count - 1);
    }
    if (this.connectionsIP.has(conn.ip)) {
      let set = this.connectionsIP.get(conn.ip);
      set.delete(conn);
      if (set.size <= 0) {
        this.connectionsIP.delete(conn.ip);
      }
    }
    if (conn.hashpass && this.connectionsHashpass.has(conn.hashpass)) {
      let set = this.connectionsHashpass.get(conn.hashpass);
      set.delete(conn);
      if (set.size <= 0) {
        this.connectionsHashpass.delete(conn.hashpass);
      }
    }
  }

  on(type, handler) {
    this.handlers.set(type, handler);
    return this;
  }

  sendMessage(type, data, ips, hashpasses) {
    if (!type) {
      return;
    }
    if (!_(ips).isArray()) {
      ips = [ips];
    }
    if (!_(hashpasses).isArray()) {
      hashpasses = [hashpasses];
    }
    let message = JSON.stringify({
      type: type,
      data: data
    });
    ips.filter(ip => !!ip).forEach((ip) => {
      (this.connectionsIP[ip] || []).forEach((conn) => { conn.write(message); });
    });
    hashpasses.filter(hashpass => !!hashpass).forEach((hashpass) => {
      (this.connectionsHashpass[hashpass] || []).forEach((conn) => { conn.write(message); });
    });
  }
}
