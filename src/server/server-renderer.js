#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import Cluster from 'cluster';

import Board from './boards/board';
import commands from './commands';
import BoardController from './controllers/board';
import * as Renderer from './core/renderer';
import * as RenderScheduler from './core/render-scheduler';
import config from './helpers/config';
import * as IPC from './helpers/ipc';
import Logger from './helpers/logger';
import Queue from './helpers/queue';
import * as Tools from './helpers/tools';
import * as BoardsModel from './models/boards';

function onReady() {
  try {
    if (!onReady.ready) {
      onReady.ready = 0;
    }
    ++onReady.ready;
    if (config('system.rendererWorkerCount') === onReady.ready) {
      commands(true, 'ololord.js-rend>');
    }
  } catch (err) {
    console.error(err);
    try {
      Logger.error(err.stack || err);
    } catch (err) {
      console.error(err);
    }
    process.exit(1);
  }
}

function initializeMaster() {
  //NOTE: Overcoming Babel bug
  (async function() {
    try {
      console.log(Tools.translate('Spawning renderer workers, please, wait…'));
      Cluster.on('exit', (worker) => {
        Logger.error(Tools.translate('[$[1]] Renderer died, respawning…', '', worker.process.pid));
        Cluster.fork();
      });
      for (let i = 0; i < config('system.rendererWorkerCount'); ++i) {
        Cluster.fork();
      }
      IPC.on('ready', onReady);
      IPC.on('reloadBoards', async function() {
        Board.initialize();
        await IPC.send('reloadBoards');
      });
      IPC.on('reloadTemplates', async function() {
        await Renderer.compileTemplates();
        await IPC.send('reloadTemplates');
      });
      Queue.process('reloadBoards', async function(_1, done) {
        try {
          Board.initialize();
          await IPC.send('reloadBoards');
        } catch (err) {
          Logger.error(err.stack || err);
        }
        done();
      });
      Queue.process('reloadTemplates', async function(_1, done) {
        try {
          await Renderer.reloadTemplates();
          await IPC.send('reloadTemplates');
        } catch (err) {
          Logger.error(err.stack || err);
        }
        done();
      });
      Queue.process('render', async function(job, done) {
        try {
          Logger.info(Tools.translate('Task: $[1]', '', 'render'), job.data);
          await RenderScheduler.scheduleRender(job.data);
          done();
        } catch (err) {
          Logger.error(err.stack || err);
          done(err);
        }
      });
      Queue.process('renderArchive', async function(job, done) {
        try {
          Logger.info(Tools.translate('Task: $[1]', '', 'renderArchive'), job.data);
          await RenderScheduler.scheduleRenderArchive(job.data);
          done();
        } catch (err) {
          Logger.error(err.stack || err);
          done(err);
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
    console.log(Tools.translate('[$[1]] Initializing renderer…', '', process.pid));
    try {
      await BoardsModel.initialize();
      await Renderer.reloadTemplates();
      console.log(Tools.translate('[$[1]] Rendered initialized', '', process.pid));
      IPC.on('exit', (status) => { process.exit(status); });
      IPC.on('reloadBoards', () => {
        Board.initialize();
      });
      IPC.on('reloadTemplates', async function() {
        return await Renderer.reloadTemplates();
      });
      IPC.on('render', async function(data) {
        let f = BoardController[`${data.type}`];
        if (typeof f !== 'function') {
          throw new Error(Tools.translate('Invalid render function'));
        }
        return await f.call(BoardController, data.key, data.data);
      });
      IPC.send('ready').catch((err) => {
        Logger.error(err);
      });
    } catch (err) {
      console.error(err);
      try {
        Logger.error(err.stack || err);
      } catch (err) {
        console.error(err);
      }
      process.exit(1);
    }
  })();
}

Board.initialize();

if (Cluster.isMaster) {
  initializeMaster();
} else {
  initializeWorker();
}
