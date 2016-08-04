#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var removeOldCaptchImages = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var CAPTCHA_PATHS;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        _context3.prev = 0;
                        CAPTCHA_PATHS = [__dirname + '/public/node-captcha', __dirname + '/tmp/node-captcha-noscript'];
                        _context3.next = 4;
                        return Tools.series(CAPTCHA_PATHS, function () {
                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(path) {
                                var fileNames;
                                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                    while (1) {
                                        switch (_context2.prev = _context2.next) {
                                            case 0:
                                                _context2.next = 2;
                                                return _fs2.default.list(path);

                                            case 2:
                                                fileNames = _context2.sent;
                                                _context2.next = 5;
                                                return Tools.series(fileNames.filter(function (fileName) {
                                                    var _fileName$split = fileName.split('.');

                                                    var _fileName$split2 = _slicedToArray(_fileName$split, 2);

                                                    var name = _fileName$split2[0];
                                                    var suffix = _fileName$split2[1];

                                                    return 'png' === suffix && /^[0-9]+$/.test(name);
                                                }), function () {
                                                    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(fileName) {
                                                        return regeneratorRuntime.wrap(function _callee$(_context) {
                                                            while (1) {
                                                                switch (_context.prev = _context.next) {
                                                                    case 0:
                                                                        _context.next = 2;
                                                                        return _fs2.default.remove(path + '/' + fileName);

                                                                    case 2:
                                                                        return _context.abrupt('return', _context.sent);

                                                                    case 3:
                                                                    case 'end':
                                                                        return _context.stop();
                                                                }
                                                            }
                                                        }, _callee, this);
                                                    }));

                                                    return function (_x2) {
                                                        return ref.apply(this, arguments);
                                                    };
                                                }());

                                            case 5:
                                            case 'end':
                                                return _context2.stop();
                                        }
                                    }
                                }, _callee2, this);
                            }));

                            return function (_x) {
                                return ref.apply(this, arguments);
                            };
                        }());

                    case 4:
                        _context3.next = 9;
                        break;

                    case 6:
                        _context3.prev = 6;
                        _context3.t0 = _context3['catch'](0);

                        Global.error(_context3.t0.stack || _context3.t0);

                    case 9:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this, [[0, 6]]);
    }));

    return function removeOldCaptchImages() {
        return ref.apply(this, arguments);
    };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _expressCluster = require('express-cluster');

var _expressCluster2 = _interopRequireDefault(_expressCluster);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _statistics = require('./models/statistics');

var StatisticsModel = _interopRequireWildcard(_statistics);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Board = require("./boards/board");
var config = require("./helpers/config");
var controller = require("./helpers/controller");
var Global = require("./helpers/global");
var BoardModel = require("./models/board");
var Database = require("./helpers/database");
var OnlineCounter = require("./helpers/online-counter");
var Tools = require("./helpers/tools");
var WebSocket = require("./helpers/websocket");

var count = config("system.workerCount", _os2.default.cpus().length);
if (count <= 0) count = _os2.default.cpus().length;

var spawnCluster = function spawnCluster() {
    (0, _expressCluster2.default)(function (worker) {
        console.log("[" + process.pid + "] Initializing...");

        var express = require("express");

        var Chat = require("./helpers/chat");
        var controller = require("./helpers/controller");

        var app = express();

        app.use(require("./middlewares"));
        app.use("/redirect", function (req, res, next) {
            if (!req.query.source) return next();
            res.redirect(307, "/" + config("site.pathPrefix", "") + req.query.source.replace(/^\//, ""));
        });
        app.use(require("./controllers"));
        app.use("*", function (req, res, next) {
            var err = new Error();
            err.status = 404;
            err.path = req.baseUrl;
            next(err);
        });
        app.use(function (err, req, res, next) {
            switch (err.status) {
                case 404:
                    Global.error(Tools.preferIPv4(req.ip), err.path, 404);
                    res.status(404).sendFile("notFound.html", { root: __dirname + "/public" });
                    break;
                default:
                    Global.error(Tools.preferIPv4(req.ip), req.path, err.stack || err);
                    var model = {};
                    if (err.ban) {
                        model.title = Tools.translate("Ban", "pageTitle");
                        model.ban = err.ban;
                    } else {
                        model.title = Tools.translate("Error", "pageTitle");
                        if ((0, _underscore2.default)(err).isError()) {
                            model.errorMessage = Tools.translate("Internal error", "errorMessage");
                            model.errorDescription = err.message;
                        } else if (err.error) {
                            model.errorMessage = error.description ? err.error : Tools.translate("Error", "errorMessage");
                            model.errorDescription = err.description || err.error;
                        } else {
                            model.errorMessage = Tools.translate("Error", "errorMessage");
                            model.errorDescription = typeof err === 'string' ? err : "";
                        }
                    }
                    res.json(model);
                    break;
            }
        });

        BoardModel.initialize().then(function () {
            return controller.initialize();
        }).then(function () {
            var sockets = {};
            var nextSocketId = 0;
            var server = _http2.default.createServer(app);
            var ws = new WebSocket(server);
            ws.installHandler("sendChatMessage", function (msg, conn) {
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
            var subscriptions = new Map();
            ws.installHandler("subscribeToThreadUpdates", function (msg, conn) {
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
            ws.installHandler("unsubscribeFromThreadUpdates", function (msg, conn) {
                var data = msg.data || {};
                var key = data.boardName + "/" + data.threadNumber;
                var s = subscriptions.get(key);
                if (!s) return;
                s.delete(conn);
                if (s.size < 1) subscriptions.delete(key);
            });
            server.listen(config("server.port", 8080), function () {
                console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
                Global.IPC.installHandler("exit", function (status) {
                    process.exit(status);
                });
                Global.IPC.installHandler("stop", function () {
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
                Global.IPC.installHandler("start", function () {
                    return new Promise(function (resolve, reject) {
                        server.listen(config("server.port", 8080), function () {
                            console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
                            resolve();
                        });
                    });
                });
                Global.IPC.installHandler("doGenerate", function (data) {
                    var f = BoardModel['do_' + data.funcName];
                    if (typeof f != "function") return Promise.reject("Invalid generator function");
                    return f.call(BoardModel, data.key, data.data);
                });
                Global.IPC.installHandler("reloadBoards", function () {
                    require("./boards/board").initialize();
                    return Promise.resolve();
                });
                Global.IPC.installHandler("reloadConfig", function (data) {
                    if (data) config.setConfigFile(data);else config.reload();
                    return Promise.resolve();
                });
                Global.IPC.installHandler("reloadTemplates", function () {
                    return controller.initialize();
                });
                Global.IPC.installHandler("notifyAboutNewPosts", function (data) {
                    Tools.forIn(data, function (_, key) {
                        var s = subscriptions.get(key);
                        if (!s) return;
                        s.forEach(function (conn) {
                            conn.sendMessage("newPost");
                        });
                    });
                    return Promise.resolve();
                });
                Global.IPC.installHandler("getConnectionIPs", function () {
                    return Promise.resolve(OnlineCounter.unique());
                });
                Global.IPC.send("ready").catch(function (err) {
                    Global.error(err);
                });
            });
            server.on("connection", function (socket) {
                var socketId = ++nextSocketId;
                sockets[socketId] = socket;
                socket.on("close", function () {
                    delete sockets[socketId];
                });
            });
        }).catch(function (err) {
            Global.error(err);
        });
    }, {
        count: count,
        respawn: true
    });
};

function spawnWorkers(initCallback) {
    console.log("Spawning workers, please, wait...");
    spawnCluster();
    var ready = 0;
    Global.IPC.installHandler("ready", function () {
        ++ready;
        if (ready == count) {
            initCallback();
            if (config("server.statistics.enabled", true)) {
                setInterval(function () {
                    StatisticsModel.generateStatistics();
                }, config("server.statistics.ttl", 60) * Tools.Minute);
            }
            if (config("server.rss.enabled", true)) {
                setInterval(function () {
                    BoardModel.generateRSS().catch(function (err) {
                        Global.error(err.stack || err);
                    });
                }, config("server.rss.ttl", 60) * Tools.Minute);
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
    Global.IPC.installHandler("fileName", function () {
        return fileName();
    });
    Global.IPC.installHandler("generate", function (data) {
        return BoardModel.scheduleGenerate(data.boardName, data.threadNumber, data.postNumber, data.action);
    });
    Global.IPC.installHandler("generateArchive", function (data) {
        return BoardModel.scheduleGenerateArchive(data);
    });
    Global.IPC.installHandler("stop", function () {
        return Global.IPC.send("stop");
    });
    Global.IPC.installHandler("start", function () {
        return Global.IPC.send("start");
    });
    Global.IPC.installHandler("reloadBoards", function () {
        require("./boards/board").initialize();
        return Global.IPC.send("reloadBoards");
    });
    Global.IPC.installHandler("reloadConfig", function () {
        config.reload();
        return Global.IPC.send("reloadConfig");
    });
    Global.IPC.installHandler("reloadTemplates", function () {
        return controller.compileTemplates().then(function () {
            return Global.IPC.send("reloadTemplates");
        });
    });
    Global.IPC.installHandler("notifyAboutNewPosts", function (data) {
        return Global.IPC.send("notifyAboutNewPosts", data);
    });
    Global.IPC.installHandler("regenerateCache", function (regenerateArchive) {
        return controller.regenerate(regenerateArchive);
    });
}

exports.default = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var initCallback;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.prev = 0;

                        Board.initialize();
                        _context4.next = 4;
                        return removeOldCaptchImages();

                    case 4:
                        _context4.next = 6;
                        return Database.initialize();

                    case 6:
                        initCallback = _context4.sent;
                        _context4.next = 9;
                        return controller.compileTemplates();

                    case 9:
                        _context4.next = 11;
                        return controller.initialize();

                    case 11:
                        if (!(Global.Program.regenerate || config('system.regenerateCacheOnStartup'))) {
                            _context4.next = 16;
                            break;
                        }

                        _context4.next = 14;
                        return controller.regenerate(Global.Program.archive || config('system.regenerateArchive'));

                    case 14:
                        _context4.next = 24;
                        break;

                    case 16:
                        _context4.next = 18;
                        return StatisticsModel.generateStatistics();

                    case 18:
                        _context4.next = 20;
                        return controller.generateTemplatingJavaScriptFile();

                    case 20:
                        _context4.next = 22;
                        return controller.checkCustomJavaScriptFileExistence();

                    case 22:
                        _context4.next = 24;
                        return controller.checkCustomCSSFilesExistence();

                    case 24:
                        spawnWorkers(initCallback);
                        _context4.next = 31;
                        break;

                    case 27:
                        _context4.prev = 27;
                        _context4.t0 = _context4['catch'](0);

                        Global.error(_context4.t0.stack || _context4.t0);
                        process.exit(1);

                    case 31:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[0, 27]]);
    }));

    function initializeMaster() {
        return ref.apply(this, arguments);
    }

    return initializeMaster;
}();
//# sourceMappingURL=master.js.map
