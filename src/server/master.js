#!/usr/bin/env node

import _ from 'underscore';
import Cluster from 'cluster';
import expressCluster from 'express-cluster';
import FS from 'q-io/fs';
import HTTP from 'http';
import OS from 'os';

import * as StatisticsModel from './models/statistics';

var Board = require("./boards/board");
var config = require("./helpers/config");
var controller = require("./helpers/controller");
var Global = require("./helpers/global");
var BoardModel = require("./models/board");
var Database = require("./helpers/database");
var OnlineCounter = require("./helpers/online-counter");
var Tools = require("./helpers/tools");
var WebSocket = require("./helpers/websocket");

var count = config("system.workerCount", OS.cpus().length);
if (count <= 0)
    count = OS.cpus().length;

var spawnCluster = function() {
    expressCluster(function(worker) {
        console.log("[" + process.pid + "] Initializing...");

        var express = require("express");

        var Chat = require("./helpers/chat");
        var controller = require("./helpers/controller");

        var app = express();

        app.use(require("./middlewares"));
        app.use("/redirect", function(req, res, next) {
            if (!req.query.source)
                return next();
            res.redirect(307, "/" + config("site.pathPrefix", "") + req.query.source.replace(/^\//, ""));
        });
        app.use(require("./controllers"));
        app.use("*", function(req, res, next) {
            var err = new Error();
            err.status = 404;
            err.path = req.baseUrl;
            next(err);
        });
        app.use(function(err, req, res, next) {
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
                    if (_(err).isError()) {
                        model.errorMessage = Tools.translate("Internal error", "errorMessage");
                        model.errorDescription = err.message;
                    } else if (err.error) {
                        model.errorMessage = error.description ? err.error
                            : Tools.translate("Error", "errorMessage");
                        model.errorDescription = err.description || err.error;
                    } else {
                        model.errorMessage = Tools.translate("Error", "errorMessage");
                        model.errorDescription = (typeof err === 'string') ? err : "";
                    }
                }
                res.json(model);
                break;
            }
        });

        BoardModel.initialize().then(function() {
            return controller.initialize();
        }).then(function() {
            var sockets = {};
            var nextSocketId = 0;
            var server = HTTP.createServer(app);
            var ws = new WebSocket(server);
            ws.installHandler("sendChatMessage", function(msg, conn) {
                var data = msg.data || {};
                return Chat.sendMessage({
                    ip: conn.ip,
                    hashpass: conn.hashpass
                }, data.boardName, data.postNumber, data.text, ws).then(function(result) {
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
            ws.installHandler("subscribeToThreadUpdates", function(msg, conn) {
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
            ws.installHandler("unsubscribeFromThreadUpdates", function(msg, conn) {
                var data = msg.data || {};
                var key = data.boardName + "/" + data.threadNumber;
                var s = subscriptions.get(key);
                if (!s)
                    return;
                s.delete(conn);
                if (s.size < 1)
                    subscriptions.delete(key);
            });
            server.listen(config("server.port", 8080), function() {
                console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
                Global.IPC.installHandler("exit", function(status) {
                    process.exit(status);
                });
                Global.IPC.installHandler("stop", function() {
                    return new Promise(function(resolve, reject) {
                        server.close(function() {
                            Tools.forIn(sockets, function(socket, socketId) {
                                delete sockets[socketId];
                                socket.destroy();
                            });
                            OnlineCounter.clear();
                            console.log("[" + process.pid + "] Closed");
                            resolve();
                        });
                    });
                });
                Global.IPC.installHandler("start", function() {
                    return new Promise(function(resolve, reject) {
                        server.listen(config("server.port", 8080), function() {
                            console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080)
                                + "...");
                            resolve();
                        });
                    });
                });
                Global.IPC.installHandler("doGenerate", function(data) {
                    var f = BoardModel[`do_${data.funcName}`];
                    if (typeof f != "function")
                        return Promise.reject("Invalid generator function");
                    return f.call(BoardModel, data.key, data.data);
                });
                Global.IPC.installHandler("reloadBoards", function() {
                    require("./boards/board").initialize();
                    return Promise.resolve();
                });
                Global.IPC.installHandler("reloadConfig", function(data) {
                    if (data)
                        config.setConfigFile(data);
                    else
                        config.reload();
                    return Promise.resolve();
                });
                Global.IPC.installHandler("reloadTemplates", function() {
                    return controller.initialize();
                });
                Global.IPC.installHandler("notifyAboutNewPosts", function(data) {
                    Tools.forIn(data, function(_, key) {
                        var s = subscriptions.get(key);
                        if (!s)
                            return;
                        s.forEach(function(conn) {
                            conn.sendMessage("newPost");
                        });
                    });
                    return Promise.resolve();
                });
                Global.IPC.installHandler("getConnectionIPs", function() {
                    return Promise.resolve(OnlineCounter.unique());
                });
                Global.IPC.send("ready").catch(function(err) {
                    Global.error(err);
                });
            });
            server.on("connection", function(socket) {
                var socketId = ++nextSocketId;
                sockets[socketId] = socket;
                socket.on("close", function() {
                    delete sockets[socketId];
                });
            });
        }).catch(function(err) {
            Global.error(err);
        });
    }, {
        count: count,
        respawn: true
    });
};

async function removeOldCaptchImages() {
  try {
    const CAPTCHA_PATHS = [`${__dirname}/public/node-captcha`, `${__dirname}/tmp/node-captcha-noscript`];
    await Tools.series(CAPTCHA_PATHS, async function(path) {
      let fileNames = await FS.list(path);
      await Tools.series(fileNames.filter((fileName) => {
        let [name, suffix] = fileName.split('.');
        return 'png' === suffix && /^[0-9]+$/.test(name);
      }), async function(fileName) {
        return await FS.remove(`${path}/${fileName}`);
      });
    });
  } catch (err) {
    Global.error(err.stack || err);
  }
}

function spawnWorkers(initCallback) {
  console.log("Spawning workers, please, wait...");
  spawnCluster();
  var ready = 0;
  Global.IPC.installHandler("ready", function() {
      ++ready;
      if (ready == count) {
          initCallback();
          if (config("server.statistics.enabled", true)) {
              setInterval(function() {
                StatisticsModel.generateStatistics();
              }, config("server.statistics.ttl", 60) * Tools.Minute);
          }
          if (config("server.rss.enabled", true)) {
              setInterval(function() {
                  BoardModel.generateRSS().catch(function(err) {
                      Global.error(err.stack || err);
                  });
              }, config("server.rss.ttl", 60) * Tools.Minute);
          }
          require("./helpers/commands")();
      }
  });
  var lastFileName;
  var fileName = function() {
      var fn = "" + Tools.now().valueOf();
      if (fn != lastFileName) {
          lastFileName = fn;
          return Promise.resolve(fn);
      }
      return new Promise(function(resolve, reject) {
          setTimeout(function() {
              fileName().then(function(fn) {
                  resolve(fn);
              });
          }, 1);
      });
  };
  Global.IPC.installHandler("fileName", function() {
      return fileName();
  });
  Global.IPC.installHandler("generate", function(data) {
      return BoardModel.scheduleGenerate(data.boardName, data.threadNumber, data.postNumber, data.action);
  });
  Global.IPC.installHandler("generateArchive", function(data) {
      return BoardModel.scheduleGenerateArchive(data);
  });
  Global.IPC.installHandler("stop", function() {
      return Global.IPC.send("stop");
  });
  Global.IPC.installHandler("start", function() {
      return Global.IPC.send("start");
  });
  Global.IPC.installHandler("reloadBoards", function() {
      require("./boards/board").initialize();
      return Global.IPC.send("reloadBoards");
  });
  Global.IPC.installHandler("reloadConfig", function() {
      config.reload();
      return Global.IPC.send("reloadConfig");
  });
  Global.IPC.installHandler("reloadTemplates", function() {
      return controller.compileTemplates().then(function() {
        return Global.IPC.send("reloadTemplates");
      });
  });
  Global.IPC.installHandler("notifyAboutNewPosts", function(data) {
      return Global.IPC.send("notifyAboutNewPosts", data);
  });
  Global.IPC.installHandler("regenerateCache", function(regenerateArchive) {
      return controller.regenerate(regenerateArchive);
  });
}

export default async function initializeMaster() {
  try {
    Board.initialize();
    await removeOldCaptchImages();
    let initCallback = await Database.initialize();
    await controller.compileTemplates();
    await controller.initialize(); //TODO: initialize renderer
    if (Global.Program.regenerate || config('system.regenerateCacheOnStartup')) {
      //TODO: regenerate somewhere else
      await controller.regenerate(Global.Program.archive || config('system.regenerateArchive'));
    } else {
      await StatisticsModel.generateStatistics();
      await controller.generateTemplatingJavaScriptFile();
      await controller.checkCustomJavaScriptFileExistence();
      await controller.checkCustomCSSFilesExistence();
    }
    spawnWorkers(initCallback);
  } catch (err) {
    Global.error(err.stack || err);
    process.exit(1);
  }
}
