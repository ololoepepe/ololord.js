import _ from 'underscore';
import FS from 'q-io/fs';
import mkpath from 'mkpath';

import * as BoardsModel from './boards';
import * as PostsModel from './posts';
import Board from '../boards/board';
import BoardController from '../controllers/board';
import * as Search from '../core/search';
import * as Cache from '../helpers/cache';
import * as Tools from '../helpers/tools';
import redisClient from '../storage/redis-client-factory';
import Hash from '../storage/hash';
import UnorderedSet from '../storage/unordered-set';

let ArchivedThreads = new Hash(redisClient(), 'archivedThreads');
let DeletedThreads = new UnorderedSet(redisClient(), 'deletedThreads', {
  parse: false,
  stringify: false
});
let ThreadPostNumbers = new UnorderedSet(redisClient(), 'threadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let Threads = new Hash(redisClient(), 'threads');
let ThreadsPlannedForDeletion = new UnorderedSet(redisClient(), 'threadsPlannedForDeletion', {
  parse: false,
  stringify: false
});
let ThreadUpdateTimes = new Hash(redisClient(), 'threadUpdateTimes', {
  parse: false,
  stringify: false
});

export function sortThreadsByDate(t1, t2) {
  if (!!t1.fixed === !!t2.fixed) {
    return t2.updatedAt.localeCompare(t1.updatedAt);
  } else {
    return t1.fixed ? -1 : 1;
  }
}

export function sortThreadsByCreationDate(t1, t2) {
  return t2.createdAt.localeCompare(t1.createdAt);
}

export function sortThreadsByPostCount(t1, t2) {
  return t2.postCount - t1.postCount;
}

export async function getThreadPostCount(boardName, threadNumber) {
  return await ThreadPostNumbers.count(`${boardName}:${threadNumber}`);
}

export async function getThreadPostNumbers(boardName, threadNumber) {
  let postNumbers = await ThreadPostNumbers.getAll(`${boardName}:${threadNumber}`);
  return postNumbers.sort((a, b) => { return a - b; });
}

export async function addThreadPostNumber(boardName, threadNumber, postNumber) {
  await ThreadPostNumbers.addOne(postNumber, `${boardName}:${threadNumber}`);
}

export async function removeThreadPostNumber(boardName, threadNumber, postNumber) {
  await ThreadPostNumbers.deleteOne(postNumber, `${boardName}:${threadNumber}`);
}

async function addDataToThread(thread, { withPostNumbers } = {}) {
  thread.updatedAt = await ThreadUpdateTimes.getOne(thread.number, thread.boardName);
  if (withPostNumbers) {
    thread.postNumbers = await getThreadPostNumbers(thread.boardName, thread.number);
  }
}

export async function getThreadPosts(boardName, threadNumber,
  { reverse, limit, notOP, withExtraData, withFileInfos, withReferences } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid thread number')));
  }
  let threadPostNumbers = await getThreadPostNumbers(boardName, threadNumber);
  let postNumbers = Tools.cloned(threadPostNumbers);
  if (notOP) {
    postNumbers.splice(0, 1);
  }
  if (reverse) {
    postNumbers.reverse();
  }
  limit = Tools.option(limit, 'number', 0, { test: (l) => { return l > 0; } });
  if (limit) {
    postNumbers.splice(limit);
  }
  return await PostsModel.getPosts(boardName, postNumbers, { withExtraData, withFileInfos, withReferences });
}

export async function getThreadNumbers(boardName, { archived } = {}) {
  let source = archived ? ArchivedThreads : Threads;
  return await source.keys(boardName);
}

export async function getThread(boardName, threadNumber, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid thread number')));
  }
  let thread = await Threads.getOne(threadNumber, boardName);
  if (!thread) {
    thread = await ArchivedThreads.getOne(threadNumber, boardName);
  }
  if (!thread) {
    return Promise.reject(new Error(Tools.translate('No such thread')));
  }
  await addDataToThread(thread, options);
  return thread;
}

export async function getThreads(boardName, threadNumbers, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!_(threadNumbers).isArray()) {
    threadNumbers = [threadNumbers];
  }
  threadNumbers = threadNumbers.map((threadNumber) => {
    return Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  });
  if (threadNumbers.some(threadNumber => !threadNumber)) {
    return Promise.reject(new Error(Tools.translate('Invalid thread number')));
  }
  let threads = await Threads.getSome(threadNumbers, boardName);
  threads = _(threads).toArray();
  let mayBeArchivedThreadNumbers = threads.map((thread, index) => {
    return {
      thread: thread,
      index: index
    };
  }).filter((thread) => !thread.thread).map((thread) => {
    return {
      index: thread.index,
      threadNumber: threadNumbers[thread.index]
    };
  });
  if (mayBeArchivedThreadNumbers.length > 0) {
    let numbers = mayBeArchivedThreadNumbers.map(thread => thread.threadNumber);
    let archivedThreads = await ArchivedThreads.getSome(numbers, boardName);
    archivedThreads.forEach((thread, index) => {
      threads[mayBeArchivedThreadNumbers[index].index] = thread;
    });
  }
  if (threads.length <= 0) {
    return [];
  }
  await Tools.series(threads, async function(thread) {
    await addDataToThread(thread, options);
  });
  return threads;
}

export async function getThreadInfo(boardName, threadNumber, { lastPostNumber }) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid thread number')));
  }
  let thread = await getThread(boardName, threadNumber, { withPostNumbers: true });
  if (!thread) {
    return thread;
  }
  let postCount = thread.postNumbers.length;
  lastPostNumber = Tools.option(lastPostNumber, 'number', 0, { test: Tools.testPostNumber });
  let newPostCount = thread.postNumbers.filter((pn) => { return pn > lastPostNumber; }).length;
  return {
    number: thread.number,
    bumpLimit: board.bumpLimit,
    postLimit: board.postLimit,
    bumpLimitReached: (postCount >= board.bumpLimit),
    postLimitReached: (postCount >= board.postLimit),
    closed: thread.closed,
    fixed: thread.fixed,
    unbumpable: thread.unbumpable,
    postCount: postCount,
    postingEnabled: (board.postingEnabled && !thread.closed),
    lastPostNumber: thread.postNumbers.pop(),
    newPostCount: newPostCount
  };
}

export async function getThreadLastPostNumber(boardName, threadNumber) {
  if (!Board.board(boardName)) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid thread number')));
  }
  let threadPostNumbers = await getThreadPostNumbers(boardName, threadNumber);
  return (threadPostNumbers.length > 0) ? _(threadPostNumbers).last() : 0;
}

export async function getThreadUpdateTime(boardName, threadNumber) {
  return await ThreadUpdateTimes.getOne(threadNumber, boardName);
}

export async function getThreadsUpdateTimes(boardName, threadNumbers) {
  return await ThreadUpdateTimes.getSome(threadNumbers, boardName);
}

export async function setThreadUpdateTime(boardName, threadNumber, dateTme) {
  await ThreadUpdateTimes.setOne(threadNumber, dateTme, boardName);
}

export async function isThreadDeleted(boardName, threadNumber) {
  return DeletedThreads.contains(`${boardName}:${threadNumber}`);
}

export async function setThreadDeleted(boardName, threadNumber) {
  return DeletedThreads.addOne(`${boardName}:${threadNumber}`);
}

export async function clearDeletedThreads() {
  return DeletedThreads.delete();
}

async function removeThread(boardName, threadNumber, { archived, leaveFileInfos, leaveReferences } = {}) {
  let source = archived ? ArchivedThreads : Threads;
  let key = `${boardName}:${threadNumber}`
  await ThreadsPlannedForDeletion.addOne(key);
  await source.deleteOne(threadNumber, boardName);
  await ThreadUpdateTimes.deleteOne(threadNumber, boardName);
  setTimeout(async function() {
    try {
      let postNumbers = await getThreadPostNumbers(boardName, threadNumber);
      await ThreadPostNumbers.delete(key);
      await Tools.series(postNumbers, async function(postNumber) {
        return await PostsModel.removePost(boardName, postNumber, {
          leaveFileInfos: leaveFileInfos,
          leaveReferences: leaveReferences,
          removingThread: true
        });
      });
      await ThreadsPlannedForDeletion.deleteOne(key);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }, 5000); //TODO: magic numbers
}

async function pushOutOldThread(boardName) {
  let threadNumbers = await getThreadNumbers(boardName);
  let threads = await getThreads(boardName, threadNumbers);
  threads.sort(sortThreadsByDate);
  if (threads.length < board.threadLimit) {
    return;
  }
  let archivedThreadNumbers = await getThreadNumbers(boardName, { archived: true });
  let archivedThreads = await getThreads(boardName, archivedThreadNumbers);
  archivedThreads.sort(sortThreadsByDate);
  if (archivedThreads.length > 0 && archivedThreads.length >= board.archiveLimit) {
    await removeThread(boardName, archivedThreads.pop().number, { archived: true });
  }
  let thread = threads.pop();
  if (board.archiveLimit <= 0) {
    await removeThread(boardName, thread.number);
    return;
  }
  thread.archived = true;
  await ArchivedThreads.setOne(thread.number, thread, boardName);
  await Threads.deleteOne(thread.number, boardName);
  let postNumbers = await getThreadPostNumbers(boardName, thread.number);
  await Tools.series(postNumbers, async function(postNumber) {
    await Search.updatePostIndex((body) => {
      body.archived = true;
      return body;
    });
  });
  //NOTE: This is for the sake of speed.
  (async function() {
    try {
      let archivePath = `${__dirname}/../../public/${boardName}/arch`;
      let oldThreadNumber = thread.number;
      await mkpath(archivePath);
      let sourceId = `${boardName}/res/${oldThreadNumber}.json`;
      let data = await Cache.readFile(sourceId);
      let model = JSON.parse(data);
      model.thread.archived = true;
      await FS.write(`${archivePath}/${oldThreadNumber}.json`, JSON.stringify(model));
      await BoardController.renderThreadHTML(model.thread, {
        targetPath: `${archivePath}/${oldThreadNumber}.html`,
        archived: true
      });
      await Cache.removeFile(sourceId);
      await Cache.removeFile(`${boardName}/res/${oldThreadNumber}.html`);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  })();
}

export async function createThread(req, fields, transaction) {
  let { boardName, password } = fields;
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!board.postingEnabled) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled at this board')));
  }
  let date = Tools.now();
  password = Tools.sha1(password);
  let hashpass = (req.hashpass || null);
  let threadNumber = await BoardsModel.nextPostNumber(boardName);
  let thread = {
    archived: false,
    boardName: boardName,
    closed: false,
    createdAt: date.toISOString(),
    fixed: false,
    unbumpable: false,
    number: threadNumber,
    user: {
      hashpass: hashpass,
      ip: req.ip,
      level: req.level(boardName),
      password: password
    }
  };
  transaction.setThreadNumber(threadNumber);
  await Threads.setOne(threadNumber, thread, boardName);
  return thread;
}

export async function moveThread(sourceBoardName, threadNumber, targetBoardName) {
  let targetBoard = Board.board(targetBoardName);
  if (!targetBoard || !Board.board(sourceBoardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let thread = await getThread(sourceBoardName, threadNumber, { withPostNumbers: true });
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  let sourcePath = `${__dirname}/../../public/${sourceBoardName}/src`;
  let sourceThumbPath = `${__dirname}/../../public/${sourceBoardName}/thumb`;
  let targetPath = `${__dirname}/../../public/${targetBoardName}/src`;
  let targetThumbPath = `${__dirname}/../../public/${targetBoardName}/thumb`;
  await mkpath(targetPath);
  await mkpath(targetThumbPath);
  delete thread.updatedAt;
  let posts = await PostsModel.getPosts(sourceBoardName, thread.postNumbers, {
    withFileInfos: true,
    withReferences: true,
    withExtraData: true
  });
  delete thread.postNumbers;
  let lastPostNumber = await BoardsModel.nextPostNumber(targetBoardName, posts.length);
  lastPostNumber = lastPostNumber - posts.length + 1;
  thread.number = lastPostNumber;
  let postNumberMap = posts.reduce((acc, post) => {
    acc.set(post.number, lastPostNumber++);
    return acc;
  }, new Map());
  let { toRerender, toUpdate } = await PostsModel.processMovedThreadPosts({
    posts: posts,
    postNumberMap: postNumberMap,
    threadNumber: thread.number,
    targetBoard: targetBoard,
    sourceBoardName: sourceBoardName,
    sourcePath: sourcePath,
    sourceThumbPath: sourceThumbPath,
    targetPath: targetPath,
    targetThumbPath: targetThumbPath
  });
  await Threads.setOne(thead.number, thread, targetBoardName);
  await ThreadUpdateTimes.setOne(thread.number, Tools.now().toISOString(), targetBoardName);
  await ThreadPostNumbers.addSome(_(postNumberMap).toArray(), `${targetBoardName}:${thread.number}`);
  await PostsModel.processMovedThreadRelatedPosts({
    posts: toRerender,
    sourceBoardName: sourceBoardName,
    postNumberMap: postNumberMap
  });
  await Tools.series(toUpdate, async function(o) {
    return await IPC.render(o.boardName, o.threadNumber, o.threadNumber, 'create');
  });
  await removeThread(sourceBoardName, threadNumber, {
    leaveFileInfos: true,
    leaveReferences: true
  });
  IPC.render(sourceBoardName, threadNumber, threadNumber, 'delete');
  await IPC.render(targetBoardName, thread.number, thread.number, 'create');
  return {
    boardName: targetBoardName,
    threadNumber: thread.number
  };
}

export async function setThreadFixed(boardName, threadNumber, fixed) {
  let thread = await getThread(boardName, threadNumber);
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  fixed = !!fixed;
  if (fixed === !!thread.fixed) {
    return;
  }
  thread.fixed = fixed;
  await Threads.setOne(threadNumber, thread, boardName);
  await IPC.render(boardName, threadNumber, threadNumber, 'edit');
}

export async function setThreadClosed(boardName, threadNumber, closed) {
  let thread = await getThread(boardName, threadNumber);
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  closed = !!closed;
  if (closed === !!thread.closed) {
    return;
  }
  thread.closed = closed;
  await Threads.setOne(threadNumber, thread, boardName);
  await IPC.render(boardName, threadNumber, threadNumber, 'edit');
}

export async function setThreadUnbumpable(boardName, threadNumber, unbumpable) {
  let thread = await getThread(boardName, threadNumber);
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  unbumpable = !!unbumpable;
  if (unbumpable === !!thread.unbumpable) {
    return;
  }
  thread.unbumpable = unbumpable;
  await Threads.setOne(threadNumber, thread, boardName);
  await IPC.render(boardName, threadNumber, threadNumber, 'edit');
}
