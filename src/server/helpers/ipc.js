import _ from 'underscore';
import Cluster from 'cluster';
import UUID from 'uuid';

import * as Logger from './logger';
import * as Tools from './tools';

let handlers = {};
let tasks = {};

async function handleMessage(message, workerID) {
  let task = tasks[message.id];
  if (task) {
    delete tasks[message.id];
    if (!message.error) {
      task.resolve(message.data);
    } else {
      task.reject(message.error);
    }
  } else {
    let handler = handlers[message.type];
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
        error: err
      });
    }
  }
}

function sendMessage(proc, type, data, nowait) {
  return new Promise((resolve, reject) => {
    let id = UUID.v4();
    tasks[id] = {
      resolve: resolve,
      reject: reject
    };
    proc.send({
      id: id,
      type: type,
      data: data || null
    }, (err) => {
      if (err) {
        delete tasks[id];
        reject(err);
        return;
      }
      if (nowait) {
        delete tasks[id];
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
        return Promise.reject(Tools.translate('Invalid worker ID'));
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
  handlers[type] = handler;
  return module.exports;
}
