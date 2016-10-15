import Cluster from 'cluster';

import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as ThreadsModel from '../models/threads';

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
    let result = await IPC.send('render', {
      type: type,
      key: key,
      data: data
    }, false, workerID);
    workerLoads.set(workerID, workerLoads.get(workerID) - 1);
    return result;
  } catch (err) {
    workerLoads.set(workerID, workerLoads.get(workerID) - 1);
    throw err;
  }
}

async function nextTask(type, key, map) {
  let scheduled = map.get(key);
  if (!scheduled) {
    return;
  }
  if (scheduled.length <= 0) {
    map.delete(key);
    return;
  }
  //NOTE: Clearing initial array, but preserving it's copy
  scheduled = scheduled.splice(0, scheduled.length);
  try {
    await performTask(type, key, scheduled.map(n => n.data));
  } catch (err) {
    Logger.error(err.stack || err);
  }
  nextTask(type, key, map);
  scheduled.forEach((n) => { n.resolve(); });
}

async function addTask(type, key, data) {
  let map = scheduledMap.get(type);
  let scheduled = map.get(key);
  if (scheduled) {
    return new Promise((resolve) => {
      scheduled.push({
        resolve: resolve,
        data: data
      });
    });
  } else {
    map.set(key, []);
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
  if (threadNumber !== postNumber) {
    action = 'edit';
  }
  return await addTask('renderThread', `${boardName}:${threadNumber}`, {
    boardName: boardName,
    threadNumber: threadNumber,
    action: action
  });
}

async function renderPages(boardName, threadNumber) {
  return await addTask('renderPages', boardName, threadNumber);
}

async function renderCatalog(boardName) {
  return await addTask('renderCatalog', boardName);
}

export async function scheduleRender(data) {
  try {
    let { boardName, threadNumber, postNumber, action } = data;
    switch (action) {
    case 'create':
      await renderThread(boardName, threadNumber, postNumber, action);
      (async function() {
        await renderPages(boardName);
        await renderCatalog(boardName);
      })();
      break;
    case 'edit':
    case 'delete':
      if (threadNumber === postNumber) {
        await renderThread(boardName, threadNumber, postNumber, action);
        await renderPages(boardName, threadNumber);
        renderCatalog(boardName);
      } else {
        (async function() {
          await renderThread(boardName, threadNumber, postNumber, action);
          await renderPages(boardName);
          renderCatalog(boardName);
        })();
      }
      break;
    default:
      (async function() {
        await renderThread(boardName, threadNumber, postNumber, action);
        await renderPages(boardName);
        renderCatalog(boardName);
      });
      break;
    }
  } catch (err) {
    Logger.error(err.stack || err);
    throw err;
  }
}

export async function scheduleRenderArchive(boardName) {
  try {
    await addTask('renderArchive', boardName);
  } catch (err) {
    Logger.error(err.stack || err);
    throw err;
  }
}
