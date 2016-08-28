#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import _ from 'underscore';
import Cluster from 'cluster';
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
import * as BoardsModel from './models/boards';
import * as ChatsModel from './models/chats';
import * as StatisticsModel from './models/statistics';
import * as UsersModel from './models/users';

function spawnCluster() {
  expressCluster(async function(worker) {
    console.log(`[${process.pid}] Initializing…`);
    try {
      await geolocation.initialize();
      await BoardsModel.initialize();
      await Renderer.reloadTemplates();
      let sockets = {};
      let nextSocketId = 0;
      let server = HTTP.createServer(controllers);
      let ws = new WebSocketServer(server);
      ws.on('sendChatMessage', async function(msg, conn) {
        let data = msg.data || {};
        let { message, chatNumber, senderHash, receiverHash, receiver } = await ChatsModel.addChatMessage({
          user: conn,
          boardName: data.boardName,
          postNumber: data.postNumber,
          chatNumber: data.chatNumber,
          text: data.text
        });
        if (senderHash !== receiverHash) {
          message.type = 'in';
          let ip = receiver.hashpass ? null : receiver.ip;
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
        return {
          message: message,
          chatNumber: chatNumber
        };
      });
      let subscriptions = new Map();
      ws.on('subscribeToThreadUpdates', (msg, conn) => {
        let { boardName, threadNumber } = msg.data || {};
        let key = `${boardName}/${threadNumber}`;
        if (subscriptions.has(key)) {
          subscriptions.get(key).add(conn);
        } else {
          let s = new Set();
          s.add(conn);
          subscriptions.set(key, s);
        }
      });
      ws.on('unsubscribeFromThreadUpdates', (msg, conn) => {
        let { boardName, threadNumber } = msg.data || {};
        let key = `${boardName}/${threadNumber}`;
        let s = subscriptions.get(key);
        if (!s) {
          return;
        }
        s.delete(conn);
        if (s.size < 1) {
          subscriptions.delete(key);
        }
      });
      server.listen(config('server.port'), () => {
        console.log(`[${process.pid}] Listening on port ${config('server.port')}…`);
        IPC.on('exit', (status) => { process.exit(status); });
        IPC.on('stop', () => {
          return new Promise((resolve, reject) => {
            server.close(() => {
              _(sockets).each((socket, socketId) => {
                delete sockets[socketId];
                socket.destroy();
              });
              OnlineCounter.clear();
              console.log(`[${process.pid}] Closed`);
              resolve();
            });
          });
        });
        IPC.on('start', () => {
          return new Promise((resolve, reject) => {
            server.listen(config('server.port'), () => {
              console.log(`[${process.pid}] Listening on port ${config('server.port')}…`);
              resolve();
            });
          });
        });
        IPC.on('sendChatMessage', ({ type, message, ips, hashpasses } = {}) => {
          ws.sendMessage(type, message, ips, hashpasses);
        });
        IPC.on('render', async function(data) {
          let f = BoardController[`${data.type}`];
          if (typeof f !== 'function') {
            throw new Error(Tools.translate('Invalid generator function'));
          }
          return await f.call(BoardController, data.key, data.data);
        });
        IPC.on('reloadBoards', () => {
          Board.initialize();
        });
        IPC.on('reloadTemplates', async function() {
          return await Renderer.reloadTemplates();
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
        IPC.on('getConnectionIPs', () => {
           return OnlineCounter.unique();
        });
        IPC.send('ready').catch((err) => {
          Logger.error(err);
        });
      });
      server.on('connection', (socket) => {
        let socketId = ++nextSocketId;
        sockets[socketId] = socket;
        socket.on('close', () => {
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
  IPC.on('sendChatMessage', (data) => {
    return IPC.send('sendChatMessage', data);
  });
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
