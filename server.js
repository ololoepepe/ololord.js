#!/usr/bin/env node
'use strict';

require('babel-polyfill');

require('source-map-support/register');

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

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

var _controllers = require('./controllers');

var _controllers2 = _interopRequireDefault(_controllers);

var _board3 = require('./controllers/board');

var _board4 = _interopRequireDefault(_board3);

var _commands = require('./core/commands');

var _commands2 = _interopRequireDefault(_commands);

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

var _middlewares = require('./middlewares');

var _middlewares2 = _interopRequireDefault(_middlewares);

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

_config2.default.installSetHook("site.locale", Tools.setLocale); //TODO

function spawnCluster() {
  (0, _expressCluster2.default)(function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(worker) {
      var app, sockets, nextSocketId, server, ws, subscriptions;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              console.log('[' + process.pid + '] Initializing...');
              _controllers2.default.initialize();
              app = (0, _express2.default)();

              app.use(_middlewares2.default);
              app.use(_controllers2.default);
              _context.prev = 5;
              _context.next = 8;
              return _geolocation2.default.initialize();

            case 8:
              _context.next = 10;
              return BoardsModel.initialize();

            case 10:
              _context.next = 12;
              return Renderer.reloadTemplates();

            case 12:
              sockets = {};
              nextSocketId = 0;
              server = _http2.default.createServer(app);
              ws = new _websocketServer2.default(server);

              ws.on("sendChatMessage", function (msg, conn) {
                var data = msg.data || {};
                return Chats.sendMessage({ //TODO
                  ip: conn.ip,
                  hashpass: conn.hashpass
                }, data.boardName, data.postNumber, data.text, ws).then(function (result) {
                  var message = result.message;
                  if (result.senderHash != result.receiverHash) {
                    message.type = "in";
                    var receiver = result.receiver;
                    var ip = receiver.hashpass ? null : receiver.ip;
                    ws.sendMessage("newChatMessage", {
                      message: message,
                      boardName: data.boardName,
                      postNumber: data.postNumber
                    }, ip, receiver.hashpass);
                  }
                  message.type = "out";
                  return Promise.resolve(message);
                });
              });
              subscriptions = new Map();

              ws.on("subscribeToThreadUpdates", function (msg, conn) {
                var data = msg.data || {};
                var key = data.boardName + "/" + data.threadNumber;
                if (subscriptions.has(key)) {
                  subscriptions.get(key).add(conn);
                } else {
                  var s = new Set();
                  s.add(conn);
                  subscriptions.set(key, s);
                }
              });
              ws.on("unsubscribeFromThreadUpdates", function (msg, conn) {
                var data = msg.data || {};
                var key = data.boardName + "/" + data.threadNumber;
                var s = subscriptions.get(key);
                if (!s) return;
                s.delete(conn);
                if (s.size < 1) subscriptions.delete(key);
              });
              server.listen((0, _config2.default)("server.port", 8080), function () {
                console.log("[" + process.pid + "] Listening on port " + (0, _config2.default)("server.port", 8080) + "...");
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
                      console.log("[" + process.pid + "] Closed");
                      resolve();
                    });
                  });
                });
                IPC.on('start', function () {
                  return new Promise(function (resolve, reject) {
                    server.listen((0, _config2.default)("server.port", 8080), function () {
                      console.log("[" + process.pid + "] Listening on port " + (0, _config2.default)("server.port", 8080) + "...");
                      resolve();
                    });
                  });
                });
                IPC.on('render', function (data) {
                  var f = _board4.default['' + data.type];
                  if (typeof f != "function") return Promise.reject("Invalid generator function");
                  return f.call(_board4.default, data.key, data.data);
                });
                IPC.on('reloadBoards', function () {
                  _board2.default.initialize();
                  return Promise.resolve();
                });
                IPC.on('reloadConfig', function (data) {
                  if (data) _config2.default.setConfigFile(data);else _config2.default.reload();
                  return Promise.resolve();
                });
                IPC.on('reloadTemplates', function () {
                  return Renderer.reloadTemplates();
                });
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
                  return Promise.resolve(OnlineCounter.unique());
                });
                IPC.send('ready').catch(function (err) {
                  _logger2.default.error(err);
                });
              });
              server.on("connection", function (socket) {
                var socketId = ++nextSocketId;
                sockets[socketId] = socket;
                socket.on("close", function () {
                  delete sockets[socketId];
                });
              });
              _context.next = 28;
              break;

            case 24:
              _context.prev = 24;
              _context.t0 = _context['catch'](5);

              console.log(_context.t0);
              _logger2.default.error(_context.t0.stack || _context.t0);

            case 28:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[5, 24]]);
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
    setTimeout(_asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
      var fileName;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return fileName();

            case 2:
              fileName = _context2.sent;

              resolve(fileName);

            case 4:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
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
  console.log(Tools.translate('Spawning workers, please, wait...'));
  spawnCluster();
  IPC.on('ready', onReady.bind(null, initCallback));
  IPC.on('fileName', generateFileName);
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
  IPC.on('reloadTemplates', _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return Renderer.compileTemplates();

          case 2:
            _context3.next = 4;
            return Renderer.reloadTemplates();

          case 4:
            return _context3.abrupt('return', IPC.send('reloadTemplates'));

          case 5:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
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

if (_cluster2.default.isMaster) {
  _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;
            _context4.next = 3;
            return _nodeCaptcha2.default.removeOldCaptchImages();

          case 3:
            _context4.next = 5;
            return _nodeCaptchaNoscript2.default.removeOldCaptchImages();

          case 5:
            _context4.next = 7;
            return Renderer.compileTemplates();

          case 7:
            _context4.next = 9;
            return Renderer.reloadTemplates();

          case 9:
            if (!(_program2.default.rerender || (0, _config2.default)('system.rerenderCacheOnStartup'))) {
              _context4.next = 17;
              break;
            }

            if (!(_program2.default.archive || (0, _config2.default)('system.rerenderArchive'))) {
              _context4.next = 15;
              break;
            }

            _context4.next = 13;
            return Renderer.rerender();

          case 13:
            _context4.next = 17;
            break;

          case 15:
            _context4.next = 17;
            return Renderer.rerender(['**', '!/*/arch/*']);

          case 17:
            _context4.next = 19;
            return StatisticsModel.generateStatistics();

          case 19:
            _context4.next = 21;
            return Renderer.generateTemplatingJavaScriptFile();

          case 21:
            _context4.next = 23;
            return Renderer.generateCustomJavaScriptFile();

          case 23:
            _context4.next = 25;
            return Renderer.generateCustomCSSFiles();

          case 25:
            spawnWorkers();
            _context4.next = 32;
            break;

          case 28:
            _context4.prev = 28;
            _context4.t0 = _context4['catch'](0);

            _logger2.default.error(_context4.t0.stack || _context4.t0);
            process.exit(1);

          case 32:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 28]]);
  }))();
} else {
  spawnCluster();
}
//# sourceMappingURL=server.js.map
