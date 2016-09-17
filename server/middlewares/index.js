'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _dddos = require('dddos');

var _dddos2 = _interopRequireDefault(_dddos);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _hashpass = require('./hashpass');

var _hashpass2 = _interopRequireDefault(_hashpass);

var _ipFix = require('./ip-fix');

var _ipFix2 = _interopRequireDefault(_ipFix);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _onlineCounter = require('./online-counter');

var _onlineCounter2 = _interopRequireDefault(_onlineCounter);

var _registeredUser = require('./registered-user');

var _registeredUser2 = _interopRequireDefault(_registeredUser);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BEFORE = (0, _config2.default)('system.log.middleware.before');
var middlewares = [];

function setupDdos() {
  if ('ddos' === BEFORE) {
    middlewares.push(_log2.default);
  }
  if (!(0, _config2.default)('server.ddosProtection.enabled')) {
    return;
  }
  middlewares.push(new _dddos2.default({
    errorData: (0, _config2.default)('server.ddosProtection.errorData'),
    errorCode: (0, _config2.default)('server.ddosProtection.errorCode'),
    weight: (0, _config2.default)('server.ddosProtection.weight'),
    maxWeight: (0, _config2.default)('server.ddosProtection.maxWeight'),
    checkInterval: (0, _config2.default)('server.ddosProtection.checkInterval'),
    rules: (0, _config2.default)('server.ddosProtection.rules'),
    logFunction: function logFunction() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _logger2.default.error.apply(_logger2.default, [_logger2.default, Tools.translate('DDoS detected:')].concat(args));
    }
  }).express());
}

function setupStatic() {
  if ('static' === BEFORE) {
    middlewares.push(_log2.default);
  }
  middlewares.push(_express2.default.static(__dirname + '/../../public'));
}

if ('all' === BEFORE) {
  middlewares.push(_log2.default);
}

middlewares.push(_ipFix2.default);

middlewares.push(_onlineCounter2.default);

if ((0, _config2.default)('server.ddosProtection.static')) {
  setupDdos();
  setupStatic();
} else {
  setupStatic();
  setupDdos();
}

if ('middleware' === BEFORE) {
  middlewares.push(_log2.default);
}

middlewares.push((0, _cookieParser2.default)());

middlewares.push(_hashpass2.default);

middlewares.push(_registeredUser2.default);

if ('request' === BEFORE) {
  middlewares.push(_log2.default);
}

exports.default = middlewares;
//# sourceMappingURL=index.js.map
