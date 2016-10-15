'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderArchive = exports.render = exports.enqueueTask = exports.send = undefined;

var handleMessage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(message, workerID) {
    var task, handler, proc, data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            task = tasks.get(message.id);

            if (!task) {
              _context.next = 6;
              break;
            }

            tasks.delete(message.id);
            if (!message.error) {
              task.resolve(message.data);
            } else {
              task.reject(message.error);
            }
            _context.next = 19;
            break;

          case 6:
            handler = handlers.get(message.type);
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
              error: _context.t0.stack || _context.t0.toString()
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

var send = exports.send = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(type, data, nowait, workerID) {
    var worker, promises;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!_cluster2.default.isMaster) {
              _context2.next = 16;
              break;
            }

            if (!workerID) {
              _context2.next = 10;
              break;
            }

            worker = _cluster2.default.workers[workerID];

            if (worker) {
              _context2.next = 5;
              break;
            }

            throw new Error(Tools.translate('Invalid worker ID'));

          case 5:
            _context2.next = 7;
            return sendMessage(worker.process, type, data, nowait);

          case 7:
            return _context2.abrupt('return', _context2.sent);

          case 10:
            promises = (0, _underscore2.default)(_cluster2.default.workers).map(function (worker) {
              return sendMessage(worker.process, type, data, nowait);
            });
            _context2.next = 13;
            return Promise.all(promises);

          case 13:
            return _context2.abrupt('return', _context2.sent);

          case 14:
            _context2.next = 19;
            break;

          case 16:
            _context2.next = 18;
            return sendMessage(process, type, data, nowait);

          case 18:
            return _context2.abrupt('return', _context2.sent);

          case 19:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function send(_x3, _x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var enqueueTask = exports.enqueueTask = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(task, data, timeout) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            timeout = Tools.option(timeout, 'number', DEFAULT_TASK_TIMEOUT, { test: function test(t) {
                return t > 0;
              } });
            return _context3.abrupt('return', new Promise(function (resolve, reject) {
              var job = _queue2.default.create(task, data).ttl(timeout).save(function (err) {
                if (err) {
                  reject(err);
                }
              });
              job.on('complete', function (result) {
                resolve(result);
              }).on('failed', function (err) {
                reject(new Error(err));
              });
              setTimeout(function () {
                reject(new Error('Rendering task timed out'));
              }, timeout);
            }));

          case 2:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function enqueueTask(_x7, _x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

var render = exports.render = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber, postNumber, action, timeout) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (!_cluster2.default.isMaster) {
              _context4.next = 2;
              break;
            }

            throw new Error('Rendering requested from master process');

          case 2:
            _context4.next = 4;
            return enqueueTask('render', {
              boardName: boardName,
              threadNumber: threadNumber,
              postNumber: postNumber,
              action: action
            }, timeout);

          case 4:
            return _context4.abrupt('return', _context4.sent);

          case 5:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function render(_x10, _x11, _x12, _x13, _x14) {
    return ref.apply(this, arguments);
  };
}();

var renderArchive = exports.renderArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, timeout) {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (!_cluster2.default.isMaster) {
              _context5.next = 2;
              break;
            }

            throw new Error('Rendering requested from master process');

          case 2:
            _context5.next = 4;
            return enqueueTask('renderArchive', boardName, timeout);

          case 4:
            return _context5.abrupt('return', _context5.sent);

          case 5:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function renderArchive(_x15, _x16) {
    return ref.apply(this, arguments);
  };
}();

exports.on = on;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _queue = require('./queue');

var _queue2 = _interopRequireDefault(_queue);

var _tools = require('./tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var DEFAULT_TASK_TIMEOUT = 30 * Tools.SECOND;

var handlers = new Map();
var tasks = new Map();

function sendMessage(proc, type, data, nowait) {
  return new Promise(function (resolve, reject) {
    var id = _uuid2.default.v4();
    tasks.set(id, {
      resolve: resolve,
      reject: reject
    });
    proc.send({
      id: id,
      type: type,
      data: data || null
    }, function (err) {
      if (err) {
        tasks.delete(id);
        reject(err);
        return;
      }
      if (nowait) {
        tasks.delete(id);
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

function on(type, handler) {
  handlers.set(type, handler);
  return module.exports;
}
//# sourceMappingURL=ipc.js.map
