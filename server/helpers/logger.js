'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _winstonDailyRotateFile = require('winston-daily-rotate-file');

var _winstonDailyRotateFile2 = _interopRequireDefault(_winstonDailyRotateFile);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var TRANSPORT_MAP = {
  'console': {
    ctor: _winston2.default.transports.Console,
    args: [{
      timestamp: true,
      colorize: true
    }]
  },
  'file': {
    ctor: _winstonDailyRotateFile2.default,
    args: [{
      filename: __dirname + '/../../logs/ololord.log',
      maxsize: (0, _config2.default)('system.log.maxSize'),
      maxFiles: (0, _config2.default)('system.log.maxFiles')
    }]
  }
};

var transports = (0, _config2.default)('system.log.transports').map(function (name) {
  return TRANSPORT_MAP[name];
}).filter(function (transport) {
  return !!transport;
});

if (transports.length <= 0) {
  transports = (0, _underscore2.default)(TRANSPORT_MAP).toArray();
}

transports = transports.map(function (transport) {
  return new (Function.prototype.bind.apply(transport.ctor, [null].concat(_toConsumableArray(transport.args))))();
});

var Logger = new _winston2.default.Logger({ transports: transports });

exports.default = Logger;
//# sourceMappingURL=logger.js.map
