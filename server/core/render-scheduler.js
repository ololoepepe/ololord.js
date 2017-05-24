'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleRenderRSS = exports.scheduleRenderArchive = exports.scheduleRender = undefined;

var performTask = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(type, key, data) {
    var workerID, result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
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
            _context.prev = 2;
            _context.next = 5;
            return IPC.send('render', {
              type: type,
              key: key,
              data: data
            }, false, workerID);

          case 5:
            result = _context.sent;

            workerLoads.set(workerID, workerLoads.get(workerID) - 1);
            return _context.abrupt('return', result);

          case 10:
            _context.prev = 10;
            _context.t0 = _context['catch'](2);

            workerLoads.set(workerID, workerLoads.get(workerID) - 1);
            throw _context.t0;

          case 14:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[2, 10]]);
  }));

  return function performTask(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var nextTask = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(type, key, map) {
    var scheduled;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            scheduled = map.get(key);

            if (scheduled) {
              _context2.next = 3;
              break;
            }

            return _context2.abrupt('return');

          case 3:
            if (!(scheduled.length <= 0)) {
              _context2.next = 6;
              break;
            }

            map.delete(key);
            return _context2.abrupt('return');

          case 6:
            //NOTE: Clearing initial array, but preserving it's copy
            scheduled = scheduled.splice(0, scheduled.length);
            _context2.prev = 7;
            _context2.next = 10;
            return performTask(type, key, scheduled.map(function (n) {
              return n.data;
            }));

          case 10:
            _context2.next = 15;
            break;

          case 12:
            _context2.prev = 12;
            _context2.t0 = _context2['catch'](7);

            _logger2.default.error(_context2.t0.stack || _context2.t0);

          case 15:
            nextTask(type, key, map);
            scheduled.forEach(function (n) {
              n.resolve();
            });

          case 17:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[7, 12]]);
  }));

  return function nextTask(_x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var addTask = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(type, key, data) {
    var map, scheduled;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            map = scheduledMap.get(type);
            scheduled = map.get(key);

            if (!scheduled) {
              _context3.next = 6;
              break;
            }

            return _context3.abrupt('return', new Promise(function (resolve) {
              scheduled.push({
                resolve: resolve,
                data: data
              });
            }));

          case 6:
            map.set(key, []);
            _context3.prev = 7;
            _context3.next = 10;
            return performTask(type, key, data);

          case 10:
            _context3.next = 15;
            break;

          case 12:
            _context3.prev = 12;
            _context3.t0 = _context3['catch'](7);

            _logger2.default.error(_context3.t0.stack || _context3.t0);

          case 15:
            nextTask(type, key, map);

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[7, 12]]);
  }));

  return function addTask(_x7, _x8, _x9) {
    return _ref3.apply(this, arguments);
  };
}();

var renderThread = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber, postNumber, action) {
    var isDeleted;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return ThreadsModel.isThreadDeleted(boardName, threadNumber);

          case 2:
            isDeleted = _context4.sent;

            if (!isDeleted) {
              _context4.next = 5;
              break;
            }

            return _context4.abrupt('return');

          case 5:
            if (threadNumber !== postNumber) {
              action = 'edit';
            }
            _context4.next = 8;
            return addTask('renderThread', boardName + ':' + threadNumber, {
              boardName: boardName,
              threadNumber: threadNumber,
              action: action
            });

          case 8:
            return _context4.abrupt('return', _context4.sent);

          case 9:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function renderThread(_x10, _x11, _x12, _x13) {
    return _ref4.apply(this, arguments);
  };
}();

var renderPages = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return addTask('renderPages', boardName, threadNumber);

          case 2:
            return _context5.abrupt('return', _context5.sent);

          case 3:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function renderPages(_x14, _x15) {
    return _ref5.apply(this, arguments);
  };
}();

var renderCatalog = function () {
  var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName) {
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return addTask('renderCatalog', boardName);

          case 2:
            return _context6.abrupt('return', _context6.sent);

          case 3:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function renderCatalog(_x16) {
    return _ref6.apply(this, arguments);
  };
}();

var scheduleRender = exports.scheduleRender = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(data) {
    var boardName, threadNumber, postNumber, action;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.prev = 0;
            boardName = data.boardName, threadNumber = data.threadNumber, postNumber = data.postNumber, action = data.action;
            _context10.t0 = action;
            _context10.next = _context10.t0 === 'create' ? 5 : _context10.t0 === 'edit' ? 9 : _context10.t0 === 'delete' ? 9 : 19;
            break;

          case 5:
            _context10.next = 7;
            return renderThread(boardName, threadNumber, postNumber, action);

          case 7:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
              return regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                  switch (_context7.prev = _context7.next) {
                    case 0:
                      _context7.next = 2;
                      return renderPages(boardName, threadNumber);

                    case 2:
                      _context7.next = 4;
                      return renderCatalog(boardName);

                    case 4:
                    case 'end':
                      return _context7.stop();
                  }
                }
              }, _callee7, this);
            }))();
            return _context10.abrupt('break', 21);

          case 9:
            if (!(threadNumber === postNumber)) {
              _context10.next = 17;
              break;
            }

            _context10.next = 12;
            return renderThread(boardName, threadNumber, postNumber, action);

          case 12:
            _context10.next = 14;
            return renderPages(boardName, threadNumber);

          case 14:
            renderCatalog(boardName);
            _context10.next = 18;
            break;

          case 17:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
              return regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                  switch (_context8.prev = _context8.next) {
                    case 0:
                      _context8.next = 2;
                      return renderThread(boardName, threadNumber, postNumber, action);

                    case 2:
                      _context8.next = 4;
                      return renderPages(boardName, threadNumber);

                    case 4:
                      renderCatalog(boardName);

                    case 5:
                    case 'end':
                      return _context8.stop();
                  }
                }
              }, _callee8, this);
            }))();

          case 18:
            return _context10.abrupt('break', 21);

          case 19:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
              return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                  switch (_context9.prev = _context9.next) {
                    case 0:
                      _context9.next = 2;
                      return renderThread(boardName, threadNumber, postNumber, action);

                    case 2:
                      _context9.next = 4;
                      return renderPages(boardName, threadNumber);

                    case 4:
                      renderCatalog(boardName);

                    case 5:
                    case 'end':
                      return _context9.stop();
                  }
                }
              }, _callee9, this);
            }))();
            return _context10.abrupt('break', 21);

          case 21:
            _context10.next = 27;
            break;

          case 23:
            _context10.prev = 23;
            _context10.t1 = _context10['catch'](0);

            _logger2.default.error(_context10.t1.stack || _context10.t1);
            throw _context10.t1;

          case 27:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this, [[0, 23]]);
  }));

  return function scheduleRender(_x17) {
    return _ref7.apply(this, arguments);
  };
}();

var scheduleRenderArchive = exports.scheduleRenderArchive = function () {
  var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName) {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.prev = 0;
            _context11.next = 3;
            return addTask('renderArchive', boardName);

          case 3:
            _context11.next = 9;
            break;

          case 5:
            _context11.prev = 5;
            _context11.t0 = _context11['catch'](0);

            _logger2.default.error(_context11.t0.stack || _context11.t0);
            throw _context11.t0;

          case 9:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this, [[0, 5]]);
  }));

  return function scheduleRenderArchive(_x18) {
    return _ref11.apply(this, arguments);
  };
}();

var scheduleRenderRSS = exports.scheduleRenderRSS = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName) {
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.prev = 0;
            _context12.next = 3;
            return addTask('renderRSS', boardName);

          case 3:
            _context12.next = 9;
            break;

          case 5:
            _context12.prev = 5;
            _context12.t0 = _context12['catch'](0);

            _logger2.default.error(_context12.t0.stack || _context12.t0);
            throw _context12.t0;

          case 9:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this, [[0, 5]]);
  }));

  return function scheduleRenderRSS(_x19) {
    return _ref12.apply(this, arguments);
  };
}();

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var scheduledMap = new Map([['renderPages', new Map()], ['renderThread', new Map()], ['renderCatalog', new Map()], ['renderArchive', new Map()], ['renderRSS', new Map()]]);
var workerLoads = new Map();
//# sourceMappingURL=render-scheduler.js.map
