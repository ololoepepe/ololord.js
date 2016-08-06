#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import _ from 'underscore';
import Cluster from 'cluster';
import express from 'express';
import expressCluster from 'express-cluster';
import HTTP from 'http';

var Board = require("./boards/board"); //TODO
var NodeCaptcha = require('./captchas/node-captcha');
var NodeCaptchaNoscript = require('./captchas/node-captcha-noscript');
import controllers from './controllers';
import middlewares from './middlewares';
import * as Renderer from './core/renderer';
import WebSocketServer from './core/websocket-server';
var BoardsModel = require("./models/board");
import * as StatisticsModel from './models/statistics';
var Chat = require("./helpers/chat");
import config from './helpers/config';
var Database = require("./helpers/database");
import * as IPC from './helpers/ipc';
import Logger from './helpers/logger';
import * as OnlineCounter from './helpers/online-counter';
import Program from './helpers/program';
import * as Tools from './helpers/tools';

config.installSetHook("site.locale", Tools.setLocale);

function spawnCluster() {
  expressCluster(async function(worker) {
    console.log(`[${process.pid}] Initializing...`);
    let app = express();
    app.use(middlewares);
    app.use(controllers);
    try {
      await BoardsModel.initialize();
      await Renderer.reloadTemplates();
      var sockets = {};
      var nextSocketId = 0;
      var server = HTTP.createServer(app);
      var ws = new WebSocketServer(server);
      ws.on("sendChatMessage", function(msg, conn) {
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
      ws.on("subscribeToThreadUpdates", function(msg, conn) {
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
      ws.on("unsubscribeFromThreadUpdates", function(msg, conn) {
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
          IPC.on('exit', function(status) {
              process.exit(status);
          });
          IPC.on('stop', function() {
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
          IPC.on('start', function() {
              return new Promise(function(resolve, reject) {
                  server.listen(config("server.port", 8080), function() {
                      console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080)
                          + "...");
                      resolve();
                  });
              });
          });
          IPC.on('doGenerate', function(data) {
              var f = BoardsModel[`do_${data.funcName}`];
              if (typeof f != "function")
                  return Promise.reject("Invalid generator function");
              return f.call(BoardsModel, data.key, data.data);
          });
          IPC.on('reloadBoards', function() {
              require("./boards/board").initialize();
              return Promise.resolve();
          });
          IPC.on('reloadConfig', function(data) {
              if (data)
                  config.setConfigFile(data);
              else
                  config.reload();
              return Promise.resolve();
          });
          IPC.on('reloadTemplates', function() {
            return Renderer.reloadTemplates();
          });
          IPC.on('notifyAboutNewPosts', function(data) {
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
          IPC.on('getConnectionIPs', function() {
              return Promise.resolve(OnlineCounter.unique());
          });
          IPC.send('ready').catch(function(err) {
              Logger.error(err);
          });
      });
      server.on("connection", function(socket) {
          var socketId = ++nextSocketId;
          sockets[socketId] = socket;
          socket.on("close", function() {
              delete sockets[socketId];
          });
      });
    } catch (err) {
      console.log(err);
      Logger.error(err.stack || err);
    }
  }, {
    count: config('system.workerCount'),
    respawn: true
  });
}

function spawnWorkers(initCallback) {
  console.log("Spawning workers, please, wait...");
  spawnCluster();
  var ready = 0;
  IPC.on('ready', function() {
      ++ready;
      if (config('system.workerCount') === ready) {
          initCallback();
          if (config("server.statistics.enabled", true)) {
              setInterval(function() {
                StatisticsModel.generateStatistics();
              }, config("server.statistics.ttl", 60) * Tools.Minute);
          }
          if (config("server.rss.enabled", true)) {
              setInterval(function() {
                  BoardsModel.generateRSS().catch(function(err) {
                      Logger.error(err.stack || err);
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
  IPC.on('fileName', function() {
      return fileName();
  });
  IPC.on('generate', function(data) {
      return BoardsModel.scheduleGenerate(data.boardName, data.threadNumber, data.postNumber, data.action);
  });
  IPC.on('generateArchive', function(data) {
      return BoardsModel.scheduleGenerateArchive(data);
  });
  IPC.on('stop', function() {
      return IPC.send('stop');
  });
  IPC.on('start', function() {
      return IPC.send('start');
  });
  IPC.on('reloadBoards', function() {
      require("./boards/board").initialize();
      return IPC.send('reloadBoards');
  });
  IPC.on('reloadConfig', function() {
      config.reload();
      return IPC.send('reloadConfig');
  });
  IPC.on('reloadTemplates', function() {
      return Renderer.compileTemplates().then(function() {
        return IPC.send('reloadTemplates');
      });
  });
  IPC.on('notifyAboutNewPosts', function(data) {
      return IPC.send('notifyAboutNewPosts', data);
  });
  IPC.on('regenerateCache', function(regenerateArchive) {
    if (regenerateArchive) {
      return Renderer.regenerate();
    } else {
      return Renderer.regenerate(Tools.ARCHIVE_PATHS_REGEXP, true);
    }
  });
}

if (Cluster.isMaster) {
  (async function() {
    try {
      Board.initialize();
      await NodeCaptcha.removeOldCaptchImages();
      await NodeCaptchaNoscript.removeOldCaptchImages();
      let initCallback = await Database.initialize();
      await Renderer.compileTemplates();
      await Renderer.reloadTemplates();
      if (Program.regenerate || config('system.regenerateCacheOnStartup')) {
        if (Program.archive || config('system.regenerateArchive')) {
          await Rengerer.rerender();
        } else {
          await Rengerer.rerender(Tools.ARCHIVE_PATHS_REGEXP, true);
        }
      }
      await StatisticsModel.generateStatistics();
      await Renderer.generateTemplatingJavaScriptFile();
      await Renderer.generateCustomJavaScriptFile();
      await Renderer.generateCustomCSSFiles();
      spawnWorkers(initCallback);
    } catch (err) {
      Logger.error(err.stack || err);
      process.exit(1);
    }
  })();
} else {
  Board.initialize();
  spawnCluster();
}
