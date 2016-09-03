'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (req, res, next) {
  var trueIp = Tools.correctAddress(req.ip || req.connection.remoteAddress);
  if (!trueIp) {
    return res.sendStatus(500);
  }
  if ((0, _config2.default)('system.detectRealIp')) {
    var ip = req.headers['x-forwarded-for'];
    if (!ip) {
      ip = req.headers['x-client-ip'];
    }
    if (ip) {
      var address = Tools.correctAddress(ip);
      if (!address) {
        return res.sendStatus(500);
      }
      trueIp = address;
    }
  }
  if ((0, _config2.default)('system.useXRealIp', false)) {
    var _ip = req.headers['x-real-ip'];
    var _address = Tools.correctAddress(_ip);
    if (!_address) {
      return res.sendStatus(500);
    }
    trueIp = _address;
  }
  Object.defineProperty(req, 'ip', { value: trueIp });
  next();
};

var _ipAddress = require('ip-address');

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
//# sourceMappingURL=ip-fix.js.map
