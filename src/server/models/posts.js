import _ from 'underscore';
import FS from 'q-io/fs';
import promisify from 'promisify-node';

import * as BoardsModel from './boards';
import * as FilesModel from './files';
import * as PostReferencesModel from './post-references';
import * as ThreadsModel from './threads';
import * as UsersModel from './users';
import Board from '../boards/board';
import * as Renderer from '../core/renderer';
import * as Search from '../core/search';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import markup from '../markup';
import mongodbClient from '../storage/mongodb-client-factory';

let client = mongodbClient();

function createPostProjection({ withExtraData, withFileInfos, withReferences } = {}) {
  let projection = { _id: 0 };
  if (!withExtraData) {
    projection.extraData = 0;
  }
  if (!withFileInfos) {
    projection.fileInfos = 0;
  }
  if (!withReferences) {
    projection.referencedPosts = 0;
    projection.referringPosts = 0;
  }
  return projection;
}

export async function getPost(boardName, postNumber, options) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    throw new Error(Tools.translate('Invalid post number'));
  }
  let Post = await client.collection('post');
  return await Post.findOne({
    boardName: boardName,
    number: postNumber
  }, createPostProjection(options));
}

function getPostBoard(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  if (!board.postingEnabled) {
    throw new Error(Tools.translate('Posting is disabled at this board'));
  }
  return board;
}

async function getPostThread(boardName, threadNumber) {
  let Thread = await client.collection('thread');
  let thread = await Thread.findOne({
    boardName: boardName,
    number: threadNumber
  }, {
    closed: 1,
    unbumpable: 1
  });
  if (!thread) {
    throw new Error(Tools.translate('No such thread'));
  }
  if (thread.closed) {
    throw new Error(Tools.translate('Posting is disabled in this thread'));
  }
  return thread;
}

async function getPostCount(boardName, threadNumber, lastPostNumber) {
  let Post = await client.collection('post');
  let query = {
    boardName: boardName,
    threadNumber: threadNumber
  };
  if (lastPostNumber) {
    query.number = { $lt: lastPostNumber };
  }
  return await Post.count(query);
}

function createPostOptions(req, sage, tripcode, signAsOp) {
  return {
    sage: sage,
    showTripcode: !!req.hashpass && ('true' === tripcode),
    signAsOp: ('true' === signAsOp),
    bannedFor: false
  };
}

export function createPostUser(req, accessLevel, password) {
  return {
    hashpass: (req.hashpass || null),
    ip: req.ip,
    level: accessLevel,
    password: Tools.sha1(password)
  };
}

async function adjustPostSequenceNumber(boardName, postNumber, oldPostCount, newPostCount) {
  let Post = await client.collection('post');
  await Post.updateOne({
    boardName: boardName,
    number: postNumber
  }, {
    $inc: { sequenceNumber: (newPostCount - oldPostCount) }
  });
}

async function setThreadUpdateTime(boardName, threadNumber, dateTime) {
  let Thread = await client.collection('thread');
  let { matchedCount } = await Thread.updateOne({
    boardName: boardName,
    number: threadNumber
  }, {
    $set: { updatedAt: dateTime.toISOString() }
  });
  if (matchedCount <= 0) {
    throw new Error(Tools.translate('No such thread'));
  }
}

export async function createPost(req, fields, files, transaction, { postNumber, date } = {}) {
  let { boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password } = fields;
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  date = date || Tools.now();
  let board = getPostBoard(boardName);
  if (postNumber) {
    threadNumber = postNumber;
  }
  let { unbumpable } = await getPostThread(boardName, threadNumber);
  unbumpable = !!unbumpable;
  let Post = await client.collection('post');
  let postCount = await getPostCount(boardName, threadNumber);
  if (postCount >= board.postLimit) {
    throw new Error(Tools.translate('Post limit reached'));
  }
  let rawText = text || null;
  let markupModes = markup.markupModes(markupMode);
  let referencedPosts = {};
  sage = ('true' === sage);
  let accessLevel = req.level(boardName) || null;
  text = await markup(boardName, rawText, {
    markupModes: markupModes,
    accessLevel: accessLevel,
    referencedPosts: referencedPosts
  });
  let extraData = await board.getPostExtraData(req, fields, files);
  if (!postNumber) {
    postNumber = await BoardsModel.nextPostNumber(boardName);
  }
  let fileInfos = FilesModel.createFileInfos(files, boardName, postNumber);
  let post = {
    boardName: boardName,
    number: postNumber,
    threadNumber: threadNumber,
    sequenceNumber: postCount + 1,
    archived: false,
    name: name || null,
    subject: subject || null,
    rawText: rawText,
    text: text || null,
    markup: markupModes,
    options: createPostOptions(req, sage, tripcode, signAsOp),
    user: createPostUser(req, accessLevel, password),
    geolocation: req.geolocationInfo,
    fileInfos: fileInfos,
    fileInfoCount: fileInfos.length,
    extraData: extraData,
    referencedPosts: _(referencedPosts).toArray(),
    referringPosts: [],
    createdAt: date.toISOString(),
    updatedAt: null
  };
  transaction.setPostNumber(postNumber);
  await Post.insertOne(post);
  let postCountNew = await getPostCount(boardName, threadNumber, postNumber);
  if (postCountNew !== postCount) {
    await adjustPostSequenceNumber(boardName, postNumber, postCount, postCountNew);
    //TODO: Get new sequenceNumber
  }
  if (!sage && (postCount < board.bumpLimit) && !unbumpable) {
    await setThreadUpdateTime(boardName, threadNumber, date);
  }
  await PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);
  await IPC.render(boardName, threadNumber, postNumber, 'create');
  (async function() {
    await PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts);
  })();
  return post;
}

export async function editPost(req, fields) {
  let { boardName, postNumber, text, name, subject, sage, markupMode } = fields;
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    throw new Error(Tools.translate('Invalid post number'));
  }
  let Post = await client.collection('post');
  let query = {
    boardName: boardName,
    number: postNumber
  };
  let post = await Post.findOne(query, {
    threadNumber: 1,
    referencedPosts: 1,
    extraData: 1
  });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  let threadNumber = post.threadNumber;
  let oldReferencedPosts = post.referencedPosts;
  let date = Tools.now();
  let rawText = text || null;
  let markupModes = markup.markupModes(markupMode);
  let referencedPosts = {};
  sage = ('true' === sage);
  text = await markup(boardName, rawText, {
    markupModes: markupModes,
    accessLevel: req.level(boardName),
    referencedPosts: referencedPosts
  });
  let extraData = await board.editPostExtraData(req, fields, post.extraData);
  let result = await Post.findOneAndUpdate(query, {
    $set: {
      markup: markupModes,
      name: name || null,
      rawText: rawText,
      subject: subject || null,
      text: text || null,
      referencedPosts: _(referencedPosts).toArray(),
      updatedAt: date
    }
  }, {
    projection: createPostProjection({
      withFileInfos: true,
      withExtraData: true,
      withReferences: true
    }),
    returnOriginal: false
  });
  post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  await PostReferencesModel.removeReferringPosts(boardName, postNumber);
  await PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);
  (async function() {
    await IPC.render(boardName, threadNumber, postNumber, 'edit');
    await PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts, oldReferencedPosts);
  })();
  return post;
}

export async function deletePost(boardName, postNumber) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    throw new Error(Tools.translate('Invalid post number'));
  }
  let Post = await client.collection('post');
  let result = await Post.findOneAndDelete({
    boardName: boardName,
    threadNumber: { $ne: postNumber },
    number: postNumber,
    archived: false
  }, {
    projection: {
      threadNumber: 1,
      referencedPosts: 1,
      referringPosts: 1,
      fileInfos: 1
    }
  });
  let post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  let threadNumber = post.threadNumber;
  let oldReferencedPosts = post.referencedPosts;
  let referringPosts = post.referringPosts;
  await Post.updateMany({
    boardName: boardName,
    threadNumber: threadNumber,
    number: { $gt: postNumber }
  }, {
    $inc: { sequenceNumber: -1 }
  });
  await PostReferencesModel.removeReferringPosts(boardName, postNumber);
  await IPC.render(boardName, threadNumber, postNumber, 'edit');
  (async function() {
    let refs = await PostReferencesModel.updateReferringPosts(referringPosts, boardName, postNumber, threadNumber);
    await PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, refs, oldReferencedPosts);
    await FilesModel.removeFiles(post.fileInfos);
  })();
}

export async function markupPosts(targets) {
  if (typeof targets !== 'object') {
    return;
  }
  if (_(targets).toArray().length <= 0) {
    targets = Board.boardNames();
  }
  if (_(targets).isArray()) {
    targets = targets.reduce((acc, boardName) => {
      acc[boardName] = '*';
      return acc;
    }, {});
  }
  let Post = await client.collection('post');
  let posts = await Tools.series(targets, async function(postNumbers, boardName) {
    if (typeof postNumbers !== 'string' && !_(postNumbers).isArray()) {
      return [];
    }
    if (!Board.board(boardName)) {
      Logger.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
      return [];
    }
    let posts = await Post.find({ boardName: boardName }, {
      number: 1,
      threadNumber: 1
    });
    posts = posts.map(({ number, threadNumber }) => {
      return {
        boardName: boardName,
        postNumber: postNumber,
        threadNumber: threadNumber
      };
    });
    if ('*' !== postNumbers) {
      posts = posts.filter(({ postNumber }) => postNumber.hasOwnProperty(postNumber));
    }
    return posts;
  }, true);
  let refs = await PostReferencesModel.updateReferringPosts(posts);
  await PostReferencesModel.rerenderReferencedPosts(undefined, undefined, refs);
}

export async function copyPosts({ sourceBoardName, sourceThreadNumber, targetBoardName, initialPostNumber }) {
  let sourceBoard = Board.board(sourceBoardName);
  if (!sourceBoard) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let targetBoard = Board.board(targetBoardName);
  if (!targetBoard) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let Post = await client.collection('post');
  let posts = await Post.find({
    boardName: sourceBoardName,
    threadNumber: sourceThreadNumber
  }, { _id: 0 }).toArray();
  let postNumberMap = posts.reduce((acc, post, index) => {
    acc[post.number] = initialPostNumber + index;
    return acc;
  }, {});
  let toRerender = [];
  let toMarkup = [];
  posts = await Tools.series(posts, async function(post) {
    post.number = postNumberMap[post.number];
    post.boardName = targetBoardName;
    post.threadNumber = initialPostNumber;
    if (post.rawText) {
      let text = PostReferencesModel.replacePostLinks(post.rawText, sourceBoardName, post.referencedPosts,
        postNumberMap);
      if (text !== post.rawText) {
        post.text = await markup(targetBoardName, text, {
          markupModes: post.markup,
          accessLevel: post.user.level
        });
      }
    }
    post.extraData = await targetBoard.transformPostExtraData(post.extraData, sourceBoard);
    post.referencedPosts = PostReferencesModel.replacePostReferences(post.referencedPosts, {
      boardName: sourceBoardName,
      threadNumber: post.threadNumber
    }, {
      boardName: targetBoardName,
      threadNumber: initialPostNumber
    }, postNumberMap, toRerender);
    post.referringPosts = PostReferencesModel.replacePostReferences(post.referringPosts, {
      boardName: sourceBoardName,
      threadNumber: post.threadNumber
    }, {
      boardName: targetBoardName,
      threadNumber: initialPostNumber
    }, postNumberMap, toMarkup);
    let newFileInfos = await FilesModel.copyFiles(post.fileInfos, sourceBoardName, targetBoardName);
    post.fileInfos = FilesModel.createFileInfos(newFileInfos, targetBoardName, post.number);
    return post;
  }, true);
  await Post.insertMany(posts);
  return {
    postNumberMap: postNumberMap,
    toRerender: toRerender,
    toMarkup: toMarkup
  };
}

export async function markupMovedThreadRelatedPosts({ posts, sourceBoardName, targetBoardName, postNumberMap }) {
  let Post = await client.collection('post');
  await Tools.series(posts, async function(post) {
    post = await getPost(post.boardName, post.postNumber, { withReferences: true });
    if (!post || !post.rawText) {
      return;
    }
    if (!post.rawText) {
      return;
    }
    let text = PostReferencesModel.replaceRelatedPostLinks({
      text: post.rawText,
      sourceBoardName: sourceBoardName,
      targetBoardName: targetBoardName,
      postBoardName: post.boardName,
      referencedPosts: post.referencedPosts,
      postNumberMap: postNumberMap
    });
    if (text !== post.rawText) {
      text = await markup(targetBoardName, text, {
        markupModes: post.markup,
        accessLevel: post.user.level
      });
    }
    await Post.updateOne({
      boardName: post.boardName,
      number: post.number
    }, {
      $set: { text: text }
    });
  });
}

export async function updateMovedThreadRelatedPosts({ posts, sourceBoardName, targetBoardName, sourceThreadNumber,
  targetThreadNumber, postNumberMap }) {
  let Post = await client.collection('post');
  await Tools.series(posts, async function(post) {
    post = await getPost(post.boardName, post.postNumber, { withReferences: true });
    if (!post) {
      return;
    }
    let { referencedPosts, referringPosts } = post;
    let source = {
      boardName: sourceBoardName,
      threadNumber: sourceThreadNumber
    };
    let target = {
      boardName: targetBoardName,
      threadNumber: targetThreadNumber
    };
    referencedPosts = PostReferencesModel.replaceRelatedPostReferences(referencedPosts, source, target, postNumberMap);
    referringPosts = PostReferencesModel.replaceRelatedPostReferences(referringPosts, source, target, postNumberMap);
    await Post.updateOne({
      boardName: post.boardName,
      number: post.number
    }, {
      $set: {
        referencedPosts: referencedPosts,
        referringPosts: referringPosts
      }
    });
  });
}

export async function getThreadPosts(boardName, threadNumber, { limit, offset, sort } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    throw new Error(Tools.translate('Invalid thread number'));
  }
  let Post = await client.collection('post');
  let cursor = Post.find({
    boardName: boardName,
    threadNumber: threadNumber
  }, createPostProjection({
    withExtraData: true,
    withFileInfos: true,
    withReferences: true
  }));
  if (sort) {
    cursor = cursor.sort({ number: -1 });
  }
  limit = Tools.option(limit, 'number', 0, { test: (l) => { return l > 0; } });
  offset = Tools.option(offset, 'number', 0, { test: (o) => { return o > 0; } });
  if (limit || offset) {
    cursor = cursor.limit(limit + offset);
  }
  let posts = await cursor.toArray();
  if (sort) {
    posts.reverse();
  }
  if (limit) {
    if (posts.length > limit) {
      posts.splice(0, posts.length - limit);
    } else if (offset) {
      posts.splice(0, offset);
    }
  }
  return posts;
}
