'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _log4js = require('log4js');

var _log4js2 = _interopRequireDefault(_log4js);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var appenders = [];
var logTargets = (0, _config2.default)('system.log.targets');

if (logTargets.indexOf('console') >= 0) {
  appenders.push({ type: 'console' });
}

if (logTargets.indexOf('console') >= 0) {
  appenders.push({
    type: 'file',
    filename: __dirname + '/../logs/ololord.log',
    maxLogSize: (0, _config2.default)('system.log.maxSize'),
    backups: (0, _config2.default)('system.log.backups')
  });
}

_log4js2.default.configure({ appenders: appenders });

exports.default = _log4js2.default.getLogger();
//# sourceMappingURL=logger.js.map
