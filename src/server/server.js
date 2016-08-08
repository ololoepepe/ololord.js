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
var BoardController = require("./controllers/board");
import controllers from './controllers';
import middlewares from './middlewares';
import commands from './core/commands';
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
          IPC.on('render', function(data) {
              var f = BoardController[`${data.type}`];
              if (typeof f != "function")
                  return Promise.reject("Invalid generator function");
              return f.call(BoardController, data.key, data.data);
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

function generateFileName() {
  let fileName = _.now().toString();
  if (fileName != generateFileName.lastFileName) {
    generateFileName.lastFileName = fileName;
    return fileName;
  }
  return new Promise((resolve) => {
    setTimeout(async function() {
      let fileName = await fileName();
      resolve(fileName);
    }, 1);
  });
}

function onReady(initCallback) {
  if (!onReady.ready) {
    onReady.ready = 0;
  }
  ++onReady.ready;
  if (config('system.workerCount') === onReady.ready) {
    initCallback();
    if (config('server.statistics.enabled')) {
      setInterval(StatisticsModel.generateStatistics.bind(StatisticsModel),
        config('server.statistics.ttl') * Tools.Minute);
    }
    if (config('server.rss.enabled')) {
      setInterval(BoardsModel.generateRSS.bind(BoardsModel), config('server.rss.ttl') * Tools.Minute);
    }
    commands();
  }
}

function spawnWorkers(initCallback) {
  console.log(Tools.translate('Spawning workers, please, wait...'));
  spawnCluster();
  IPC.on('ready', onReady.bind(null, initCallback));
  IPC.on('fileName', generateFileName);
  IPC.on('render', (data) => {
    return IPC.render(data.boardName, data.threadNumber, data.postNumber, data.action);
  });
  IPC.on('renderArchive', (data) => {
    return IPC.renderArchive(data);
  });
  IPC.on('stop', () => {
    return IPC.send('stop');
  });
  IPC.on('start', () => {
    return IPC.send('start');
  });
  IPC.on('reloadBoards', () => {
    Board.initialize();
    return IPC.send('reloadBoards');
  });
  IPC.on('reloadTemplates', async function() {
    await Renderer.compileTemplates();
    await Renderer.reloadTemplates();
    return IPC.send('reloadTemplates');
  });
  IPC.on('notifyAboutNewPosts', (data) => {
    return IPC.send('notifyAboutNewPosts', data);
  });
  IPC.on('rerenderCache', (rerenderArchive) => {
    if (rerenderArchive) {
      return Renderer.rerender();
    } else {
      return Renderer.rerender(Tools.ARCHIVE_PATHS_REGEXP, true);
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
      if (Program.rerender || config('system.rerenderCacheOnStartup')) {
        if (Program.archive || config('system.rerenderArchive')) {
          await Renderer.rerender();
        } else {
          await Renderer.rerender(['**', '!/*/archive', '!/*/arch/*']);
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
