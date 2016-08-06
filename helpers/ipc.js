'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var handleMessage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(message, workerID) {
    var task, handler, proc, data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            task = tasks[message.id];

            if (!task) {
              _context.next = 6;
              break;
            }

            delete tasks[message.id];
            if (!message.error) {
              task.resolve(message.data);
            } else {
              task.reject(message.error);
            }
            _context.next = 19;
            break;

          case 6:
            handler = handlers[message.type];
            proc = workerID ? _cluster2.default.workers[workerID] : process;

            if (typeof handler !== 'function') {
              proc.send({
                id: message.id,
                type: message.type,
                error: Tools.translate('Method not found: $[1]', '', message.type)
              });
            }
            _context.prev = 9;
            _context.next = 12;
            return handler(message.data);

          case 12:
            data = _context.sent;

            proc.send({
              id: message.id,
              type: message.type,
              data: data || null
            });
            _context.next = 19;
            break;

          case 16:
            _context.prev = 16;
            _context.t0 = _context['catch'](9);

            proc.send({
              id: message.id,
              type: message.type,
              error: _context.t0
            });

          case 19:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[9, 16]]);
  }));

  return function handleMessage(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

exports.send = send;
exports.on = on;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _logger = require('./logger');

var Logger = _interopRequireWildcard(_logger);

var _tools = require('./tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var handlers = {};
var tasks = {};

function sendMessage(proc, type, data, nowait) {
  return new Promise(function (resolve, reject) {
    var id = _uuid2.default.v4();
    tasks[id] = {
      resolve: resolve,
      reject: reject
    };
    proc.send({
      id: id,
      type: type,
      data: data || null
    }, function (err) {
      if (err) {
        delete tasks[id];
        reject(err);
        return;
      }
      if (nowait) {
        delete tasks[id];
        resolve();
      }
    });
  });
}

if (_cluster2.default.isMaster) {
  _cluster2.default.on('online', function (worker) {
    worker.process.on('message', function (message) {
      handleMessage(message, worker.id);
    });
  });
} else {
  process.on('message', function (message) {
    handleMessage(message);
  });
}

function send(type, data, nowait, workerID) {
  if (_cluster2.default.isMaster) {
    if (workerID) {
      var worker = _cluster2.default.workers[workerID];
      if (!worker) {
        return Promise.reject(Tools.translate('Invalid worker ID'));
      }
      return sendMessage(worker.process, type, data, nowait);
    } else {
      var promises = (0, _underscore2.default)(_cluster2.default.workers).map(function (worker) {
        return sendMessage(worker.process, type, data, nowait);
      });
      return Promise.all(promises);
    }
  } else {
    return sendMessage(process, type, data, nowait);
  }
}

function on(type, handler) {
  handlers[type] = handler;
  return module.exports;
}
//# sourceMappingURL=ipc.js.map
