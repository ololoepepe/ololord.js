import _ from 'underscore';
import Winston from 'winston';
import WinstonDailyRotateFileTransport from 'winston-daily-rotate-file';

import config from './config';

const TRANSPORT_MAP = {
  'console': {
    ctor: Winston.transports.Console,
    args: [{
      timestamp: true,
      colorize: true
    }]
  },
  'file': {
    ctor: WinstonDailyRotateFileTransport,
    args: [{
      filename: `${__dirname}/../../logs/ololord.log`,
      maxsize: config('system.log.maxSize'),
      maxFiles: config('system.log.maxFiles')
    }]
  }
};

let transports = config('system.log.transports').map((name) => {
  return TRANSPORT_MAP[name];
}).filter(transport => !!transport);

if (transports.length <= 0) {
  transports = _(TRANSPORT_MAP).toArray();
}

transports = transports.map(transport => new transport.ctor(...transport.args));

let Logger = new Winston.Logger({ transports: transports });

export default Logger;
