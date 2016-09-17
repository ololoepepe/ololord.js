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
import Hash from '../storage/hash';
import Key from '../storage/key';
import redisClient from '../storage/redis-client-factory';
import sqlClient from '../storage/sql-client-factory';
import UnorderedSet from '../storage/unordered-set';

const mkpath = promisify('mkpath');

let ArchivedPosts = new Hash(sqlClient(), 'archivedPosts');
let Posts = new Hash(redisClient(), 'posts');
let PostsPlannedForDeletion = new UnorderedSet(redisClient(), 'postsPlannedForDeletion', {
  parse: false,
  stringify: false
});
let UserBans = new Key(redisClient(), 'userBans');

async function addDataToPost(board, post, { withExtraData, withFileInfos, withReferences } = {}) {
  let ban = await UserBans.get(`${post.user.ip}:${post.boardName}`);
  post.bannedFor = !!(ban && ban.postNumber === post.number);
  if (withExtraData) {
    let extraData = await board.loadExtraData(post.number, !!post.archived);
    post.extraData = extraData;
  }
  if (withFileInfos) {
    post.fileInfos = await FilesModel.getPostFileInfos(post.boardName, post.number, { archived: post.archived });
  }
  if (withReferences) {
    await PostReferencesModel.addReferencesToPost(post)
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
    post = await ArchivedPosts.getOne(key);
  }
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
  let mayBeArchivedPostNumbers = posts.map((post, index) => {
    return {
      post: post,
      index: index
    };
  }).filter((post) => !post.post).map((post) => {
    return {
      index: post.index,
      postNumber: postNumbers[post.index]
    };
  });
  if (mayBeArchivedPostNumbers.length > 0) {
    let numbers = mayBeArchivedPostNumbers.map(post => post.postNumber);
    let archivedPosts = await ArchivedPosts.getSome(numbers.map(postNumber => `${boardName}:${postNumber}`));
    archivedPosts.forEach((post, index) => {
      posts[mayBeArchivedPostNumbers[index].index] = post;
    });
  }
  if (posts.length <= 0) {
    return [];
  }
  let uniqueThreadNumbers = _(posts.map(post => post.threadNumber)).uniq();
  let threadsPostNumbers = await Tools.series(uniqueThreadNumbers, async function(threadNumber) {
    return await ThreadsModel.getThreadPostNumbers(boardName, threadNumber);
  }, true);
  threadsPostNumbers = threadsPostNumbers.reduce((acc, list, index) => {
    acc[uniqueThreadNumbers[index]] = list;
    return acc;
  }, {});
  await Tools.series(posts, async function(post, index) {
    if (!post) {
      return;
    }
    post.sequenceNumber = threadsPostNumbers[post.threadNumber].indexOf(post.number) + 1;
    await addDataToPost(board, post, options);
  });
  return posts;
}

export async function getPostKeys({ archived, nonArchived } = {}) {
  let archivedKeys = [];
  let nonArchivedKeys = [];
  if (archived) {
    archivedKeys = await ArchivedPosts.keys();
  }
  if (nonArchived || (!archived && !nonArchived)) {
    nonArchivedKeys = await Posts.keys();
  }
  return nonArchivedKeys.concat(archivedKeys);
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
  let plainText = text ? Renderer.plainText(text, { brToNewline: true }) : null;
  let post = {
    bannedFor: false,
    boardName: boardName,
    createdAt: date.toISOString(),
    geolocation: req.geolocationInfo,
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
  await board.storeExtraData(postNumber, extraData, false);
  await PostReferencesModel.addReferencedPosts(post, referencedPosts);
  await UsersModel.addUserPostNumber(req.ip, boardName, postNumber);
  await FilesModel.addFilesToPost(boardName, postNumber, files);
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

export async function rerenderPost(boardName, postNumber, { nogenerate } = {}) {
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
  let source = post.archived ? ArchivedPosts : Posts;
  await source.setOne(`${boardName}:${postNumber}`, post);
  await PostReferencesModel.removeReferencedPosts(post, { nogenerate: nogenerate });
  await PostReferencesModel.addReferencedPosts(post, referencedPosts, {
    nogenerate: nogenerate,
    archived: post.archived
  });
  if (!nogenerate) {
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
  }
}

export async function removePost(boardName, postNumber, { removingThread } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let key = `${boardName}:${postNumber}`
  await PostsPlannedForDeletion.addOne(key);
  let post = await getPost(boardName, postNumber, { withReferences: true });
  await ThreadsModel.removeThreadPostNumber(boardName, post.threadNumber, postNumber, { archived: post.archived });
  let source = post.archived ? ArchivedPosts : Posts;
  await source.deleteOne(key);
  try {
    await PostReferencesModel.rerenderReferringPosts(post, { removingThread: removingThread });
  } catch (err) {
    Logger.error(err.stack || err);
  }
  try {
    await PostReferencesModel.removeReferencedPosts(post);
  } catch (err) {
    Logger.error(err.stack || err);
  }
  await UsersModel.removeUserPostNumber(post.user.ip, boardName, postNumber);
  await FilesModel.removePostFileInfos(boardName, postNumber, { archived: post.archived });
  await board.removeExtraData(postNumber, !!post.archived);
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
  let key = `${boardName}:${postNumber}`;
  text = await markup(board.name, rawText, {
    markupModes: markupModes,
    referencedPosts: referencedPosts,
    accessLevel: req.level(board.name)
  });
  let plainText = text ? Renderer.plainText(text, { brToNewline: true }) : null;
  let extraData = await board.postExtraData(req, fields, null, post);
  if (post.hasOwnProperty('extraData')) {
    delete post.extraData;
  }
  if (post.hasOwnProperty('bannedFor')) {
    delete post.bannedFor;
  }
  post.markup = markupModes;
  post.name = name || null;
  post.plainText = plainText;
  post.rawText = rawText;
  post.subject = subject || null;
  post.text = text || null;
  post.updatedAt = date.toISOString();
  let source = post.archived ? ArchivedPosts : Posts;
  await source.setOne(key, post);
  await board.removeExtraData(postNumber, !!post.archived);
  await board.storeExtraData(postNumber, extraData, !!post.archived);
  await PostReferencesModel.removeReferencedPosts(post);
  await PostReferencesModel.addReferencedPosts(post, referencedPosts, { archived: post.archived });
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
    await ThreadsModel.removeThread(boardName, postNumber, { archived: archived });
  } else {
    await removePost(boardName, postNumber);
  }
  if (isThread && archived) {
    await Tools.series(['json', 'html'], async function(suffix) {
      return await FS.remove(`${__dirname}/../../public/${boardName}/arch/${postNumber}.${suffix}`);
    });
    await IPC.renderArchive(boardName);
  } else if (!archived) {
    await IPC.render(boardName, post.threadNumber, postNumber, isThread ? 'delete' : 'edit');
  }
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
  let postKeys = await getPostKeys({
    archived: true,
    nonArchived: true
  });
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

async function rebuildPostSearchIndex(boardName, postNumber) {
  let key = `${boardName}:${postNumber}`;
  let post = await getPost(boardName, postNumber);
  await Search.updatePostIndex(boardName, postNumber, (body) => {
    body.plainText = post.plainText;
    body.subject = post.subject;
    body.archived = !!post.archived;
    return body;
  });
}

export async function rebuildSearchIndex(targets) {
  return await forEachPost(targets || {}, async function(boardName, postNumber) {
    console.log(Tools.translate('Rebuilding post search index: >>/$[1]/$[2]', '', boardName, postNumber));
    return await rebuildPostSearchIndex(boardName, postNumber);
  });
}

export async function copyPosts({ sourceBoardName, postNumbers, targetBoardName, initialPostNumber }) {
  let targetBoard = Board.board(targetBoardName);
  if (!targetBoard) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let posts = await getPosts(sourceBoardName, postNumbers, {
    withFileInfos: true,
    withReferences: true,
    withExtraData: true
  });
  let postNumberMap = posts.reduce((acc, post, index) => {
    acc[post.number] = initialPostNumber + index;
    return acc;
  }, {});
  let sourcePath = `${__dirname}/../../public/${sourceBoardName}/src`;
  let sourceThumbPath = `${__dirname}/../../public/${sourceBoardName}/thumb`;
  let targetPath = `${__dirname}/../../public/${targetBoardName}/src`;
  let targetThumbPath = `${__dirname}/../../public/${targetBoardName}/thumb`;
  await mkpath(targetPath);
  await mkpath(targetThumbPath);
  let toUpdate = [];
  let toRerender = [];
  await Tools.series(posts, async function(post) {
    post.number = postNumberMap[post.number];
    post.boardName = targetBoardName;
    post.threadNumber = initialPostNumber;
    let { fileInfos, referencedPosts, referringPosts, extraData } = post;
    delete post.fileInfos;
    delete post.referencedPosts;
    delete post.referringPosts;
    delete post.extraData;
    if (post.hasOwnProperty('bannedFor')) {
      delete post.bannedFor;
    }
    if (post.rawText) {
      let text = PostReferencesModel.replacePostLinks(post.rawText, sourceBoardName, referencedPosts, postNumberMap);
      if (text !== post.rawText) {
        post.text = await markup(targetBoardName, text, {
          markupModes: post.markup,
          accessLevel: post.user.level
        });
        post.plainText = Renderer.plainText(text, { brToNewline: true });
      }
    }
    referencedPosts = PostReferencesModel.replacePostReferences(referencedPosts, {
      boardName: sourceBoardName,
      threadNumber: post.threadNumber
    }, {
      boardName: targetBoardName,
      threadNumber: initialPostNumber
    }, postNumberMap, toUpdate);
    referringPosts = PostReferencesModel.replacePostReferences(referringPosts, {
      boardName: sourceBoardName,
      threadNumber: post.threadNumber
    }, {
      boardName: targetBoardName,
      threadNumber: initialPostNumber
    }, postNumberMap, toRerender);
    await Tools.series(fileInfos, async function(fileInfo) {
      let oldFileName = fileInfo.name;
      let oldThumbName = fileInfo.thumb.name;
      let baseName = await IPC.send('fileName');
      fileInfo.name = fileInfo.name.replace(/^\d+/, baseName);
      fileInfo.thumb.name = fileInfo.thumb.name.replace(/^\d+/, baseName);
      await FS.copy(`${sourcePath}/${oldFileName}`, `${targetPath}/${fileInfo.name}`);
      await FS.copy(`${sourceThumbPath}/${oldThumbName}`, `${targetThumbPath}/${fileInfo.thumb.name}`);
    });
    await FilesModel.addFilesToPost(targetBoardName, post.number, fileInfos);
    await PostReferencesModel.storeReferencedPosts(targetBoardName, post.number, referencedPosts);
    await PostReferencesModel.storeReferringPosts(targetBoardName, post.number, referringPosts);
    await targetBoard.storeExtraData(post.number, extraData, false);
    await Posts.setOne(`${targetBoardName}:${post.number}`, post);
    await UsersModel.addUserPostNumber(post.user.ip, targetBoardName, post.number);
    await Search.indexPost({
      boardName: targetBoardName,
      postNumber: post.number,
      threadNumber: initialPostNumber,
      plainText: post.plainText,
      subject: post.subject
    });
  });
  return {
    postNumberMap: postNumberMap,
    toUpdate: toUpdate,
    toRerender: toRerender
  };
}

export async function rerenderMovedThreadRelatedPosts({ posts, sourceBoardName, targetBoardName, postNumberMap }) {
  await Tools.series(posts, async function(post) {
    post = await getPost(post.boardName, post.postNumber, { withReferences: true });
    if (!post || !post.rawText) {
      return;
    }
    let { referencedPosts } = post;
    delete post.referencedPosts;
    delete post.referringPosts;
    if (post.hasOwnProperty('bannedFor')) {
      delete post.bannedFor;
    }
    if (!post.rawText) {
      return;
    }
    let text = PostReferencesModel.replaceRelatedPostLinks({
      text: post.rawText,
      sourceBoardName: sourceBoardName,
      targetBoardName: targetBoardName,
      postBoardName: post.boardName,
      referencedPosts: referencedPosts,
      postNumberMap: postNumberMap
    });
    if (text !== post.rawText) {
      post.text = await markup(targetBoardName, text, {
        markupModes: post.markup,
        accessLevel: post.user.level
      });
      post.plainText = Renderer.plainText(text, { brToNewline: true });
    }
    let source = post.archived ? ArchivedPosts : Posts;
    await source.setOne(`${post.boardName}:${post.number}`, post);
    await Search.updatePostIndex(post.boardName, post.number, (body) => {
      body.plainText = post.plainText;
      return body;
    });
  });
}

export async function updateMovedThreadRelatedPosts({ posts, sourceBoardName, targetBoardName, sourceThreadNumber,
  targetThreadNumber, postNumberMap }) {
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
    await PostReferencesModel.removeReferencedPosts(post.boardName, post.number, { archived: post.archived });
    await PostReferencesModel.removeReferringPosts(post.boardName, post.number, { archived: post.archived });
    await PostReferencesModel.storeReferencedPosts(post.boardName, post.number, referencedPosts,
      { archived: post.archived });
    await PostReferencesModel.storeReferringPosts(post.boardName, post.number, referringPosts,
      { archived: post.archived });
  });
}

export async function pushPostToArchive(boardName, postNumber) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let key = `${boardName}:${postNumber}`;
  let post = await Posts.getOne(key);
  post.archived = true;
  await ArchivedPosts.setOne(key, post);
  await Posts.deleteOne(key);
  let extraData = await board.loadExtraData(postNumber, false);
  await board.storeExtraData(postNumber, extraData, true);
  await board.removeExtraData(postNumber, false);
  await Search.updatePostIndex(boardName, postNumber, (body) => {
    body.archived = true;
    return body;
  });
  await FilesModel.pushPostFileInfosToArchive(boardName, postNumber);
}
