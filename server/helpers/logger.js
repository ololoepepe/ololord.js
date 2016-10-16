'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _winstonDailyRotateFile = require('winston-daily-rotate-file');

var _winstonDailyRotateFile2 = _interopRequireDefault(_winstonDailyRotateFile);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _ipc = require('./ipc');

var IPC = _interopRequireWildcard(_ipc);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CODE = /\u001b\[(\d+(;\d+)*)?m/g;

var WinstonClusterTransport = function (_Winston$Transport) {
  _inherits(WinstonClusterTransport, _Winston$Transport);

  function WinstonClusterTransport() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, WinstonClusterTransport);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(WinstonClusterTransport).call(this, options));

    _this.name = 'cluster';
    return _this;
  }

  _createClass(WinstonClusterTransport, [{
    key: 'log',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(level, msg, meta, callback) {
        var message;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this.silent) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return', callback(null, true));

              case 2:
                if (this.stripColors) {
                  msg = ('' + msg).replace(code, '');
                }
                message = {
                  cmd: 'log',
                  worker: _cluster2.default.worker.id || null,
                  pid: process.pid,
                  level: level,
                  msg: msg,
                  meta: meta
                };
                _context.prev = 4;
                _context.next = 7;
                return IPC.send('log', message);

              case 7:
                _context.next = 13;
                break;

              case 9:
                _context.prev = 9;
                _context.t0 = _context['catch'](4);

                console.error(_context.t0.stack || _context.t0);
                return _context.abrupt('return', callback(_context.t0));

              case 13:
                this.emit('logged');
                callback(null, true);
                return _context.abrupt('return', message);

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[4, 9]]);
      }));

      function log(_x2, _x3, _x4, _x5) {
        return ref.apply(this, arguments);
      }

      return log;
    }()
  }, {
    key: '_write',
    value: function _write(data, callback) {}
  }, {
    key: 'query',
    value: function query(options, callback) {}
  }, {
    key: 'stream',
    value: function stream(options) {}
  }, {
    key: 'open',
    value: function open(callback) {
      callback();
    }
  }, {
    key: 'close',
    value: function close() {}
  }, {
    key: 'flush',
    value: function flush() {}
  }]);

  return WinstonClusterTransport;
}(_winston2.default.Transport);

_winston2.default.transports.Cluster = WinstonClusterTransport;

var TRANSPORT_MAP = {
  'console': {
    ctor: _winston2.default.transports.Console,
    opts: {
      timestamp: true,
      colorize: true
    }
  },
  'file': {
    ctor: _winstonDailyRotateFile2.default,
    opts: {
      filename: __dirname + '/../../logs/ololord.log',
      maxsize: (0, _config2.default)('system.log.maxSize'),
      maxFiles: (0, _config2.default)('system.log.maxFiles')
    }
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

var Logger = void 0;

if (_cluster2.default.isMaster) {
  Logger = new _winston2.default.Logger({ transports: transports.map(function (_ref) {
      var ctor = _ref.ctor;
      var opts = _ref.opts;
      return new ctor(opts);
    }) });
} else {
  Logger = new _winston2.default.Logger({ transports: [new WinstonClusterTransport()] });
}

function handleMessage(msg) {}

Logger.initialize = function (serverType) {
  if (_cluster2.default.isMaster) {
    IPC.on('log', function (msg) {
      msg.meta.server = serverType;
      msg.meta.pid = msg.pid;
      msg.meta.worker = msg.worker;
      Logger.log(msg.level, msg.msg, msg.meta);
    });
  }
};

exports.default = Logger;
//# sourceMappingURL=logger.js.map
