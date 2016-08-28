'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _dddos = require('dddos');

var _dddos2 = _interopRequireDefault(_dddos);

var _sockjs = require('sockjs');

var _sockjs2 = _interopRequireDefault(_sockjs);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _onlineCounter = require('../helpers/online-counter');

var OnlineCounter = _interopRequireWildcard(_onlineCounter);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SOCKJS_URL = '//cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js';

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
  return _sockjs2.default.createServer({
    sockjs_url: SOCKJS_URL,
    log: function log(severity, message) {
      switch (severity) {
        case 'error':
          _logger2.default.error(message);
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
  var trueIp = Tools.correctAddress(conn.remoteAddress);
  if (!trueIp) {
    return;
  }
  if ((0, _config2.default)('system.detectRealIp')) {
    var ip = conn.headers['x-forwarded-for'];
    if (!ip) {
      ip = conn.headers['x-client-ip'];
    }
    if (ip) {
      return Tools.correctAddress(ip);
    }
  }
  if ((0, _config2.default)('system.useXRealIp')) {
    return Tools.correctAddress(conn.headers['x-real-ip']);
  }
  return trueIp;
}

var WebSocketServer = function () {
  function WebSocketServer(server) {
    _classCallCheck(this, WebSocketServer);

    if ((0, _config2.default)('server.ddosProtection.enabled')) {
      this.ddosProtection = new _dddos2.default({
        maxWeight: (0, _config2.default)('server.ddosProtection.ws.maxMessageRate'),
        logFunction: function logFunction(ip, _1, weight, maxWeight) {
          _logger2.default.error(Tools.translate('DDoS detected (too many WebSocket requests):'), Tools.preferIPv4(ip), weight, maxWeight);
        }
      });
    }
    this.connectionLimit = (0, _config2.default)('server.ddosProtection.ws.connectionLimit');
    this.maxMessageLength = (0, _config2.default)('server.ddosProtection.ws.maxMessageLength');
    this.server = server;
    this.wsserver = createSockJSServer();
    this.connectionCount = new Map();
    this.connectionsIP = new Map();
    this.connectionsHashpass = new Map();
    this.handlers = new Map();
    this.wsserver.on('connection', this._handleConnection.bind(this));
    this.wsserver.installHandlers(this.server, { prefix: '/ws' });
  }

  _createClass(WebSocketServer, [{
    key: '_handleConnection',
    value: function _handleConnection(conn) {
      var _this = this;

      var trueIp = getTrueIP(conn);
      if (!trueIp) {
        return conn.end();
      }
      conn.ip = trueIp;
      OnlineCounter.alive(conn.ip);
      //TODO: log
      if (this.ddosProtection) {
        var count = (this.connectionCount.get(conn.ip) || 0) + 1;
        if (count > this.connectionLimit) {
          _logger2.default.error(Tools.translate('DDoS detected (too many WebSocket connections):'), Tools.preferIPv4(conn.ip), count, this.connectionLimit);
          return conn.end();
        }
        this.connectionCount.set(conn.ip, count);
      }
      conn.ws = this;
      conn.sendMessage = sendMessage;
      conn.on('data', function (message) {
        if (_this.ddosProtection) {
          _this.ddosProtection.request(conn.ip, '', function () {
            conn.end();
          }, function () {
            _this._handleMessage(conn, message);
          });
        } else {
          _this._handleMessage(conn, message);
        }
      });
      conn.on('close', this._handleClose.bind(this, conn));
    }
  }, {
    key: '_handleMessage',
    value: function _handleMessage(conn, message) {
      OnlineCounter.alive(conn.ip);
      //TODO: log
      if (this.ddosProtection && message.length > this.maxMessageLength) {
        _logger2.default.error(Tools.translate('DDoS detected (too long WebSocket message):'), Tools.preferIPv4(conn.ip), message.length, this.maxMessageLength);
        return conn.end();
      }
      try {
        message = JSON.parse(message);
      } catch (err) {
        _logger2.default.error('Failed to parse WebSocket message:', Tools.preferIPv4(conn.ip));
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
  }, {
    key: '_handleOtherMessage',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(conn, message) {
        var handler, data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                handler = this.handlers.get(message.type);

                if (handler) {
                  _context.next = 4;
                  break;
                }

                _logger2.default.error(Tools.translate('Unknown WebSocket message type:'), Tools.preferIPv4(conn.ip), message.type);
                return _context.abrupt('return');

              case 4:
                _context.prev = 4;
                _context.next = 7;
                return handler(message, conn);

              case 7:
                data = _context.sent;

                conn.write(JSON.stringify({
                  id: message.id,
                  type: message.type,
                  data: data
                }));
                _context.next = 15;
                break;

              case 11:
                _context.prev = 11;
                _context.t0 = _context['catch'](4);

                _logger2.default.error('WebSocket:', Tools.preferIPv4(conn.ip), message.type, _context.t0.stack || _context.t0);
                try {
                  conn.write(JSON.stringify({
                    id: message.id,
                    type: message.type,
                    error: error
                  }));
                } catch (err) {
                  //Do nothing
                }

              case 15:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[4, 11]]);
      }));

      function _handleOtherMessage(_x, _x2) {
        return ref.apply(this, arguments);
      }

      return _handleOtherMessage;
    }()
  }, {
    key: '_handleInitMessage',
    value: function _handleInitMessage(conn, message) {
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
  }, {
    key: '_handleClose',
    value: function _handleClose(conn) {
      if (this.ddosProtection) {
        var count = this.connectionCount.get(conn.ip);
        this.connectionCount.set(conn.ip, count - 1);
      }
      if (this.connectionsIP.has(conn.ip)) {
        var set = this.connectionsIP.get(conn.ip);
        set.delete(conn);
        if (set.size <= 0) {
          this.connectionsIP.delete(conn.ip);
        }
      }
      if (conn.hashpass && this.connectionsHashpass.has(conn.hashpass)) {
        var _set = this.connectionsHashpass.get(conn.hashpass);
        _set.delete(conn);
        if (_set.size <= 0) {
          this.connectionsHashpass.delete(conn.hashpass);
        }
      }
    }
  }, {
    key: 'on',
    value: function on(type, handler) {
      this.handlers.set(type, handler);
      return this;
    }
  }, {
    key: 'sendMessage',
    value: function sendMessage(type, data, ips, hashpasses) {
      var _this2 = this;

      if (!type) {
        return;
      }
      if (!(0, _underscore2.default)(ips).isArray()) {
        ips = [ips];
      }
      if (!(0, _underscore2.default)(hashpasses).isArray()) {
        hashpasses = [hashpasses];
      }
      var message = JSON.stringify({
        type: type,
        data: data
      });
      ips.filter(function (ip) {
        return !!ip;
      }).forEach(function (ip) {
        (_this2.connectionsIP.get(ip) || []).forEach(function (conn) {
          conn.write(message);
        });
      });
      hashpasses.filter(function (hashpass) {
        return !!hashpass;
      }).forEach(function (hashpass) {
        (_this2.connectionsHashpass.get(hashpass) || []).forEach(function (conn) {
          conn.write(message);
        });
      });
    }
  }]);

  return WebSocketServer;
}();

exports.default = WebSocketServer;
//# sourceMappingURL=websocket-server.js.map
