import Log4JS from 'log4js';

import config from './config';

let appenders = [];
let logTargets = config('system.log.targets');

if (logTargets.indexOf('console') >= 0) {
  appenders.push({ type: 'console' });
}

if (logTargets.indexOf('console') >= 0) {
  appenders.push({
    type: 'file',
    filename: `${__dirname}/../logs/ololord.log`,
    maxLogSize: config('system.log.maxSize'),
    backups: config('system.log.backups')
  });
}

Log4JS.configure({ appenders: appenders });

export default Log4JS.getLogger();
