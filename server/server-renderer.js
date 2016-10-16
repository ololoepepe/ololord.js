#!/usr/bin/env node
'use strict';

require('babel-polyfill');

require('source-map-support/register');

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _board = require('./boards/board');

var _board2 = _interopRequireDefault(_board);

var _commands = require('./commands');

var _commands2 = _interopRequireDefault(_commands);

var _board3 = require('./controllers/board');

var _board4 = _interopRequireDefault(_board3);

var _renderer = require('./core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _renderScheduler = require('./core/render-scheduler');

var RenderScheduler = _interopRequireWildcard(_renderScheduler);

var _config = require('./helpers/config');

var _config2 = _interopRequireDefault(_config);

var _ipc = require('./helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('./helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _queue = require('./helpers/queue');

var _queue2 = _interopRequireDefault(_queue);

var _tools = require('./helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _boards = require('./models/boards');

var BoardsModel = _interopRequireWildcard(_boards);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function onReady() {
  try {
    if (!onReady.ready) {
      onReady.ready = 0;
    }
    ++onReady.ready;
    if ((0, _config2.default)('system.rendererWorkerCount') === onReady.ready) {
      (0, _commands2.default)(true, 'ololord.js-rend>');
    }
  } catch (err) {
    console.error(err);
    try {
      _logger2.default.error(err.stack || err);
    } catch (err) {
      console.error(err);
    }
    process.exit(1);
  }
}

function initializeMaster() {
  //NOTE: Overcoming Babel bug
  _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
    var i;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            try {
              console.log(Tools.translate('Spawning renderer workers, please, wait…'));
              _cluster2.default.on('exit', function (worker) {
                _logger2.default.error(Tools.translate('[$[1]] Renderer died, respawning…', '', worker.process.pid));
                _cluster2.default.fork();
              });
              for (i = 0; i < (0, _config2.default)('system.rendererWorkerCount'); ++i) {
                _cluster2.default.fork();
              }
              IPC.on('ready', onReady);
              IPC.on('reloadBoards', _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _board2.default.initialize();
                        _context.next = 3;
                        return IPC.send('reloadBoards');

                      case 3:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, this);
              })));
              IPC.on('reloadTemplates', _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return Renderer.compileTemplates();

                      case 2:
                        _context2.next = 4;
                        return IPC.send('reloadTemplates');

                      case 4:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, this);
              })));
              _queue2.default.process('reloadBoards', function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(_1, done) {
                  return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          _context3.prev = 0;

                          _board2.default.initialize();
                          _context3.next = 4;
                          return IPC.send('reloadBoards');

                        case 4:
                          _context3.next = 9;
                          break;

                        case 6:
                          _context3.prev = 6;
                          _context3.t0 = _context3['catch'](0);

                          _logger2.default.error(_context3.t0.stack || _context3.t0);

                        case 9:
                          done();

                        case 10:
                        case 'end':
                          return _context3.stop();
                      }
                    }
                  }, _callee3, this, [[0, 6]]);
                }));

                return function (_x, _x2) {
                  return ref.apply(this, arguments);
                };
              }());
              _queue2.default.process('reloadTemplates', function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(_1, done) {
                  return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                      switch (_context4.prev = _context4.next) {
                        case 0:
                          _context4.prev = 0;
                          _context4.next = 3;
                          return Renderer.reloadTemplates();

                        case 3:
                          _context4.next = 5;
                          return IPC.send('reloadTemplates');

                        case 5:
                          _context4.next = 10;
                          break;

                        case 7:
                          _context4.prev = 7;
                          _context4.t0 = _context4['catch'](0);

                          _logger2.default.error(_context4.t0.stack || _context4.t0);

                        case 10:
                          done();

                        case 11:
                        case 'end':
                          return _context4.stop();
                      }
                    }
                  }, _callee4, this, [[0, 7]]);
                }));

                return function (_x3, _x4) {
                  return ref.apply(this, arguments);
                };
              }());
              _queue2.default.process('render', function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(job, done) {
                  return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                      switch (_context5.prev = _context5.next) {
                        case 0:
                          _context5.prev = 0;

                          _logger2.default.info(Tools.translate('Task: $[1]', '', 'render'), job.data);
                          _context5.next = 4;
                          return RenderScheduler.scheduleRender(job.data);

                        case 4:
                          done();
                          _context5.next = 11;
                          break;

                        case 7:
                          _context5.prev = 7;
                          _context5.t0 = _context5['catch'](0);

                          _logger2.default.error(_context5.t0.stack || _context5.t0);
                          done(_context5.t0);

                        case 11:
                        case 'end':
                          return _context5.stop();
                      }
                    }
                  }, _callee5, this, [[0, 7]]);
                }));

                return function (_x5, _x6) {
                  return ref.apply(this, arguments);
                };
              }());
              _queue2.default.process('renderArchive', function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(job, done) {
                  return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          _context6.prev = 0;

                          _logger2.default.info(Tools.translate('Task: $[1]', '', 'renderArchive'), job.data);
                          _context6.next = 4;
                          return RenderScheduler.scheduleRenderArchive(job.data);

                        case 4:
                          done();
                          _context6.next = 11;
                          break;

                        case 7:
                          _context6.prev = 7;
                          _context6.t0 = _context6['catch'](0);

                          _logger2.default.error(_context6.t0.stack || _context6.t0);
                          done(_context6.t0);

                        case 11:
                        case 'end':
                          return _context6.stop();
                      }
                    }
                  }, _callee6, this, [[0, 7]]);
                }));

                return function (_x7, _x8) {
                  return ref.apply(this, arguments);
                };
              }());
              _queue2.default.process('renderRSS', function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(job, done) {
                  return regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                      switch (_context7.prev = _context7.next) {
                        case 0:
                          _context7.prev = 0;

                          _logger2.default.info(Tools.translate('Task: $[1]', '', 'renderRSS'));
                          _context7.next = 4;
                          return RenderScheduler.scheduleRenderRSS();

                        case 4:
                          done();
                          _context7.next = 11;
                          break;

                        case 7:
                          _context7.prev = 7;
                          _context7.t0 = _context7['catch'](0);

                          _logger2.default.error(_context7.t0.stack || _context7.t0);
                          done(_context7.t0);

                        case 11:
                        case 'end':
                          return _context7.stop();
                      }
                    }
                  }, _callee7, this, [[0, 7]]);
                }));

                return function (_x9, _x10) {
                  return ref.apply(this, arguments);
                };
              }());
            } catch (err) {
              _logger2.default.error(err.stack || err);
              process.exit(1);
            }

          case 1:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }))();
}

function initializeWorker() {
  //NOTE: Overcoming Babel bug
  _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            console.log(Tools.translate('[$[1]] Initializing renderer…', '', process.pid));
            _context11.prev = 1;
            _context11.next = 4;
            return BoardsModel.initialize();

          case 4:
            _context11.next = 6;
            return Renderer.reloadTemplates();

          case 6:
            console.log(Tools.translate('[$[1]] Rendered initialized', '', process.pid));
            IPC.on('exit', function (status) {
              process.exit(status);
            });
            IPC.on('reloadBoards', function () {
              _board2.default.initialize();
            });
            IPC.on('reloadTemplates', _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
              return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                  switch (_context9.prev = _context9.next) {
                    case 0:
                      _context9.next = 2;
                      return Renderer.reloadTemplates();

                    case 2:
                      return _context9.abrupt('return', _context9.sent);

                    case 3:
                    case 'end':
                      return _context9.stop();
                  }
                }
              }, _callee9, this);
            })));
            IPC.on('render', function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(data) {
                var f;
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        f = _board4.default['' + data.type];

                        if (!(typeof f !== 'function')) {
                          _context10.next = 3;
                          break;
                        }

                        throw new Error(Tools.translate('Invalid render function'));

                      case 3:
                        _context10.next = 5;
                        return f.call(_board4.default, data.key, data.data);

                      case 5:
                        return _context10.abrupt('return', _context10.sent);

                      case 6:
                      case 'end':
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function (_x11) {
                return ref.apply(this, arguments);
              };
            }());
            IPC.send('ready').catch(function (err) {
              _logger2.default.error(err);
            });
            _context11.next = 19;
            break;

          case 14:
            _context11.prev = 14;
            _context11.t0 = _context11['catch'](1);

            console.error(_context11.t0);
            try {
              _logger2.default.error(_context11.t0.stack || _context11.t0);
            } catch (err) {
              console.error(err);
            }
            process.exit(1);

          case 19:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this, [[1, 14]]);
  }))();
}

_board2.default.initialize();

if (_cluster2.default.isMaster) {
  initializeMaster();
} else {
  initializeWorker();
}
//# sourceMappingURL=server-renderer.js.map
