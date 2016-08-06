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

var _controllers = require('./controllers');

var _controllers2 = _interopRequireDefault(_controllers);

var _middlewares = require('./middlewares');

var _middlewares2 = _interopRequireDefault(_middlewares);

var _renderer = require('./core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _websocketServer = require('./core/websocket-server');

var _websocketServer2 = _interopRequireDefault(_websocketServer);

var _statistics = require('./models/statistics');

var StatisticsModel = _interopRequireWildcard(_statistics);

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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Board = require("./boards/board"); //TODO
var NodeCaptcha = require('./captchas/node-captcha');
var NodeCaptchaNoscript = require('./captchas/node-captcha-noscript');

var BoardsModel = require("./models/board");

var Chat = require("./helpers/chat");

var Database = require("./helpers/database");


_config2.default.installSetHook("site.locale", Tools.setLocale);

function spawnCluster() {
    (0, _expressCluster2.default)(function () {
        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(worker) {
            var app, sockets, nextSocketId, server, ws, subscriptions;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            console.log('[' + process.pid + '] Initializing...');
                            app = (0, _express2.default)();

                            app.use(_middlewares2.default);
                            app.use(_controllers2.default);
                            _context.prev = 4;
                            _context.next = 7;
                            return BoardsModel.initialize();

                        case 7:
                            _context.next = 9;
                            return Renderer.reloadTemplates();

                        case 9:
                            sockets = {};
                            nextSocketId = 0;
                            server = _http2.default.createServer(app);
                            ws = new _websocketServer2.default(server);

                            ws.on("sendChatMessage", function (msg, conn) {
                                var data = msg.data || {};
                                return Chat.sendMessage({
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
                                            Tools.forIn(sockets, function (socket, socketId) {
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
                                IPC.on('doGenerate', function (data) {
                                    var f = BoardsModel['do_' + data.funcName];
                                    if (typeof f != "function") return Promise.reject("Invalid generator function");
                                    return f.call(BoardsModel, data.key, data.data);
                                });
                                IPC.on('reloadBoards', function () {
                                    require("./boards/board").initialize();
                                    return Promise.resolve();
                                });
                                IPC.on('reloadConfig', function (data) {
                                    if (data) _config2.default.setConfigFile(data);else _config2.default.reload();
                                    return Promise.resolve();
                                });
                                IPC.on('reloadTemplates', function () {
                                    return Renderer.reloadTemplates();
                                });
                                IPC.on('notifyAboutNewPosts', function (data) {
                                    Tools.forIn(data, function (_, key) {
                                        var s = subscriptions.get(key);
                                        if (!s) return;
                                        s.forEach(function (conn) {
                                            conn.sendMessage("newPost");
                                        });
                                    });
                                    return Promise.resolve();
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
                            _context.next = 25;
                            break;

                        case 21:
                            _context.prev = 21;
                            _context.t0 = _context['catch'](4);

                            console.log(_context.t0);
                            _logger2.default.error(_context.t0.stack || _context.t0);

                        case 25:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this, [[4, 21]]);
        }));

        return function (_x) {
            return ref.apply(this, arguments);
        };
    }(), {
        count: (0, _config2.default)('system.workerCount'),
        respawn: true
    });
}

function spawnWorkers(initCallback) {
    console.log("Spawning workers, please, wait...");
    spawnCluster();
    var ready = 0;
    IPC.on('ready', function () {
        ++ready;
        if ((0, _config2.default)('system.workerCount') === ready) {
            initCallback();
            if ((0, _config2.default)("server.statistics.enabled", true)) {
                setInterval(function () {
                    StatisticsModel.generateStatistics();
                }, (0, _config2.default)("server.statistics.ttl", 60) * Tools.Minute);
            }
            if ((0, _config2.default)("server.rss.enabled", true)) {
                setInterval(function () {
                    BoardsModel.generateRSS().catch(function (err) {
                        _logger2.default.error(err.stack || err);
                    });
                }, (0, _config2.default)("server.rss.ttl", 60) * Tools.Minute);
            }
            require("./helpers/commands")();
        }
    });
    var lastFileName;
    var fileName = function fileName() {
        var fn = "" + Tools.now().valueOf();
        if (fn != lastFileName) {
            lastFileName = fn;
            return Promise.resolve(fn);
        }
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                fileName().then(function (fn) {
                    resolve(fn);
                });
            }, 1);
        });
    };
    IPC.on('fileName', function () {
        return fileName();
    });
    IPC.on('generate', function (data) {
        return BoardsModel.scheduleGenerate(data.boardName, data.threadNumber, data.postNumber, data.action);
    });
    IPC.on('generateArchive', function (data) {
        return BoardsModel.scheduleGenerateArchive(data);
    });
    IPC.on('stop', function () {
        return IPC.send('stop');
    });
    IPC.on('start', function () {
        return IPC.send('start');
    });
    IPC.on('reloadBoards', function () {
        require("./boards/board").initialize();
        return IPC.send('reloadBoards');
    });
    IPC.on('reloadConfig', function () {
        _config2.default.reload();
        return IPC.send('reloadConfig');
    });
    IPC.on('reloadTemplates', function () {
        return Renderer.compileTemplates().then(function () {
            return IPC.send('reloadTemplates');
        });
    });
    IPC.on('notifyAboutNewPosts', function (data) {
        return IPC.send('notifyAboutNewPosts', data);
    });
    IPC.on('regenerateCache', function (regenerateArchive) {
        if (regenerateArchive) {
            return Renderer.regenerate();
        } else {
            return Renderer.regenerate(Tools.ARCHIVE_PATHS_REGEXP, true);
        }
    });
}

if (_cluster2.default.isMaster) {
    _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var initCallback;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.prev = 0;

                        Board.initialize();
                        _context2.next = 4;
                        return NodeCaptcha.removeOldCaptchImages();

                    case 4:
                        _context2.next = 6;
                        return NodeCaptchaNoscript.removeOldCaptchImages();

                    case 6:
                        _context2.next = 8;
                        return Database.initialize();

                    case 8:
                        initCallback = _context2.sent;
                        _context2.next = 11;
                        return Renderer.compileTemplates();

                    case 11:
                        _context2.next = 13;
                        return Renderer.reloadTemplates();

                    case 13:
                        if (!(_program2.default.regenerate || (0, _config2.default)('system.regenerateCacheOnStartup'))) {
                            _context2.next = 21;
                            break;
                        }

                        if (!(_program2.default.archive || (0, _config2.default)('system.regenerateArchive'))) {
                            _context2.next = 19;
                            break;
                        }

                        _context2.next = 17;
                        return Rengerer.rerender();

                    case 17:
                        _context2.next = 21;
                        break;

                    case 19:
                        _context2.next = 21;
                        return Rengerer.rerender(Tools.ARCHIVE_PATHS_REGEXP, true);

                    case 21:
                        _context2.next = 23;
                        return StatisticsModel.generateStatistics();

                    case 23:
                        _context2.next = 25;
                        return Renderer.generateTemplatingJavaScriptFile();

                    case 25:
                        _context2.next = 27;
                        return Renderer.generateCustomJavaScriptFile();

                    case 27:
                        _context2.next = 29;
                        return Renderer.generateCustomCSSFiles();

                    case 29:
                        spawnWorkers(initCallback);
                        _context2.next = 36;
                        break;

                    case 32:
                        _context2.prev = 32;
                        _context2.t0 = _context2['catch'](0);

                        _logger2.default.error(_context2.t0.stack || _context2.t0);
                        process.exit(1);

                    case 36:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this, [[0, 32]]);
    }))();
} else {
    Board.initialize();
    spawnCluster();
}
//# sourceMappingURL=server.js.map
