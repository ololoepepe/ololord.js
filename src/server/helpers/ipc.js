import _ from 'underscore';
import Cluster from 'cluster';
import UUID from 'uuid';

import Logger from './logger';
import Queue from './queue';
import * as Tools from './tools';

const DEFAULT_TASK_TIMEOUT = 30 * Tools.SECOND;

let handlers = new Map();
let tasks = new Map();

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

export async function send(type, data, nowait, workerID) {
  if (Cluster.isMaster) {
    if (workerID) {
      let worker = Cluster.workers[workerID];
      if (!worker) {
        throw new Error(Tools.translate('Invalid worker ID'));
      }
      return await sendMessage(worker.process, type, data, nowait);
    } else {
      let promises = _(Cluster.workers).map((worker) => {
        return sendMessage(worker.process, type, data, nowait);
      });
      return await Promise.all(promises);
    }
  } else {
    return await sendMessage(process, type, data, nowait);
  }
}

export function on(type, handler) {
  handlers.set(type, handler);
  return module.exports;
}

export async function enqueueTask(task, data, timeout) {
  timeout = Tools.option(timeout, 'number', DEFAULT_TASK_TIMEOUT, { test: (t) => { return t > 0; } });
  return new Promise((resolve, reject) => {
    let job = Queue.create(task, data).ttl(timeout).save((err) => {
      if (err) {
        reject(err);
      }
    });
    job.on('complete', (result) => {
      resolve(result);
    }).on('failed', (err) => {
      reject(new Error(err));
    });
    setTimeout(() => {
      reject(new Error('Rendering task timed out'));
    }, timeout);
  });
}

export async function render(boardName, threadNumber, postNumber, action, timeout) {
  if (Cluster.isMaster) {
    Logger.warn('Rendering requested from master process');
  }
  try {
    await enqueueTask('render', {
      boardName: boardName,
      threadNumber: threadNumber,
      postNumber: postNumber,
      action: action
    }, timeout);
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function renderArchive(boardName, timeout) {
  if (Cluster.isMaster) {
    Logger.warn('Rendering requested from master process');
  }
  try {
    await enqueueTask('renderArchive', boardName, timeout);
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function renderRSS(timeout) {
  try {
    await enqueueTask('renderRSS', null, timeout);
  } catch (err) {
    Logger.error(err.stack || err);
  }
}
