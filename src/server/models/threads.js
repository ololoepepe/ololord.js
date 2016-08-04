import _ from 'underscore';

import * as PostsModel from './posts';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import UnorderedSet from '../storage/unordered-set';
import Board from '../boards/board';
import * as Tools from '../helpers/tools';

let ArchivedThreads = new Hash(client(), 'archivedThreads');
let ThreadPostNumbers = new UnorderedSet(client(), 'threadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let Threads = new Hash(client(), 'threads');
let ThreadUpdateDateTimes = new Hash(client(), 'threadUpdateDateTimes', {
  parse: false,
  stringify: false
});

export async function getThreadPostNumbers(boardName, threadNumber) {
  let postNumbers = await ThreadPostNumbers.getAll(`${boardName}:${threadNumber}`);
  return postNumbers.sort((a, b) => { return a - b; });
}

async function addDataToThread(thread, { withPostNumbers }) {
  thread.updatedAt = await ThreadUpdateDateTimes.getOne(thread.number, thread.boardName);
  if (withPostNumbers) {
    thread.postNumbers = await getThreadPostNumbers(thread.boardName, thread.number);
  }
}

export async function getThreadPosts(boardName, threadNumber,
  { reverse, limit, notOP, withExtraData, withFileInfos, withReferences } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(Tools.translate('Invalid thread number'));
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

export async function getThread(boardName, threadNumber, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(Tools.translate('Invalid thread number'));
  }
  let thread = await Threads.getOne(threadNumber, boardName);
  if (!thread) {
    thread = await ArchivedThreads.getOne(threadNumber, boardName);
  }
  if (!thread) {
    return Promise.reject(Tools.translate('No such thread'));
  }
  await addDataToThread(thread, options);
  return thread;
}

export async function getThreadInfo(boardName, threadNumber, { lastPostNumber }) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(Tools.translate('Invalid thread number'));
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
};

export async function getThreadLastPostNumber(boardName, threadNumber) {
  if (!Board.board(boardName)) {
    return Promise.reject(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return Promise.reject(Tools.translate('Invalid thread number'));
  }
  let threadPostNumbers = await getThreadPostNumbers(boardName, threadNumber);
  return (threadPostNumbers.length > 0) ? _(threadPostNumbers).last() : 0;
}
