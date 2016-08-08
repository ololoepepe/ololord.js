import _ from 'underscore';
import Cluster from 'cluster';
import UUID from 'uuid';

import * as ThreadsModel from '../models/threads';
import Logger from './logger';
import * as Tools from './tools';

let handlers = new Map();
let tasks = new Map();
let scheduledRenderPages = new Map();
let scheduledRenderThread = new Map();
let scheduledRenderCatalog = new Map();
let scheduledRenderArchive = new Map();
let scheduledMap = new Map([
  ['renderPages', scheduledRenderPages],
  ['renderThread', scheduledRenderThread],
  ['renderCatalog', scheduledRenderCatalog],
  ['renderArchive', scheduledRenderArchive]
]);
let workerLoads = new Map();

async function handleMessage(message, workerID) {
  let task = tasks.get(message.id);
  if (task) {
    tasks.delete(message.id);
    if (!message.error) {
      task.resolve(message.data);
    } else {
      task.reject(message.error);
    }
  } else {
    let handler = handlers.get(message.type);
    let proc = workerID ? Cluster.workers[workerID] : process;
    if (typeof handler !== 'function') {
      proc.send({
        id: message.id,
        type: message.type,
        error: Tools.translate('Method not found: $[1]', '', message.type)
      });
    }
    try {
      let data = await handler(message.data);
      proc.send({
        id: message.id,
        type: message.type,
        data: data || null
      });
    } catch (err) {
      proc.send({
        id: message.id,
        type: message.type,
        error: err.stack || err.toString()
      });
    }
  }
}

function sendMessage(proc, type, data, nowait) {
  return new Promise((resolve, reject) => {
    let id = UUID.v4();
    tasks.set(id, {
      resolve: resolve,
      reject: reject
    });
    proc.send({
      id: id,
      type: type,
      data: data || null
    }, (err) => {
      if (err) {
        tasks.delete(id);
        reject(err);
        return;
      }
      if (nowait) {
        tasks.delete(id);
        resolve();
      }
    });
  });
}

if (Cluster.isMaster) {
  Cluster.on('online', (worker) => {
    worker.process.on('message', (message) => {
      handleMessage(message, worker.id);
    });
  });
} else {
  process.on('message', (message) => {
    handleMessage(message);
  });
}

export function send(type, data, nowait, workerID) {
  if (Cluster.isMaster) {
    if (workerID) {
      let worker = Cluster.workers[workerID];
      if (!worker) {
        return Promise.reject(new Error(Tools.translate('Invalid worker ID')));
      }
      return sendMessage(worker.process, type, data, nowait);
    } else {
      let promises = _(Cluster.workers).map((worker) => {
        return sendMessage(worker.process, type, data, nowait);
      });
      return Promise.all(promises);
    }
  } else {
    return sendMessage(process, type, data, nowait);
  }
}

export function on(type, handler) {
  handlers.set(type, handler);
  return module.exports;
}

async function performTask(type, key, data) {
  let workerID = Object.keys(Cluster.workers).map((id) => {
    return {
      id: id,
      load: workerLoads.get(id) || 0
    };
  }).sort((w1, w2) => { return w1.load - w2.load; }).shift().id;
  if (workerLoads.has(workerID)) {
    workerLoads.set(workerID, workerLoads.get(workerID) + 1);
  } else {
    workerLoads.set(workerID, 1);
  }
  try {
    let result = send('render', {
      type: type,
      key: key,
      data: data
    }, false, workerID);
    workerLoads.set(workerID, workerLoads.get(workerID) - 1);
    return result;
  } catch (err) {
    workerLoads.set(workerID, workerLoads.get(workerID) - 1);
    return Promise.reject(err);
  }
}

async function nextTask(type, key, map) {
  let scheduled = map.get(key);
  let next = scheduled.next;
  if (!next || next.length <= 0) {
    map.delete(key);
    return;
  }
  delete scheduled.next;
  try {
    await performTask(type, key, next.map(n => n.data));
  } catch (err) {
    Logger.error(err.stack || err);
  }
  nextTask();
  next.forEach((n) => { n.resolve(); });
}

async function addTask(type, key, data) {
  let map = scheduledMap.get(type);
  let scheduled = map.get(key);
  if (scheduled) {
    return new Promise((resolve) => {
      if (!scheduled.next) {
        scheduled.next = [];
      }
      scheduled.next.push({
        resolve: resolve,
        data: data
      });
    });
  } else {
    map.set(key, new Map());
    try {
      await performTask(type, key, data);
    } catch (err) {
      Logger.error(err.stack || err);
    }
    nextTask(type, key, map);
  }
}

async function renderThread(boardName, threadNumber, postNumber, action) {
  let isDeleted = await ThreadsModel.isThreadDeleted(boardName, threadNumber);
  if (isDeleted) {
    return;
  }
  if (threadNumber === postNumber) {
    if ('edit' === action) {
      action = 'create';
    }
  } else {
    action = 'edit';
  }
  return await addTask('renderThread', `${boardName}:${threadNumber}`, {
    boardName: boardName,
    threadNumber: threadNumber,
    action: action
  });
}

export async function renderPages(boardName) {
  return await addTask('renderPages', boardName);
}

export async function renderCatalog(boardName) {
  return await addTask('renderCatalog', boardName);
}

export async function renderArchive(boardName) {
  try {
    if (Cluster.isMaster) {
      return await addTask('renderArchive', boardName);
    } else {
      await send('renderArchive', boardName);
    }
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function render(boardName, threadNumber, postNumber, action) {
  try {
    if (Cluster.isMaster) {
      switch (action) {
      case 'create':
        await renderThread(boardName, threadNumber, postNumber, action);
        (async function() {
          await renderPages(boardName);
          await renderCatalog(boardName);
          await renderArchive(boardName);
        })();
        break;
      case 'edit':
      case 'delete':
        if (threadNumber === postNumber) {
          await renderThread(boardName, threadNumber, postNumber, action);
          await renderPages(boardName);
          (async function() {
            await renderCatalog(boardName);
            await renderArchive(boardName);
          })();
        } else {
          (async function() {
            await renderThread(boardName, threadNumber, postNumber, action);
            await renderPages(boardName);
            (async function() {
              await renderCatalog(boardName);
              await renderArchive(boardName);
            })();
          })();
        }
        break;
      default:
        (async function() {
          await renderThread(boardName, threadNumber, postNumber, action);
          await renderPages(boardName);
          (async function() {
            await renderCatalog(boardName);
            await renderArchive(boardName);
          })();
        });
        break;
      }
    } else {
      await send('render', {
        boardName: boardName,
        threadNumber: threadNumber,
        postNumber: postNumber,
        action: action
      });
    }
  } catch (err) {
    Logger.error(err.stack || err);
  }
}
