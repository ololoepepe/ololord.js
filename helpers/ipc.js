'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.render = exports.renderArchive = exports.renderCatalog = exports.renderPages = undefined;

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

var performTask = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(type, key, data) {
    var workerID, result;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            workerID = Object.keys(_cluster2.default.workers).map(function (id) {
              return {
                id: id,
                load: workerLoads.get(id) || 0
              };
            }).sort(function (w1, w2) {
              return w1.load - w2.load;
            }).shift().id;

            if (workerLoads.has(workerID)) {
              workerLoads.set(workerID, workerLoads.get(workerID) + 1);
            } else {
              workerLoads.set(workerID, 1);
            }
            _context2.prev = 2;
            result = send('render', {
              type: type,
              key: key,
              data: data
            }, false, workerID);

            workerLoads.set(workerID, workerLoads.get(workerID) - 1);
            return _context2.abrupt('return', result);

          case 8:
            _context2.prev = 8;
            _context2.t0 = _context2['catch'](2);

            workerLoads.set(workerID, workerLoads.get(workerID) - 1);
            return _context2.abrupt('return', Promise.reject(_context2.t0));

          case 12:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[2, 8]]);
  }));

  return function performTask(_x3, _x4, _x5) {
    return ref.apply(this, arguments);
  };
}();

var nextTask = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(type, key, map) {
    var scheduled, next;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            scheduled = map.get(key);
            next = scheduled.next;

            if (!(!next || next.length <= 0)) {
              _context3.next = 5;
              break;
            }

            map.delete(key);
            return _context3.abrupt('return');

          case 5:
            delete scheduled.next;
            _context3.prev = 6;
            _context3.next = 9;
            return performTask(type, key, next.map(function (n) {
              return n.data;
            }));

          case 9:
            _context3.next = 14;
            break;

          case 11:
            _context3.prev = 11;
            _context3.t0 = _context3['catch'](6);

            _logger2.default.error(_context3.t0.stack || _context3.t0);

          case 14:
            nextTask();
            next.forEach(function (n) {
              n.resolve();
            });

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[6, 11]]);
  }));

  return function nextTask(_x6, _x7, _x8) {
    return ref.apply(this, arguments);
  };
}();

var addTask = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(type, key, data) {
    var map, scheduled;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            map = scheduledMap.get(type);
            scheduled = map.get(key);

            if (!scheduled) {
              _context4.next = 6;
              break;
            }

            return _context4.abrupt('return', new Promise(function (resolve) {
              if (!scheduled.next) {
                scheduled.next = [];
              }
              scheduled.next.push({
                resolve: resolve,
                data: data
              });
            }));

          case 6:
            map.set(key, new Map());
            _context4.prev = 7;
            _context4.next = 10;
            return performTask(type, key, data);

          case 10:
            _context4.next = 15;
            break;

          case 12:
            _context4.prev = 12;
            _context4.t0 = _context4['catch'](7);

            _logger2.default.error(_context4.t0.stack || _context4.t0);

          case 15:
            nextTask(type, key, map);

          case 16:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[7, 12]]);
  }));

  return function addTask(_x9, _x10, _x11) {
    return ref.apply(this, arguments);
  };
}();

var renderThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, threadNumber, postNumber, action) {
    var isDeleted;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return ThreadsModel.isThreadDeleted(boardName, threadNumber);

          case 2:
            isDeleted = _context5.sent;

            if (!isDeleted) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return');

          case 5:
            if (threadNumber === postNumber) {
              if ('edit' === action) {
                action = 'create';
              }
            } else {
              action = 'edit';
            }
            _context5.next = 8;
            return addTask('renderThread', boardName + ':' + threadNumber, {
              boardName: boardName,
              threadNumber: threadNumber,
              action: action
            });

          case 8:
            return _context5.abrupt('return', _context5.sent);

          case 9:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function renderThread(_x12, _x13, _x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var renderPages = exports.renderPages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName) {
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return addTask('renderPages', boardName);

          case 2:
            return _context6.abrupt('return', _context6.sent);

          case 3:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function renderPages(_x16) {
    return ref.apply(this, arguments);
  };
}();

var renderCatalog = exports.renderCatalog = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return addTask('renderCatalog', boardName);

          case 2:
            return _context7.abrupt('return', _context7.sent);

          case 3:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function renderCatalog(_x17) {
    return ref.apply(this, arguments);
  };
}();

var renderArchive = exports.renderArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName) {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;

            if (!_cluster2.default.isMaster) {
              _context8.next = 7;
              break;
            }

            _context8.next = 4;
            return addTask('renderArchive', boardName);

          case 4:
            return _context8.abrupt('return', _context8.sent);

          case 7:
            _context8.next = 9;
            return send('renderArchive', boardName);

          case 9:
            _context8.next = 14;
            break;

          case 11:
            _context8.prev = 11;
            _context8.t0 = _context8['catch'](0);

            _logger2.default.error(_context8.t0.stack || _context8.t0);

          case 14:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 11]]);
  }));

  return function renderArchive(_x18) {
    return ref.apply(this, arguments);
  };
}();

var render = exports.render = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, threadNumber, postNumber, action) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.prev = 0;

            if (!_cluster2.default.isMaster) {
              _context15.next = 23;
              break;
            }

            _context15.t0 = action;
            _context15.next = _context15.t0 === 'create' ? 5 : _context15.t0 === 'edit' ? 9 : _context15.t0 === 'delete' ? 9 : 19;
            break;

          case 5:
            _context15.next = 7;
            return renderThread(boardName, threadNumber, postNumber, action);

          case 7:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
              return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                  switch (_context9.prev = _context9.next) {
                    case 0:
                      _context9.next = 2;
                      return renderPages(boardName);

                    case 2:
                      _context9.next = 4;
                      return renderCatalog(boardName);

                    case 4:
                      _context9.next = 6;
                      return renderArchive(boardName);

                    case 6:
                    case 'end':
                      return _context9.stop();
                  }
                }
              }, _callee9, this);
            }))();
            return _context15.abrupt('break', 21);

          case 9:
            if (!(threadNumber === postNumber)) {
              _context15.next = 17;
              break;
            }

            _context15.next = 12;
            return renderThread(boardName, threadNumber, postNumber, action);

          case 12:
            _context15.next = 14;
            return renderPages(boardName);

          case 14:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
              return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                  switch (_context10.prev = _context10.next) {
                    case 0:
                      _context10.next = 2;
                      return renderCatalog(boardName);

                    case 2:
                      _context10.next = 4;
                      return renderArchive(boardName);

                    case 4:
                    case 'end':
                      return _context10.stop();
                  }
                }
              }, _callee10, this);
            }))();
            _context15.next = 18;
            break;

          case 17:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
              return regeneratorRuntime.wrap(function _callee12$(_context12) {
                while (1) {
                  switch (_context12.prev = _context12.next) {
                    case 0:
                      _context12.next = 2;
                      return renderThread(boardName, threadNumber, postNumber, action);

                    case 2:
                      _context12.next = 4;
                      return renderPages(boardName);

                    case 4:
                      _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
                        return regeneratorRuntime.wrap(function _callee11$(_context11) {
                          while (1) {
                            switch (_context11.prev = _context11.next) {
                              case 0:
                                _context11.next = 2;
                                return renderCatalog(boardName);

                              case 2:
                                _context11.next = 4;
                                return renderArchive(boardName);

                              case 4:
                              case 'end':
                                return _context11.stop();
                            }
                          }
                        }, _callee11, this);
                      }))();

                    case 5:
                    case 'end':
                      return _context12.stop();
                  }
                }
              }, _callee12, this);
            }))();

          case 18:
            return _context15.abrupt('break', 21);

          case 19:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
              return regeneratorRuntime.wrap(function _callee14$(_context14) {
                while (1) {
                  switch (_context14.prev = _context14.next) {
                    case 0:
                      _context14.next = 2;
                      return renderThread(boardName, threadNumber, postNumber, action);

                    case 2:
                      _context14.next = 4;
                      return renderPages(boardName);

                    case 4:
                      _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
                        return regeneratorRuntime.wrap(function _callee13$(_context13) {
                          while (1) {
                            switch (_context13.prev = _context13.next) {
                              case 0:
                                _context13.next = 2;
                                return renderCatalog(boardName);

                              case 2:
                                _context13.next = 4;
                                return renderArchive(boardName);

                              case 4:
                              case 'end':
                                return _context13.stop();
                            }
                          }
                        }, _callee13, this);
                      }))();

                    case 5:
                    case 'end':
                      return _context14.stop();
                  }
                }
              }, _callee14, this);
            }));
            return _context15.abrupt('break', 21);

          case 21:
            _context15.next = 25;
            break;

          case 23:
            _context15.next = 25;
            return send('render', {
              boardName: boardName,
              threadNumber: threadNumber,
              postNumber: postNumber,
              action: action
            });

          case 25:
            _context15.next = 30;
            break;

          case 27:
            _context15.prev = 27;
            _context15.t1 = _context15['catch'](0);

            _logger2.default.error(_context15.t1.stack || _context15.t1);

          case 30:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this, [[0, 27]]);
  }));

  return function render(_x19, _x20, _x21, _x22) {
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

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('./tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var handlers = new Map();
var tasks = new Map();
var scheduledRenderPages = new Map();
var scheduledRenderThread = new Map();
var scheduledRenderCatalog = new Map();
var scheduledRenderArchive = new Map();
var scheduledMap = new Map([['renderPages', scheduledRenderPages], ['renderThread', scheduledRenderThread], ['renderCatalog', scheduledRenderCatalog], ['renderArchive', scheduledRenderArchive]]);
var workerLoads = new Map();

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

function send(type, data, nowait, workerID) {
  if (_cluster2.default.isMaster) {
    if (workerID) {
      var worker = _cluster2.default.workers[workerID];
      if (!worker) {
        return Promise.reject(new Error(Tools.translate('Invalid worker ID')));
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
  handlers.set(type, handler);
  return module.exports;
}
//# sourceMappingURL=ipc.js.map
