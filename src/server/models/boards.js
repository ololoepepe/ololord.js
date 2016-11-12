import _ from 'underscore';
import Cluster from 'cluster';
import FS from 'q-io/fs';

import * as MiscModel from './misc';
import * as PostsModel from './posts';
import * as ThreadsModel from './threads';
import Board from '../boards/board';
import * as Renderer from '../core/renderer';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import mongodbClient from '../storage/mongodb-client-factory';

let client = mongodbClient();
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
    subject = Renderer.plainText(post.text);
  }
  subject = subject.replace(/\r*\n+/gi, '');
  maxLength = Tools.option(maxLength, 'number', 0, { test: (l) => { return l > 0; } });
  if (maxLength > 1 && subject.length > maxLength) {
    subject = subject.substr(0, maxLength - 1) + '…';
  }
  return subject;
}

export async function getThread(boardName, threadNumber) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let thread = await ThreadsModel.getThread(boardName, threadNumber);
  let posts = await PostsModel.getThreadPosts(boardName, threadNumber);
  thread.postCount = posts.length;
  if (thread.postCount <= 0) {
    throw new Error(Tools.translate('No such thread'));
  }
  thread.opPost = posts.splice(0, 1)[0];
  thread.lastPosts = posts;
  thread.title = postSubject(thread.opPost, 50) || null;
  addDataToThread(thread, board);
  return thread;
}

export async function getPage(boardName, pageNumber) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  pageNumber = Tools.option(pageNumber, 'number', -1, { test: (n) => { return n >= 0; } });
  let pageCount = pageCounts.get(boardName);
  if (pageNumber < 0 || pageNumber >= pageCount) {
    throw new Error(Tools.translate('Invalid page number'));
  }
  let threads = await ThreadsModel.getThreads(boardName, {
    sort: -1,
    limit: board.threadsPerPage,
    offset: pageNumber * board.threadsPerPage
  });
  let Post = await client.collection('post');
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    thread.lastPosts = await PostsModel.getThreadPosts(boardName, thread.number, {
      limit: board.maxLastPosts,
      offset: 1,
      sort: true
    });
    thread.postCount = await ThreadsModel.getThreadPostCount(boardName, thread.number);
    addDataToThread(thread, board);
    if (thread.postCount > (board.maxLastPosts + 1)) {
      thread.omittedPosts = thread.postCount - board.maxLastPosts - 1;
    } else {
      thread.omittedPosts = 0;
    }
  });
  threads = threads.filter((thread) => { return (thread.opPost && (thread.postCount > 0)); });
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads,
    pageCount: pageCount,
    currentPage: pageNumber,
    lastPostNumber: lastPostNumber,
    postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getCatalog(boardName, sortMode) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let threads = await ThreadsModel.getThreads(boardName);
  let Post = await client.collection('post');
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withFileInfos: true,
      withReferences: true
    });
    thread.postCount = await ThreadsModel.getThreadPostCount(boardName, thread.number);
    addDataToThread(thread, board);
  });
  let sortFunction = ThreadsModel.sortThreadsByCreationDate;
  switch ((sortMode || 'date').toLowerCase()) {
  case 'recent':
    sortFunction = ThreadsModel.sortThreadsByDate;
    break;
  case 'bumps':
    sortFunction = ThreadsModel.sortThreadsByPostCount;
    break;
  default:
    break;
  }
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort(sortFunction),
    lastPostNumber: lastPostNumber,
    postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getArchive(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let threads = await ThreadsModel.getThreads(boardName, { archived: true });
  threads.sort(ThreadsModel.sortThreadsByDate);
  let Post = await client.collection('post');
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number);
    thread.title = postSubject(thread.opPost, 50) || null;
  });
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads,
    lastPostNumber: lastPostNumber,
    postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getLastPostNumber(boardName) {
  if (!Board.board(boardName)) {
    throw new Error(Tools.translate('Invalid boardName'));
  }
  let PostCounter = await client.collection('postCounter');
  let result = await PostCounter.findOne({ _id: boardName }, { lastPostNumber: 1 });
  return result ? result.lastPostNumber : 0;
}

export async function getLastPostNumbers(boardNames) {
  if (!_(boardNames).isArray()) {
    boardNames = [boardNames];
  }
  if (boardNames.some(boardName => !Board.board(boardName))) {
    throw new Error(Tools.translate('Invalid boardName'));
  }
  let PostCounter = await client.collection('postCounter');
  let query = {
    _id: { $in: boardNames }
  };
  let result = await PostCounter.find(query).toArray();
  return result.reduce((acc, { _id, lastPostNumber }) => {
    acc[_id] = lastPostNumber;
    return acc;
  }, {});
}

export async function getPageCount(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let Thread = await client.collection('thread');
  let threadCount = await ThreadsModel.getThreadCount(boardName);
  let pageCount = Math.ceil(threadCount / board.threadsPerPage) || 1;
  pageCounts.set(boardName, pageCount);
  return pageCount;
}

export async function nextPostNumber(boardName, incrementBy) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  incrementBy = Tools.option(incrementBy, 'number', 1, { test: (i) => { return i >= 1; } });
  let PostCounter = await client.collection('postCounter');
  let result = await PostCounter.findOneAndUpdate({ _id: boardName }, {
    $inc: { lastPostNumber: incrementBy }
  }, {
    projection: { lastPostNumber: 1 },
    upsert: true,
    returnOriginal: false
  });
  if (!result) {
    return 0;
  }
  let { lastPostNumber } = result.value;
  //TODO: improve get skipping
  if ((1 === incrementBy) && (board.skippedGetOrder > 0) && !(lastPostNumber % Math.pow(10, board.skippedGetOrder))) {
    return await nextPostNumber(boardName, incrementBy);
  }
  return lastPostNumber;
}

export async function initialize() {
  await Tools.series(Board.boardNames(), async function(boardName) {
    await getPageCount(boardName);
  });
  await ThreadsModel.clearDeletedThreads();
}

export async function delall(req, ip, boardNames) {
  ip = Tools.correctAddress(ip);
  if (!ip) {
    throw new Error(Tools.translate('Invalid IP address'));
  }
  let deletedThreads = {};
  let updatedThreads = {};
  let deletedPosts = {};
  let Post = await client.collection('post');
  await Tools.series(boardNames, async function(boardName) {
    let posts = await Post.find({
      boardName: boardName,
      'user.ip': ip
    }, {
      number: 1,
      threadNumber: 1
    }).toArray();
    posts.forEach((post) => {
      if (post.threadNumber === post.number) {
        deletedThreads[`${boardName}:${post.threadNumber}`] = {
          boardName: boardName,
          number: post.threadNumber
        };
      }
    });
    posts.filter(post => !deletedThreads.hasOwnProperty(`${boardName}:${post.threadNumber}`)).forEach((post) => {
      updatedThreads[`${boardName}:${post.threadNumber}`] = {
        boardName: boardName,
        number: post.threadNumber
      };
      deletedPosts[`${boardName}:${post.number}`] = {
        boardName: boardName,
        number: post.number,
        threadNumber: post.threadNumber
      };
    });
  });
  await Tools.series(deletedPosts, async function(post) {
    await Post.deleteOne({
      boardName: post.boardName,
      number: post.number
    });
    await PostsModel.removePostData(post.boardName, post.number, post.threadNumber);
  });
  await Tools.series(deletedThreads, async function(thread) {
    await ThreadsModel.removeThread(thread.boardName, thread.number);
  });
  await Tools.series(updatedThreads, async function(thread) {
    await IPC.render(thread.boardName, thread.number, thread.number, 'edit');
  });
  await Tools.series(deletedThreads, async function(thread) {
    await IPC.render(thread.boardName, thread.number, thread.number, 'delete');
  });
}
