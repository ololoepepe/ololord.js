#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import _ from 'underscore';
import Cluster from 'cluster';
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
import * as StatisticsModel from './models/statistics';
import * as UsersModel from './models/users';
import mongodbClient from './storage/mongodb-client-factory';

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

function onReady() {
  //TODO: May throw error
  if (!onReady.ready) {
    onReady.ready = 0;
  }
  ++onReady.ready;
  if (config('system.workerCount') === onReady.ready) {
    UsersModel.initializeUserBansMonitoring(); //NOTE: No "await" here, this is how it is meant to be.
    if (config('server.statistics.enabled')) {
      let interval = config('server.statistics.ttl') * Tools.MINUTE;
      setInterval(StatisticsModel.generateStatistics.bind(StatisticsModel), interval);
    }
    if (config('server.rss.enabled')) {
      setInterval(async function() {
        try {
          await BoardController.renderRSS();
        } catch (err) {
          Logger.error(err.stack || err);
        }
      }, config('server.rss.ttl') * Tools.MINUTE);
    }
    commands();
  }
}

function initializeMaster() {
  //NOTE: Overcoming Babel bug
  (async function() {
    try {
      await NodeCaptcha.removeOldCaptchImages();
      await NodeCaptchaNoscript.removeOldCaptchImages();
      await mongodbClient().createIndexes();
      await Renderer.compileTemplates();
      await Renderer.reloadTemplates();
      await Renderer.generateTemplatingJavaScriptFile();
      if (Program.rerender || config('system.rerenderCacheOnStartup')) {
        if (Program.archive || config('system.rerenderArchive')) {
          await Renderer.rerender();
        } else {
          await Renderer.rerender(['**', '!/*/arch/*']);
        }
      }
      await StatisticsModel.generateStatistics();
      await Renderer.generateCustomJavaScriptFile();
      await Renderer.generateCustomCSSFiles();
      console.log(Tools.translate('Spawning workers, please, wait…'));
      Cluster.on('exit', (worker) => {
        Logger.log(Tools.translate('[$[1]] Died, respawning…', '', worker.process.pid));
        Cluster.fork();
      });
      for (let i = 0; i < config('system.workerCount'); ++i) {
        Cluster.fork();
      }
      IPC.on('ready', onReady);
      IPC.on('fileName', generateFileName);
      IPC.on('sendChatMessage', (data) => {
        return IPC.send('sendChatMessage', data);
      });
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
        await Renderer.generateTemplatingJavaScriptFile();
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
          return Renderer.rerender(['**', '!/*/arch/*']);
        }
      });
    } catch (err) {
      Logger.error(err.stack || err);
      process.exit(1);
    }
  })();
}

function initializeWorker() {
  //NOTE: Overcoming Babel bug
  (async function() {
    console.log(Tools.translate('[$[1]] Initializing…', '', process.pid));
    try {
      await geolocation.initialize();
      await BoardsModel.initialize();
      await Renderer.reloadTemplates();
      let sockets = new WeakSet();
      let server = HTTP.createServer(controllers);
      let ws = new WebSocketServer(server);
      server.listen(config('server.port'), () => {
        console.log(Tools.translate('[$[1]] Listening on port $[2]…', '', process.pid, config('server.port')));
        IPC.on('exit', (status) => { process.exit(status); });
        IPC.on('stop', () => {
          return new Promise((resolve, reject) => {
            server.close(() => {
              sockets.forEach((socket) => {
                sockets.delete(socket);
                socket.destroy();
              });
              OnlineCounter.clear();
              console.log(Tools.translate('[$[1]] Closed', '', process.pid));
              resolve();
            });
          });
        });
        IPC.on('start', () => {
          return new Promise((resolve, reject) => {
            server.listen(config('server.port'), () => {
              console.log(Tools.translate('[$[1]] Listening on port $[2]…', '', process.pid, config('server.port')));
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
            throw new Error(Tools.translate('Invalid render function'));
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
          ws.notifyAboutNewPosts(keys);
        });
        IPC.on('getConnectionIPs', () => {
           return OnlineCounter.unique();
        });
        IPC.send('ready').catch((err) => {
          Logger.error(err);
        });
      });
      server.on('connection', (socket) => {
        sockets.add(socket);
        socket.on('close', () => {
          sockets.delete(socket);
        });
      });
    } catch (err) {
      console.log(err);
      Logger.error(err.stack || err);
    }
  })();
}

Board.initialize();
Captcha.initialize();
controllers.initialize();

if (Cluster.isMaster) {
  initializeMaster();
} else {
  initializeWorker();
}
