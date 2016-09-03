#!/usr/bin/env node
'use strict';

require('babel-polyfill');

require('source-map-support/register');

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _expressCluster = require('express-cluster');

var _expressCluster2 = _interopRequireDefault(_expressCluster);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _board = require('./boards/board');

var _board2 = _interopRequireDefault(_board);

var _captcha = require('./captchas/captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _nodeCaptcha = require('./captchas/node-captcha');

var _nodeCaptcha2 = _interopRequireDefault(_nodeCaptcha);

var _nodeCaptchaNoscript = require('./captchas/node-captcha-noscript');

var _nodeCaptchaNoscript2 = _interopRequireDefault(_nodeCaptchaNoscript);

var _commands = require('./commands');

var _commands2 = _interopRequireDefault(_commands);

var _controllers = require('./controllers');

var _controllers2 = _interopRequireDefault(_controllers);

var _board3 = require('./controllers/board');

var _board4 = _interopRequireDefault(_board3);

var _geolocation = require('./core/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

var _renderer = require('./core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _websocketServer = require('./core/websocket-server');

var _websocketServer2 = _interopRequireDefault(_websocketServer);

var _config = require('./helpers/config');

var _config2 = _interopRequireDefault(_config);

var _ipc = require('./helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('./helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _onlineCounter = require('./helpers/online-counter');

var OnlineCounter = _interopRequireWildcard(_onlineCounter);

var _program = require('./helpers/program');

var _program2 = _interopRequireDefault(_program);

var _tools = require('./helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _boards = require('./models/boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _chats = require('./models/chats');

var ChatsModel = _interopRequireWildcard(_chats);

var _statistics = require('./models/statistics');

var StatisticsModel = _interopRequireWildcard(_statistics);

var _users = require('./models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function spawnCluster() {
  (0, _expressCluster2.default)(function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(worker) {
      var _this = this;

      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              console.log('[' + process.pid + '] Initializing…');
              _context5.prev = 1;
              return _context5.delegateYield(regeneratorRuntime.mark(function _callee4() {
                var sockets, nextSocketId, server, ws, subscriptions;
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.next = 2;
                        return _geolocation2.default.initialize();

                      case 2:
                        _context4.next = 4;
                        return BoardsModel.initialize();

                      case 4:
                        _context4.next = 6;
                        return Renderer.reloadTemplates();

                      case 6:
                        sockets = {};
                        nextSocketId = 0;
                        server = _http2.default.createServer(_controllers2.default);
                        ws = new _websocketServer2.default(server);

                        ws.on('sendChatMessage', function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(msg, conn) {
                            var data, _ref, message, chatNumber, senderHash, receiverHash, receiver, ip;

                            return regeneratorRuntime.wrap(function _callee$(_context) {
                              while (1) {
                                switch (_context.prev = _context.next) {
                                  case 0:
                                    data = msg.data || {};
                                    _context.next = 3;
                                    return ChatsModel.addChatMessage({
                                      user: conn,
                                      boardName: data.boardName,
                                      postNumber: data.postNumber,
                                      chatNumber: data.chatNumber,
                                      text: data.text
                                    });

                                  case 3:
                                    _ref = _context.sent;
                                    message = _ref.message;
                                    chatNumber = _ref.chatNumber;
                                    senderHash = _ref.senderHash;
                                    receiverHash = _ref.receiverHash;
                                    receiver = _ref.receiver;

                                    if (senderHash !== receiverHash) {
                                      message.type = 'in';
                                      ip = receiver.hashpass ? null : receiver.ip;

                                      IPC.send('sendChatMessage', {
                                        type: 'newChatMessage',
                                        message: {
                                          message: message,
                                          boardName: data.boardName,
                                          postNumber: data.postNumber,
                                          chatNumber: chatNumber
                                        },
                                        ips: ip,
                                        hashpasses: receiver.hashpass
                                      });
                                    }
                                    message.type = 'out';
                                    return _context.abrupt('return', {
                                      message: message,
                                      chatNumber: chatNumber
                                    });

                                  case 12:
                                  case 'end':
                                    return _context.stop();
                                }
                              }
                            }, _callee, this);
                          }));

                          return function (_x2, _x3) {
                            return ref.apply(this, arguments);
                          };
                        }());
                        subscriptions = new Map();

                        ws.on('subscribeToThreadUpdates', function (msg, conn) {
                          var _ref2 = msg.data || {};

                          var boardName = _ref2.boardName;
                          var threadNumber = _ref2.threadNumber;

                          var key = boardName + '/' + threadNumber;
                          if (subscriptions.has(key)) {
                            subscriptions.get(key).add(conn);
                          } else {
                            var s = new Set();
                            s.add(conn);
                            subscriptions.set(key, s);
                          }
                        });
                        ws.on('unsubscribeFromThreadUpdates', function (msg, conn) {
                          var _ref3 = msg.data || {};

                          var boardName = _ref3.boardName;
                          var threadNumber = _ref3.threadNumber;

                          var key = boardName + '/' + threadNumber;
                          var s = subscriptions.get(key);
                          if (!s) {
                            return;
                          }
                          s.delete(conn);
                          if (s.size < 1) {
                            subscriptions.delete(key);
                          }
                        });
                        server.listen((0, _config2.default)('server.port'), function () {
                          console.log('[' + process.pid + '] Listening on port ' + (0, _config2.default)('server.port') + '…');
                          IPC.on('exit', function (status) {
                            process.exit(status);
                          });
                          IPC.on('stop', function () {
                            return new Promise(function (resolve, reject) {
                              server.close(function () {
                                (0, _underscore2.default)(sockets).each(function (socket, socketId) {
                                  delete sockets[socketId];
                                  socket.destroy();
                                });
                                OnlineCounter.clear();
                                console.log('[' + process.pid + '] Closed');
                                resolve();
                              });
                            });
                          });
                          IPC.on('start', function () {
                            return new Promise(function (resolve, reject) {
                              server.listen((0, _config2.default)('server.port'), function () {
                                console.log('[' + process.pid + '] Listening on port ' + (0, _config2.default)('server.port') + '…');
                                resolve();
                              });
                            });
                          });
                          IPC.on('sendChatMessage', function () {
                            var _ref4 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

                            var type = _ref4.type;
                            var message = _ref4.message;
                            var ips = _ref4.ips;
                            var hashpasses = _ref4.hashpasses;

                            ws.sendMessage(type, message, ips, hashpasses);
                          });
                          IPC.on('render', function () {
                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(data) {
                              var f;
                              return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                while (1) {
                                  switch (_context2.prev = _context2.next) {
                                    case 0:
                                      f = _board4.default['' + data.type];

                                      if (!(typeof f !== 'function')) {
                                        _context2.next = 3;
                                        break;
                                      }

                                      throw new Error(Tools.translate('Invalid render function'));

                                    case 3:
                                      _context2.next = 5;
                                      return f.call(_board4.default, data.key, data.data);

                                    case 5:
                                      return _context2.abrupt('return', _context2.sent);

                                    case 6:
                                    case 'end':
                                      return _context2.stop();
                                  }
                                }
                              }, _callee2, this);
                            }));

                            return function (_x5) {
                              return ref.apply(this, arguments);
                            };
                          }());
                          IPC.on('reloadBoards', function () {
                            _board2.default.initialize();
                          });
                          IPC.on('reloadTemplates', _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
                            return regeneratorRuntime.wrap(function _callee3$(_context3) {
                              while (1) {
                                switch (_context3.prev = _context3.next) {
                                  case 0:
                                    _context3.next = 2;
                                    return Renderer.reloadTemplates();

                                  case 2:
                                    return _context3.abrupt('return', _context3.sent);

                                  case 3:
                                  case 'end':
                                    return _context3.stop();
                                }
                              }
                            }, _callee3, this);
                          })));
                          IPC.on('notifyAboutNewPosts', function (keys) {
                            (0, _underscore2.default)(keys).each(function (_1, key) {
                              var s = subscriptions.get(key);
                              if (!s) {
                                return;
                              }
                              s.forEach(function (conn) {
                                conn.sendMessage('newPost');
                              });
                            });
                          });
                          IPC.on('getConnectionIPs', function () {
                            return OnlineCounter.unique();
                          });
                          IPC.send('ready').catch(function (err) {
                            _logger2.default.error(err);
                          });
                        });
                        server.on('connection', function (socket) {
                          var socketId = ++nextSocketId;
                          sockets[socketId] = socket;
                          socket.on('close', function () {
                            delete sockets[socketId];
                          });
                        });

                      case 16:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, _this);
              })(), 't0', 3);

            case 3:
              _context5.next = 9;
              break;

            case 5:
              _context5.prev = 5;
              _context5.t1 = _context5['catch'](1);

              console.log(_context5.t1);
              _logger2.default.error(_context5.t1.stack || _context5.t1);

            case 9:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this, [[1, 5]]);
    }));

    return function (_x) {
      return ref.apply(this, arguments);
    };
  }(), {
    count: (0, _config2.default)('system.workerCount'),
    respawn: true
  });
}

function generateFileName() {
  var fileName = _underscore2.default.now().toString();
  if (fileName != generateFileName.lastFileName) {
    generateFileName.lastFileName = fileName;
    return fileName;
  }
  return new Promise(function (resolve) {
    setTimeout(_asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
      var fileName;
      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return fileName();

            case 2:
              fileName = _context6.sent;

              resolve(fileName);

            case 4:
            case 'end':
              return _context6.stop();
          }
        }
      }, _callee6, this);
    })), 1);
  });
}

function onReady(initCallback) {
  //TODO: May throw error
  if (!onReady.ready) {
    onReady.ready = 0;
  }
  ++onReady.ready;
  if ((0, _config2.default)('system.workerCount') === onReady.ready) {
    UsersModel.initializeUserBansMonitoring();
    if ((0, _config2.default)('server.statistics.enabled')) {
      setInterval(StatisticsModel.generateStatistics.bind(StatisticsModel), (0, _config2.default)('server.statistics.ttl') * Tools.MINUTE);
    }
    if ((0, _config2.default)('server.rss.enabled')) {
      setInterval(_board4.default.renderRSS.bind(_board4.default), (0, _config2.default)('server.rss.ttl') * Tools.MINUTE);
    }
    (0, _commands2.default)();
  }
}

function spawnWorkers(initCallback) {
  console.log(Tools.translate('Spawning workers, please, wait…'));
  spawnCluster();
  IPC.on('ready', onReady.bind(null, initCallback));
  IPC.on('fileName', generateFileName);
  IPC.on('sendChatMessage', function (data) {
    return IPC.send('sendChatMessage', data);
  });
  IPC.on('render', function (data) {
    return IPC.render(data.boardName, data.threadNumber, data.postNumber, data.action);
  });
  IPC.on('renderArchive', function (data) {
    //TODO
    return IPC.renderArchive(data);
  });
  IPC.on('stop', function () {
    return IPC.send('stop');
  });
  IPC.on('start', function () {
    return IPC.send('start');
  });
  IPC.on('reloadBoards', function () {
    _board2.default.initialize();
    return IPC.send('reloadBoards');
  });
  IPC.on('reloadTemplates', _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return Renderer.compileTemplates();

          case 2:
            _context7.next = 4;
            return Renderer.reloadTemplates();

          case 4:
            return _context7.abrupt('return', IPC.send('reloadTemplates'));

          case 5:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  })));
  var hasNewPosts = {};
  setInterval(function () {
    if ((0, _underscore2.default)(hasNewPosts).isEmpty()) {
      return;
    }
    IPC.send('notifyAboutNewPosts', hasNewPosts).catch(function (err) {
      _logger2.default.error(err.stack || err);
    });
    hasNewPosts = {};
  }, Tools.SECOND);
  IPC.on('notifyAboutNewPosts', function (key) {
    hasNewPosts[key] = 1;
  });
  IPC.on('rerenderCache', function (rerenderArchive) {
    if (rerenderArchive) {
      return Renderer.rerender();
    } else {
      //return Renderer.rerender(Tools.ARCHIVE_PATHS_REGEXP, true);
    }
  });
}

_board2.default.initialize();
_captcha2.default.initialize();
_controllers2.default.initialize();

if (_cluster2.default.isMaster) {
  _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;
            _context8.next = 3;
            return _nodeCaptcha2.default.removeOldCaptchImages();

          case 3:
            _context8.next = 5;
            return _nodeCaptchaNoscript2.default.removeOldCaptchImages();

          case 5:
            _context8.next = 7;
            return Renderer.compileTemplates();

          case 7:
            _context8.next = 9;
            return Renderer.reloadTemplates();

          case 9:
            if (!(_program2.default.rerender || (0, _config2.default)('system.rerenderCacheOnStartup'))) {
              _context8.next = 17;
              break;
            }

            if (!(_program2.default.archive || (0, _config2.default)('system.rerenderArchive'))) {
              _context8.next = 15;
              break;
            }

            _context8.next = 13;
            return Renderer.rerender();

          case 13:
            _context8.next = 17;
            break;

          case 15:
            _context8.next = 17;
            return Renderer.rerender(['**', '!/*/arch/*']);

          case 17:
            _context8.next = 19;
            return StatisticsModel.generateStatistics();

          case 19:
            _context8.next = 21;
            return Renderer.generateTemplatingJavaScriptFile();

          case 21:
            _context8.next = 23;
            return Renderer.generateCustomJavaScriptFile();

          case 23:
            _context8.next = 25;
            return Renderer.generateCustomCSSFiles();

          case 25:
            spawnWorkers();
            _context8.next = 32;
            break;

          case 28:
            _context8.prev = 28;
            _context8.t0 = _context8['catch'](0);

            _logger2.default.error(_context8.t0.stack || _context8.t0);
            process.exit(1);

          case 32:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 28]]);
  }))();
} else {
  spawnCluster();
}
//# sourceMappingURL=server.js.map
