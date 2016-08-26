#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import _ from 'underscore';
import Cluster from 'cluster';
import express from 'express';
import expressCluster from 'express-cluster';
import HTTP from 'http';

import Board from './boards/board';
import Captcha from './captchas/captcha';
import NodeCaptcha from './captchas/node-captcha';
import NodeCaptchaNoscript from './captchas/node-captcha-noscript';
import commands from './commands';
import controllers from './controllers';
import BoardController from './controllers/board';
import geolocation from './core/geolocation';
import * as Renderer from './core/renderer';
import WebSocketServer from './core/websocket-server';
import config from './helpers/config';
import * as IPC from './helpers/ipc';
import Logger from './helpers/logger';
import * as OnlineCounter from './helpers/online-counter';
import Program from './helpers/program';
import * as Tools from './helpers/tools';
import middlewares from './middlewares';
import * as BoardsModel from './models/boards';
import * as ChatsModel from './models/chats';
import * as StatisticsModel from './models/statistics';
import * as UsersModel from './models/users';

function spawnCluster() {
  expressCluster(async function(worker) {
    console.log(`[${process.pid}] Initializing…`);
    let app = express();
    app.use(middlewares);
    app.use(controllers);
    try {
      await geolocation.initialize();
      await BoardsModel.initialize();
      await Renderer.reloadTemplates();
      var sockets = {};
      var nextSocketId = 0;
      var server = HTTP.createServer(app);
      var ws = new WebSocketServer(server);
      ws.on("sendChatMessage", function(msg, conn) {
          var data = msg.data || {};
          return Chats.sendMessage({ //TODO
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
          console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "…");
          IPC.on('exit', function(status) {
              process.exit(status);
          });
          IPC.on('stop', function() {
              return new Promise(function(resolve, reject) {
                  server.close(function() {
                      _(sockets).each((socket, socketId) => {
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
                          + "…");
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
              Board.initialize();
              return Promise.resolve();
          });
          IPC.on('reloadTemplates', function() {
            return Renderer.reloadTemplates();
          });
          IPC.on('notifyAboutNewPosts', (keys) => {
            _(keys).each((_1, key) => {
              let s = subscriptions.get(key);
              if (!s) {
                return;
              }
              s.forEach((conn) => {
                conn.sendMessage('newPost');
              });
            });
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
  //TODO: May throw error
  if (!onReady.ready) {
    onReady.ready = 0;
  }
  ++onReady.ready;
  if (config('system.workerCount') === onReady.ready) {
    UsersModel.initializeUserBansMonitoring();
    if (config('server.statistics.enabled')) {
      setInterval(StatisticsModel.generateStatistics.bind(StatisticsModel),
        config('server.statistics.ttl') * Tools.MINUTE);
    }
    if (config('server.rss.enabled')) {
      setInterval(BoardController.renderRSS.bind(BoardController), config('server.rss.ttl') * Tools.MINUTE);
    }
    commands();
  }
}

function spawnWorkers(initCallback) {
  console.log(Tools.translate('Spawning workers, please, wait…'));
  spawnCluster();
  IPC.on('ready', onReady.bind(null, initCallback));
  IPC.on('fileName', generateFileName);
  IPC.on('render', (data) => {
    return IPC.render(data.boardName, data.threadNumber, data.postNumber, data.action);
  });
  IPC.on('renderArchive', (data) => { //TODO
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
  let hasNewPosts = {};
  setInterval(() => {
    if (_(hasNewPosts).isEmpty()) {
      return;
    }
    IPC.send('notifyAboutNewPosts', hasNewPosts).catch((err) => {
      Logger.error(err.stack || err);
    });
    hasNewPosts = {};
  }, Tools.SECOND);
  IPC.on('notifyAboutNewPosts', (key) => {
    hasNewPosts[key] = 1;
  });
  IPC.on('rerenderCache', (rerenderArchive) => {
    if (rerenderArchive) {
      return Renderer.rerender();
    } else {
      //return Renderer.rerender(Tools.ARCHIVE_PATHS_REGEXP, true);
    }
  });
}

Board.initialize();
Captcha.initialize();
controllers.initialize();

if (Cluster.isMaster) {
  (async function() {
    try {
      await NodeCaptcha.removeOldCaptchImages();
      await NodeCaptchaNoscript.removeOldCaptchImages();
      await Renderer.compileTemplates();
      await Renderer.reloadTemplates();
      if (Program.rerender || config('system.rerenderCacheOnStartup')) {
        if (Program.archive || config('system.rerenderArchive')) { //TODO
          await Renderer.rerender();
        } else {
          await Renderer.rerender(['**', '!/*/arch/*']);
        }
      }
      await StatisticsModel.generateStatistics();
      await Renderer.generateTemplatingJavaScriptFile();
      await Renderer.generateCustomJavaScriptFile();
      await Renderer.generateCustomCSSFiles();
      spawnWorkers();
    } catch (err) {
      Logger.error(err.stack || err);
      process.exit(1);
    }
  })();
} else {
  spawnCluster();
}
