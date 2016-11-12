import _ from 'underscore';
import FS from 'q-io/fs';
import promisify from 'promisify-node';

import * as BoardsModel from './boards';
import * as FilesModel from './files';
import * as PostReferencesModel from './post-references';
import * as PostsModel from './posts';
import Board from '../boards/board';
import BoardController from '../controllers/board';
import * as Cache from '../helpers/cache';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import mongodbClient from '../storage/mongodb-client-factory';
import redisClient from '../storage/redis-client-factory';
import UnorderedSet from '../storage/unordered-set';

const mkpath = promisify('mkpath');

let client = mongodbClient();
let DeletedThreads = new UnorderedSet(redisClient(), 'deletedThreads', {
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

export async function getThreadPostCount(boardName, threadNumber, { lastPostNumber } = {}) {
  let Post = await client.collection('post');
  let query = {
    boardName: boardName,
    threadNumber: threadNumber
  };
  lastPostNumber = Tools.option(lastPostNumber, 'number', 0, { test: Tools.testPostNumber });
  if (lastPostNumber) {
    query.number = { $gt: lastPostNumber };
  }
  return await Post.count(query);
}

export async function getThreadNumbers(boardName, { archived } = {}) {
  let Thread = await client.collection('thread');
  let threads = await Thread.find({
    boardName: boardName,
    archived: !!archived
  }, { number: 1 }).sort({ number: -1 }).toArray();
  return threads.map(({ number }) => number);
}

export async function getThread(boardName, threadNumber, projection) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let Thread = await client.collection('thread');
  if (typeof projection !== 'object') {
    projection = { _id: 0 };
  }
  let thread = await Thread.findOne({
    boardName: boardName,
    number: threadNumber
  }, projection);
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  return thread;
}

export async function threadExists(boardName, threadNumber) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let Thread = await client.collection('thread');
  let count = await Thread.count({
    boardName: boardName,
    number: threadNumber
  });
  return (count > 0);
}

export async function getThreads(boardName, { archived, limit, offset, sort } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let Thread = await client.collection('thread');
  let cursor = Thread.find({
    boardName: boardName,
    archived: !!archived
  }, { _id: 0 });
  if (sort) {
    cursor = cursor.sort({
      fixed: sort,
      updatedAt: sort
    });
  }
  if (offset) {
    cursor = cursor.skip(offset);
  }
  if (limit) {
    cursor = cursor.limit(limit);
  }
  let threads = await cursor.toArray();
  return threads;
}

export async function getThreadCount(boardName, { archived } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let Thread = await client.collection('thread');
  return await Thread.count({
    boardName: boardName,
    archived: !!archived
  });
}

export async function getThreadLastPostNumber(boardName, threadNumber) {
  if (!Board.board(boardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let Post = await client.collection('post');
  let posts = await Post.find({
    boardName: boardName,
    threadNumber: threadNumber
  }, { number: 1 }).sort({ number: -1 }).limit(1).toArray();
  return (posts.length > 0) ? posts[0].number : 0;
}

export async function getThreadInfo(boardName, threadNumber, { lastPostNumber }) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let Thread = await client.collection('thread');
  let thread = await getThread(boardName, threadNumber);
  if (!thread) {
    return thread;
  }
  let postCount = await getThreadPostCount(boardName, threadNumber);
  let newPostCount = await getThreadPostCount(boardName, threadNumber, { lastPostNumber: lastPostNumber });
  lastPostNumber = await getThreadLastPostNumber(boardName, threadNumber);
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
    lastPostNumber: lastPostNumber,
    newPostCount: newPostCount
  };
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

async function pushOutOldThread(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let threadCount = await getThreadCount(boardName);
  if (threadCount < board.threadLimit) {
    return;
  }
  let archivedThreadCount = await getThreadCount(boardName, { archived: true });
  let removeLastArchivedThread = (board.archiveLimit > 0) && (archivedThreadCount >= board.archiveLimit);
  let Thread = await client.collection('thread');
  let [lastThread] = await getThreads(boardName, {
    sort: 1,
    limit: 1
  });
  if (removeLastArchivedThread) {
    let [lastArchivedThread] = await getThreads(boardName, {
      archived: true,
      sort: 1,
      limit: 1
    });
    if (lastArchivedThread) {
      await deleteThread(boardName, lastArchivedThread.number);
      await IPC.renderArchive(boardName);
    }
  }
  if (board.archiveLimit <= 0) {
    await deleteThread(boardName, lastThread.number);
    return;
  }
  await Thread.updateOne({
    boardName: boardName,
    number: lastThread.number
  }, {
    $set: { archived: true }
  });
  let Post = await client.collection('post');
  await Post.updateMany({
    boardName: boardName,
    threadNumber: lastThread.number
  }, {
    $set: { archived: true }
  });
  await IPC.render(boardName, lastThread.number, lastThread.number, 'edit');
  await IPC.renderArchive(boardName);
}

export async function createThread(req, fields, transaction) {
  let { boardName, password } = fields;
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  if (!board.postingEnabled) {
    throw new Error(Tools.translate('Posting is disabled at this board'));
  }
  try {
    await pushOutOldThread(boardName);
  } catch (err) {
    Logger.error(err.stack || err);
  }
  let date = Tools.now();
  let threadNumber = await BoardsModel.nextPostNumber(boardName);
  let thread = {
    boardName: boardName,
    number: threadNumber,
    archived: false,
    fixed: false,
    closed: false,
    unbumpable: false,
    user: PostsModel.createPostUser(req, req.level(boardName), password),
    createdAt: date.toISOString()
  };
  transaction.setThreadNumber(threadNumber);
  let Thread = await client.collection('thread');
  await Thread.insertOne(thread);
  return thread;
}

async function setThreadFlag(boardName, threadNumber, flagName, flagValue) {
  let Thread = await client.collection('thread');
  let { matchedCount, modifiedCount } = await Thread.updateOne({
    boardName: boardName,
    number: threadNumber
  }, {
    $set: { [flagName]: !!flagValue }
  });
  if (matchedCount <= 0) {
    throw new Error(Tools.translate('No such thread'));
  }
  if (modifiedCount > 0) {
    await IPC.render(boardName, threadNumber, threadNumber, 'edit');
  }
}

export async function setThreadFixed(boardName, threadNumber, fixed) {
  return await setThreadFlag(boardName, threadNumber, 'fixed', fixed);
}

export async function setThreadClosed(boardName, threadNumber, closed) {
  return await setThreadFlag(boardName, threadNumber, 'closed', closed);
}

export async function setThreadUnbumpable(boardName, threadNumber, unbumpable) {
  return await setThreadFlag(boardName, threadNumber, 'unbumpable', unbumpable);
}

export async function moveThread(sourceBoardName, threadNumber, targetBoardName, transaction) {
  let targetBoard = Board.board(targetBoardName);
  if (!targetBoard || !Board.board(sourceBoardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let thread = await getThread(sourceBoardName, threadNumber);
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  thread.boardName = targetBoardName;
  let postCount = await getThreadPostCount(sourceBoardName, threadNumber);
  let lastPostNumber = await BoardsModel.nextPostNumber(targetBoardName, postCount);
  let initialPostNumber = lastPostNumber - postCount + 1;
  thread.number = initialPostNumber;
  await PostsModel.copyPosts({
    sourceBoardName: sourceBoardName,
    sourceThreadNumber: threadNumber,
    targetBoardName: targetBoardName,
    initialPostNumber: initialPostNumber,
    transaction: transaction
  });
  let Thread = await client.collection('thread');
  transaction.setThreadNumber(thread.number);
  await Thread.insertOne(thread);
  await IPC.render(targetBoardName, thread.number, thread.number, 'create');
  transaction.commit();
  await deleteThread(sourceBoardName, threadNumber);
  return {
    boardName: targetBoardName,
    threadNumber: thread.number
  };
}

export async function deleteThread(boardName, threadNumber) {
  let Thread = await client.collection('thread');
  let result = await Thread.findOneAndDelete({
    boardName: boardName,
    number: threadNumber,
  }, {
    projection: { lastPostNumber: 1 }
  });
  let thread = result.value;
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  let Post = await client.collection('post');
  let query = {
    boardName: boardName,
    threadNumber: threadNumber
  };
  let posts = await Post.find(query, {
    number: 1,
    referencedPosts: 1,
    referringPosts: 1,
    fileInfos: 1
  }).toArray();
  await Post.deleteMany(query);
  await Tools.series(posts, async function(post) {
    await PostReferencesModel.removeReferringPosts(boardName, post.number);
  }, true);
  let refs = await Tools.series(posts, (post) => {
    return PostReferencesModel.updateReferringPosts(post.referringPosts, boardName, undefined, threadNumber);
  }, true);
  refs = _.extend(...refs);
  let referencedPosts = _(posts.map(({ referencedPosts }) => referencedPosts)).flatten();
  await PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, refs, referencedPosts);
  let fileInfos = posts.map(({ fileInfos }) => fileInfos);
  await FilesModel.removeFiles(_(fileInfos).flatten());
  await IPC.render(boardName, threadNumber, threadNumber, 'delete');
  if (thread.archived) {
    await IPC.renderArchive(boardName);
  }
}
