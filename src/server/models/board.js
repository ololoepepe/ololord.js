import _ from 'underscore';
import Cluster from 'cluster';

var FS = require("q-io/fs");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var promisify = require("promisify-node");
var Util = require("util");
var XML2JS = require("xml2js");

import Board from '../boards/board';
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

import * as MiscModel from './misc';
import * as PostsModel from './posts';
import * as ThreadsModel from './threads';
import * as Renderer from '../core/renderer';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';

let PostCounters = new Hash(client(), 'postCounters', {
  parse: number => +number,
  stringify: number => number.toString()
});
let Threads = new Hash(client(), 'threads');

let pageCounts = new Map();

function addDataToThread(thread, board) {
  thread.bumpLimit = board.bumpLimit;
  thread.postLimit = board.postLimit;
  thread.bumpLimitReached = (thread.postCount >= board.bumpLimit);
  thread.postLimitReached = (thread.postCount >= board.postLimit);
  thread.postingEnabled = (board.postingEnabled && !thread.closed);
}

export function postSubject(post, maxLength) {
  let subject = '';
  if (post.subject) {
    subject = post.subject;
  } else if (post.text) {
    subject = Tools.plainText(post.text);
  }
  subject = subject.replace(/\r*\n+/gi, '');
  maxLength = Tools.option(maxLength, 'number', 0, { test: (l) => { return l > 0; } });
  if (maxLength > 1 && subject.length > maxLength) {
    subject = subject.substr(0, maxLength - 1) + '…';
  }
  return subject;
}

export async function getThread(boardName, threadNumber, archived) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let thread = await ThreadsModel.getThread(boardName, threadNumber);
  let posts = await ThreadsModel.getThreadPosts(boardName, threadNumber, {
    withExtraData: true,
    withFileInfos: true,
    withReferences: true
  });
  thread.postCount = posts.length;
  thread.opPost = posts.splice(0, 1)[0];
  thread.lastPosts = posts;
  thread.title = postSubject(thread.opPost, 50) || null;
  thread.archived = !!archived;
  addDataToThread(thread, board);
  return thread;
}

export async function getPage(boardName, pageNumber) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  pageNumber = Tools.option(pageNumber, 'number', -1, { test: (n) => { return n >= 0; } });
  let pageCount = pageCounts.get(boardName);
  if (pageNumber < 0 || pageNumber >= pageCount) {
    return Promise.reject(new Error(Tools.translate('Invalid page number')));
  }
  let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
  let threads = await ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });
  threads.sort(Board.sortThreadsByDate);
  let start = pageNumber * board.threadsPerPage;
  threads = threads.slice(start, start + board.threadsPerPage);
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    let lastPosts = await ThreadsModel.getThreadPosts(boardName, thread.number, {
      limit: board.maxLastPosts,
      reverse: true,
      notOP: true,
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    thread.lastPosts = lastPosts.reverse();
    thread.postCount = thread.postNumbers.length;
    delete thread.postNumbers;
    addDataToThread(thread, board);
    if (thread.postCount > (board.maxLastPosts + 1)) {
      thread.omittedPosts = thread.postCount - board.maxLastPosts - 1;
    } else {
      thread.omittedPosts = 0;
    }
  });
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads,
    pageCount: pageCount,
    currentPage: pageNumber,
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getCatalog(boardName, sortMode) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
  let threads = await ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withFileInfos: true,
      withReferences: true
    });
    thread.postCount = thread.postNumbers.length;
    delete thread.postNumbers;
    addDataToThread(thread, board);
  });
  let sortFunction = Board.sortThreadsByCreationDate;
  switch ((sortMode || 'date').toLowerCase()) {
  case 'recent':
    sortFunction = Board.sortThreadsByDate;
    break;
  case 'bumps':
    sortFunction = Board.sortThreadsByPostCount;
    break;
  default:
    break;
  }
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort(sortFunction),
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getArchive(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let path = `${__dirname}/../public/${boardName}/arch`;
  let exists = await FS.exists(path);
  if (exists) {
    var fileNames = await FS.list(path);
  } else {
    var fileNames = [];
  }
  fileNames = fileNames.filter((fileName) => { return fileName.split('.').pop() === 'json'; });
  let threads = await Tools.series(fileNames, async function(fileName) {
    let stats = await FS.stat(`${path}/${fileName}`);
    return {
      boardName: boardName,
      number: +fileName.split('.').shift(),
      birthtime: stats.node.birthtime.valueOf()
    };
  }, true);
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort((t1, t2) => { return t2 - t1; }), //NOTE: The order is correct (t2 - t1).
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getLastPostNumber(boardName) {
  if (!Board.board(boardName)) {
    return Promise.reject(new Error(Tools.translate('Invalid boardName')));
  }
  return await PostCounters.getOne(boardName);
}

export async function getLastPostNumbers(boardNames) {
  if (!_(boardNames).isArray()) {
    boardNames = [boardNames];
  }
  if (boardNames.some(boardName => !Board.board(boardName))) {
    return Promise.reject(new Error(Tools.translate('Invalid boardName')));
  }
  return await PostCounters.getSome(boardNames);
}

export async function getPageCount(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let threadCount = await Threads.count(boardName);
  let pageCount = Math.ceil(threadCount / board.threadsPerPage) || 1;
  pageCounts.set(boardName, pageCount);
  return pageCount;
}

export async function nextPostNumber(boardName, incrementBy) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  incrementBy = Tools.option(incrementBy, 'number', 1, { test: (i) => { i >= 1; } });
  let postNumber = await PostCounters.incrementBy(boardName, incrementBy);
  if (!number) {
    return 0;
  }
  //TODO: improve get skipping
  if (1 === incrementBy && board.skippedGetOrder > 0 && !(number % Math.pow(10, board.skippedGetOrder))) {
    return await nextPostNumber(boardName, incrementBy);
  }
  return number;
}

export async function initialize() {
  await Tools.series(Board.boardNames(), async function(boardName) {
    await getPageCount(boardName);
  });
  await ThreadsModel.clearDeletedThreads();
}
