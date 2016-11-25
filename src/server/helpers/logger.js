import _ from 'underscore';
import Cluster from 'cluster';
import Path from 'path';
import Winston from 'winston';
import WinstonDailyRotateFileTransport from 'winston-daily-rotate-file';

import config from './config';
import * as IPC from './ipc';

const CODE = /\u001b\[(\d+(;\d+)*)?m/g;

class WinstonClusterTransport extends Winston.Transport {
  constructor(options = {}) {
    super(options);
    this.name = 'cluster';
  }

  async log(level, msg, meta, callback) {
    if (this.silent) {
      return callback(null, true);
    }
    if (this.stripColors) {
      msg = ('' + msg).replace(code, '');
    }
    let message = {
      cmd: 'log',
      worker: Cluster.worker.id || null,
      pid: process.pid,
      level: level,
      msg: msg,
      meta: meta
    };
    try {
      await IPC.send('log', message);
    } catch (err) {
      console.error(err.stack || err);
      return callback(err);
    }
    this.emit('logged');
    callback(null, true);
    return message;
  }

  _write(data, callback) { }

  query(options, callback) { }

  stream(options) { }

  open(callback) {
    callback();
  }

  close() { }

  flush() { }
}

Winston.transports.Cluster = WinstonClusterTransport;

const MAIN_FILE_NAME = Path.basename(require.main.filename, '.js');
const TRANSPORT_MAP = {
  'console': {
    ctor: Winston.transports.Console,
    opts: {
      timestamp: true,
      colorize: true
    }
  },
  'file': {
    ctor: WinstonDailyRotateFileTransport,
    opts: {
      filename: `${__dirname}/../../logs/${MAIN_FILE_NAME}/${MAIN_FILE_NAME}.log`,
      maxsize: config('system.log.maxSize'),
      maxFiles: config('system.log.maxFiles')
    }
  }
};

let transports = config('system.log.transports').map((name) => {
  return TRANSPORT_MAP[name];
}).filter(transport => !!transport);

if (transports.length <= 0) {
  transports = _(TRANSPORT_MAP).toArray();
}

let Logger;

if (Cluster.isMaster) {
  Logger = new Winston.Logger({ transports: transports.map(({ ctor, opts }) => new ctor(opts)) });
} else {
  Logger = new Winston.Logger({ transports: [new WinstonClusterTransport()] });
}

function handleMessage(msg) {

}

Logger.initialize = (serverType) => {
  if (Cluster.isMaster) {
    IPC.on('log', (msg) => {
      msg.meta.server = serverType;
      msg.meta.pid = msg.pid;
      msg.meta.worker = msg.worker;
      Logger.log(msg.level, msg.msg, msg.meta);
    });
  }
}

export default Logger;
