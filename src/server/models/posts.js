import _ from 'underscore';

import * as BoardsModel from './board';
import * as FilesModel from './files';
import * as ThreadsModel from './threads';
import * as UsersModel from './users';
import Board from '../boards/board';
import markup from '../core/markup';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import Key from '../storage/key';
import * as Search from '../storage/search';
import UnorderedSet from '../storage/unordered-set';

let FileInfos = new Hash(client(), 'fileInfos');
let PostFileInfoNames = new UnorderedSet(client(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
let Posts = new Hash(client(), 'posts');
let PostsPlannedForDeletion = new UnorderedSet(client(), 'postsPlannedForDeletion', {
  parse: false,
  stringify: false
});
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
  let markupModes = markup.markupModes(markupMode);
  let referencedPosts = {};
  sage = ('true' === sage);
  tripcode = ('true' === tripcode);
  signAsOp = ('true' === signAsOp);
  password = Tools.sha1(password);
  let hashpass = (req.hashpass || null);
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
  let plainText = text ? Tools.plainText(text, { brToNewline: true }) : null;
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
    plainText: plainText,
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
  await Tools.series(files, async function(file) {
    file.boardName = boardName;
    file.postNumber = postNumber;
    await FilesModel.addFileInfo(file);
    await PostFileInfoNames.addOne(file.name, `${boardName}:${postNumber}`);
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

async function removeReferencedPosts({ boardName, number, threadNumber }, { nogenerate } = {}) {
  let key = `${boardName}:${number}`;
  let referencedPosts = await ReferencedPosts.getAll(key);
  await Tools.series(referencedPosts, async function(ref, refKey) {
    return await ReferringPosts.deleteOne(key, refKey);
  });
  if (!nogenerate) {
    _(referencedPosts).filter((ref) => {
      return (ref.boardName !== boardName) || (ref.threadNumber !== threadNumber);
    }).forEach((ref) => {
      IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
    });
  }
  ReferencedPosts.delete(key);
}

async function rerenderPost(boardName, postNumber, { nogenerate } = {}) {
  let post = await getPost(boardName, postNumber);
  if (!post) {
    return Promise.reject(new Error(Tools.translate('No such post')));
  }
  let referencedPosts = {};
  let text = await markup(boardName, post.rawText, {
    markupModes: post.markup,
    referencedPosts: referencedPosts,
    accessLevel: post.user.level
  });
  post.text = text;
  await Posts.setOne(`${boardName}:${postNumber}`, post);
  await removeReferencedPosts(post, { nogenerate: nogenerate });
  await addReferencedPosts(post, referencedPosts, { nogenerate: nogenerate });
  if (!nogenerate) {
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
  }
}

async function rerenderReferringPosts({ boardName, number, threadNumber }, { removingThread } = {}) {
  let referringPosts = ReferringPosts.getAll(`${boardName}:${number}`);
  referringPosts = _(referringPosts).filter((ref) => {
    return !removingThread || ref.boardName !== boardName || ref.threadNumber !== threadNumber;
  });
  await Tools.series(referringPosts, async function(ref) {
    return await rerenderPost(ref.boardName, ref.postNumber);
  });
}

export async function removePost(boardName, postNumber, { removingThread, leaveReferences, leaveFileInfos } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let key = `${boardName}:${postNumber}`
  await PostsPlannedForDeletion.addOne(key);
  let post = await getPost(boardName, postNumber, { withReferences: true });
  await ThreadsModel.removeThreadPostNumber(boardName, post.threadNumber, postNumber);
  await Posts.deleteOne(key);
  if (!leaveReferences) {
    try {
      await rerenderReferringPosts(post, { removingThread: removingThread });
    } catch (err) {
      Logger.error(err.stack || err);
    }
    try {
      await removeReferencedPosts(post);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }
  await UsersModel.removeUserPostNumber(post.user.ip, boardName, postNumber);
  if (!leaveFileInfos) {
    let fileNames = await PostFileInfoNames.getAll(key);
    let fileInfos = await Tools.series(fileNames, async function(fileName) {
      return await FilesModel.getFileInfoByName(fileName);
    }, true);
    fileInfos = fileInfos.filter(fileInfo => !!fileInfo);
    let paths = fileInfos.map((fileInfo) => {
      return [
        `${__dirname}/../public/${boardName}/src/${fileInfo.name}`,
        `${__dirname}/../public/${boardName}/thumb/${fileInfo.thumb.name}`
      ];
    });
    await PostFileInfoNames.delete(key);
    await FilesModel.removeFileInfos(fileNames);
    await FilesModel.removeFileHashes(fileInfos);
    Tools.series(_(paths).flatten(), async function(path) {
      try {
        await FS.remove(path);
      } catch (err) {
        Logger.error(err.stack || err);
      }
    });
  }
  await board.removeExtraData(postNumber);
  await Search.removePostIndex(boardName, postNumber);
  await PostsPlannedForDeletion.deleteOne(key);
}

export async function editPost(req, fields) {
  let { boardName, postNumber, text, name, subject, sage, markupMode } = fields;
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let date = Tools.now();
  let rawText = text || null;
  let markupModes = markup.markupModes(markupMode);
  let referencedPosts = {};
  sage = ('true' === sage);
  let post = await getPost(boardName, postNumber, { withExtraData: true });
  if (!post) {
    return Promise.reject(new Error(Tools.translate('Invalid post')));
  }
  /*
  return db.hget("threads:" + board.name, c.post.threadNumber);
  if (!thread)
      return Promise.reject(Tools.translate("No such thread"));
  */
  let key = `${boardName}:${postNumber}`;
  text = await markup(board.name, rawText, {
    markupModes: /*markupModes*/post.markup, //TODO ???
    referencedPosts: referencedPosts,
    accessLevel: req.level(board.name)
  });
  let plainText = text ? Tools.plainText(text, { brToNewline: true }) : null;
  let extraData = await board.postExtraData(req, fields, null, post);
  //post.markup = markupModes; //TODO ???
  post.name = name || null;
  post.plainText = plainText;
  post.rawText = rawText;
  post.subject = subject || null;
  post.text = text || null;
  post.updatedAt = date.toISOString();
  //delete post.bannedFor; //TODO: WTF?
  await Posts.setOne(key, post);
  await board.removeExtraData(postNumber);
  await board.storeExtraData(postNumber, extraData);
  await removeReferencedPosts(post);
  await addReferencedPosts(post, referencedPosts);
  await Search.updatePostIndex(boardName, postNumber, (body) => {
    body.plainText = plainText;
    body.subject = subject;
    return body;
  });
  return post;
}

export async function deletePost(req, { boardName, postNumber, archived }) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let post = await getPost(boardName, postNumber);
  if (!post) {
    return Promise.reject(new Error(Tools.translate('No such post')));
  }
  let isThread = post.threadNumber === post.number;
  archived = ('true' === archived);
  if (archived && !isThread) {
    return Promise.reject(new Error(Tools.translate('Deleting posts from archived threads is not allowed')));
  }
  if (isThread) {
    await removeThread(boardName, postNumber, { archived: archived });
  } else {
    await removePost(boardName, postNumber);
  }
  if (isThread && archived) {
    await Tools.series(['json', 'html'], async function(suffix) {
      return await FS.remove(`${__dirname}/../public/${boardName}/arch/${postNumber}.${suffix}`);
    });
    await IPC.renderArchive(boardName);
  } else if (!archived) {
    await IPC.render(boardName, post.threadNumber, postNumber, isThread ? 'delete' : 'edit');
  }
}

export async function getPostFileCount(boardName, postNumber) {
  return await PostFileInfoNames.count(`${boardName}:${postNumber}`);
}

async function forEachPost(targets, action) {
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
  let postKeys = await Posts.keys();
  postKeys = postKeys.reduce((acc, key) => {
    let [boardName, postNumber] = key.split(':');
    let set = acc.get(boardName);
    if (!set) {
      set = new Set();
      acc.set(boardName, set);
    }
    set.add(+postNumber);
    return acc;
  }, new Map());
  await Tools.series(targets, async function(postNumbers, boardName) {
    if (typeof postNumbers !== 'string' && !_(postNumbers).isArray()) {
      return;
    }
    if (!Board.board(boardName)) {
      Logger.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
      return;
    }
    let set = postKeys.get(boardName);
    if ('*' === postNumbers) {
      postNumbers = set ? Array.from(set) : [];
    } else {
      postNumbers = set ? postNumbers.filter(postNumber => set.has(postNumber)) : [];
    }
    return await Tools.series(postNumbers, async function(postNumber) {
      try {
        return await action(boardName, postNumber);
      } catch (err) {
        Logger.error(err.stack || err);
      }
    });
  });
}

export async function rerenderPosts(targets) {
  return await forEachPost(targets, async function(boardName, postNumber) {
    console.log(Tools.translate('Rendering post: >>/$[1]/$[2]', '', boardName, postNumber));
    return await rerenderPost(boardName, postNumber, { nogenerate: true });
  });
}

async function rebuildPostSearchIndex(boardName, postNumber, threads) {
  threads = threads || new Map();
  let key = `${boardName}:${postNumber}`;
  let post = await getPost(boardName, postNumber);
  let threadNumber = post.threadNumber;
  let threadKey = `${boardName}:${threadNumber}`;
  let thread = threads.get(threadKey);
  if (!thread) {
    thread = await ThreadsModel.getThread(boardName, threadNumber);
    if (!thread) {
      return Promise.reject(new Error(Tools.translate('No such thread: >>/$[1]/$[2]', '', boardName, threadNumber)));
    }
    threads.set(threadKey, thread);
  }
  await Search.updatePostIndex(boardName, postNumber, (body) => {
    body.plainText = post.plainText;
    body.subject = post.subject;
    body.archived = !!thread.archived;
    return body;
  });
}

export async function rebuildSearchIndex() {
  let threads = new Map();
  return await forEachPost(targets, async function(boardName, postNumber) {
    console.log(Tools.translate('Rebuilding post search index: >>/$[1]/$[2]', '', boardName, postNumber));
    return await rebuildPostSearchIndex(boardName, postNumber, threads);
  });
}