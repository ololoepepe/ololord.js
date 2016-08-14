import _ from 'underscore';

import * as BoardsModel from './boards';
import * as FilesModel from './files';
import * as ThreadsModel from './threads';
import * as UsersModel from './users';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import Key from '../storage/key';
import * as Search from '../storage/search';
import UnorderedSet from '../storage/unordered-set';
import Board from '../boards/board';
import markup from '../core/markup';
import * as IPC from '../helpers/ipc';
import * as Tools from '../helpers/tools';

let FileInfos = new Hash(client(), 'fileInfos');
let PostFileInfoNames = new UnorderedSet(client(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
let Posts = new Hash(client(), 'posts');
let ReferringPosts = new Hash(client(), 'referringPosts');
let ReferencedPosts = new Hash(client(), 'referencedPosts');
let UserBans = new Key(client(), 'userBans');

function sortedReferences(references) {
  return _(references).toArray().sort((a, b) => {
    return (a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt))
      || a.boardName.localeCompare(b.boardName) || (a.postNumber - b.postNumber);
  }).map((reference) => {
    delete reference.createdAt;
    return reference;
  });
}

async function addDataToPost(board, post, { withExtraData, withFileInfos, withReferences } = {}) {
  let key = `${post.boardName}:${post.number}`;
  let ban = await UserBans.get(`${post.user.ip}:${post.boardName}`);
  post.bannedFor = !!(ban && ban.postNumber === post.number);
  if (withExtraData) {
    let extraData = await board.loadExtraData(post.number);
    post.extraData = extraData;
  }
  if (withFileInfos) {
    let fileNames = await PostFileInfoNames.getAll(key);
    let fileInfos = await FileInfos.getSome(fileNames);
    post.fileInfos = fileInfos;
  }
  if (withReferences) {
    let referringPosts = await ReferringPosts.getAll(key);
    let referencedPosts = await ReferencedPosts.getAll(key);
    post.referringPosts = sortedReferences(referringPosts);
    post.referencedPosts = sortedReferences(referencedPosts);
  }
}

export async function getPost(boardName, postNumber, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let key = `${boardName}:${postNumber}`;
  let post = await Posts.getOne(key);
  if (!post) {
    return post;
  }
  let threadPostNumbers = await ThreadsModel.getThreadPostNumbers(boardName, post.threadNumber);
  post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
  await addDataToPost(board, post, options);
  return post;
}

export async function getPosts(boardName, postNumbers, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!_(postNumbers).isArray()) {
    postNumbers = [postNumbers];
  }
  postNumbers = postNumbers.map((postNumber) => {
    return Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  });
  if (postNumbers.some(postNumber => !postNumber)) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let posts = await Posts.getSome(postNumbers.map(postNumber => `${boardName}:${postNumber}`));
  posts = _(posts).toArray();
  if (posts.length <= 0) {
    return [];
  }
  let threadPostNumbers = await ThreadsModel.getThreadPostNumbers(boardName, posts[0].threadNumber);
  await Tools.series(posts, async function(post, index) {
    if (!post) {
      return;
    }
    post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
    await addDataToPost(board, post, options);
  });
  return posts;
}

export async function getPostKeys() {
  return await Posts.keys();
}

export async function addReferencedPosts(post, referencedPosts, { nogenerate } = {}) {
  let key = `${post.boardName}:${post.number}`;
  //TODO: Optimise (hmset)
  await Tools.series(referencedPosts, async function(ref, refKey) {
    await ReferencedPosts.setOne(refKey, ref, key);
    await ReferringPosts.setOne(key, {
      boardName: post.boardName,
      postNumber: post.number,
      threadNumber: post.threadNumber,
      createdAt: refKey.createdAt
    }, refKey);
  });
  if (!nogenerate) {
    _(referencedPosts).each((ref, refKey) => {
      if (ref.boardName !== post.boardName || ref.threadNumber !== post.threadNumber) {
        IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
      }
    });
  }
}

export async function createPost(req, fields, files, transaction, { postNumber, date } = {}) {
  let { boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password } = fields;
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!board.postingEnabled) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled at this board')));
  }
  date = date || Tools.now();
  if (postNumber) {
    threadNumber = postNumber;
  }
  let rawText = text || null;
  let markupModes = Tools.markupModes(markupMode);
  let referencedPosts = {};
  sage = ('true' === sage);
  tripcode = ('true' === tripcode);
  signAsOp = ('true' === signAsOp);
  password = Tools.sha1(password);
  hashpass = (req.hashpass || null);
  let thread = await ThreadsModel.getThread(boardName, threadNumber);
  if (!thread) {
    return Promise.reject(new Error(Tools.translate('No such thread')));
  }
  if (thread.closed) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled in this thread')));
  }
  let unbumpable = !!thread.unbumpable;
  let accessLevel = req.level(boardName) || null;
  let postCount = await ThreadsModel.getThreadPostCount(boardName, threadNumber);
  if (postCount >= board.postLimit) {
    return Promise.reject(new Error(Tools.translate('Post limit reached')));
  }
  text = await markup(boardName, rawText, {
    markupModes: markupModes,
    referencedPosts: referencedPosts,
    accessLevel: accessLevel
  });
  let extraData = await board.postExtraData(req, fields, files);
  if (typeof extraData === 'undefined') {
    extraData = null;
  }
  if (!postNumber) {
    postNumber = await BoardsModel.nextPostNumber(boardName);
  }
  let post = {
    bannedFor: false,
    boardName: boardName,
    createdAt: date.toISOString(),
    geolocation: req.geolocation,
    markup: markupModes,
    name: name || null,
    number: postNumber,
    options: {
      sage: sage,
      showTripcode: !!req.hashpass && tripcode,
      signAsOp: signAsOp
    },
    rawText: rawText,
    subject: subject || null,
    text: text || null,
    plainText: (text ? Tools.plainText(text, { brToNewline: true }) : null),
    threadNumber: threadNumber,
    updatedAt: null,
    user: {
      hashpass: hashpass,
      ip: req.ip,
      level: accessLevel,
      password: password
    }
  };
  transaction.setPostNumber(postNumber);
  await Posts.setOne(`${boardName}:${postNumber}`, post);
  await board.storeExtraData(postNumber, extraData);
  await addReferencedPosts(post, referencedPosts);
  await UsersModel.addUserPostNumber(req.ip, boardName, postNumber);
  await Tools.series(files, async function(fileInfo) {
    file.boardName = boardName;
    file.postNumber = postNumber;
    await FilesModel.addFileInfo(fileInfo);
    await PostFileInfoNames.addOne(fileInfo.name, `${boardName}:${postNumber}`);
  });
  await FilesModel.addFileHashes(files);
  await Search.indexPost({
    boardName: boardName,
    postNumber: postNumber,
    threadNumber: threadNumber,
    plainText: plainText,
    subject: subject
  });
  await ThreadsModel.addThreadPostNumber(boardName, threadNumber, postNumber);
  if (!sage && postCount < board.bumpLimit && !unbumpable) {
    await ThreadsModel.setThreadUpdateTime(boardName, threadNumber, date.toISOString());
  }
  post.referencedPosts = referencedPosts;
  post.fileInfos = files;
  return post;
}

export async function removePost(boardName, postNumber, { removingThread, leaveReferences, leaveFileInfos } = {}) {
  var board = Board.board(boardName);
  if (!board)
      return Promise.reject(Tools.translate("Invalid board"));
  var c = {};
  return db.sadd("postsPlannedForDeletion", boardName + ":" + postNumber).then(function() {
      return PostsModel.getPost(boardName, postNumber, { withReferences: true });
  }).then(function(post) {
      c.post = post;
      return db.srem("threadPostNumbers:" + boardName + ":" + post.threadNumber, postNumber);
  }).then(function() {
      return db.hdel("posts", boardName + ":" + postNumber);
  }).then(function() {
      if (options && options.leaveReferences)
          return Promise.resolve();
      return rerenderReferringPosts(c.post, { removingThread: options && options.removingThread });
  }).catch(function(err) {
      Logger.error(err.stack || err);
  }).then(function() {
      if (options && options.leaveReferences)
          return Promise.resolve();
      return removeReferencedPosts(c.post);
  }).catch(function(err) {
      Logger.error(err.stack || err);
  }).then(function() {
      return db.srem("userPostNumbers:" + c.post.user.ip + ":" + board.name, postNumber);
  }).then(function() {
      return postFileInfoNames(boardName, postNumber);
  }).then(function(names) {
      c.fileInfoNames = names;
      return Promise.all(names.map(function(name) {
          return db.hget("fileInfos", name);
      }));
  }).then(function(fileInfos) {
      if (options && options.leaveFileInfos)
          return Promise.resolve();
      c.fileInfos = [];
      c.paths = [];
      fileInfos.forEach(function(fileInfo) {
          if (!fileInfo)
              return;
          fileInfo = JSON.parse(fileInfo);
          c.fileInfos.push(fileInfo);
          c.paths.push(__dirname + "/../public/" + boardName + "/src/" + fileInfo.name);
          c.paths.push(__dirname + "/../public/" + boardName + "/thumb/" + fileInfo.thumb.name);
      });
      return db.del("postFileInfoNames:" + boardName + ":" + postNumber);
  }).then(function() {
      if (options && options.leaveFileInfos)
          return Promise.resolve();
      return Promise.all(c.fileInfoNames.map(function(name) {
          return db.hdel("fileInfos", name);
      }));
  }).then(function() {
      if (options && options.leaveFileInfos)
          return Promise.resolve();
      return removeFileHashes(c.fileInfos);
  }).then(function() {
      return board.removeExtraData(postNumber);
  }).then(function() {
      return es.delete({
          index: "ololord.js",
          type: "posts",
          id: boardName + ":" + postNumber
      });
  }).then(function() {
      if (!options || !options.leaveFileInfos) {
          c.paths.forEach(function(path) {
              return FS.remove(path).catch(function(err) {
                  Logger.error(err.stack || err);
              });
          });
      }
      return db.srem("postsPlannedForDeletion", boardName + ":" + postNumber);
  });
}
