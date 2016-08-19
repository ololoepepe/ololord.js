import express from 'express';

import Board from '../boards/board';
import Captcha from '../captchas';
import markup from '../core/markup';
import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import PostCreationTransaction from '../storage/post-creation-transaction';
import * as IPC from '../helpers/ipc';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import * as Files from '../storage/files';
import geolocation from '../storage/geolocation';

let router = express.Router();

async function testParameters(boardName, mode, { fields, files, postNumber } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!fields) {
    fields = {};
  }
  if (!_(files).isArray()) {
    files = [];
  }
  let fileCount = 0;
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  let post;
  if (postNumber) {
    fileCount = await PostsModel.getPostFileCount(boardName, postNumber);
    if (typeof fields.text === 'undefined') {
      post = await PostsModel.getPost(boardName, postNumber);
      fields.text = post.rawText;
    }
  }
  await board.testParameters(mode, fields, files, fileCount);
  return post;
}

router.post('/action/markupText', async function(req, res, next) {
  try {
    let { fields: { boardName, text, markupMode, signAsOp, tripcode } } = await Tools.parseForm(req);
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true }); //TODO: Should it really be "write"?
    let rawText = text || '';
    await testParameters(boardName, 'markupText', { fields: fields });
    markupMode = markupMode || '';
    let markupModes = markup.markupModes(markupMode);
    text = await markup(boardName, text, {
      markupModes: markupModes,
      accessLevel: req.level(boardName)
    });
    let data = {
      boardName: boardName,
      text: text || null,
      rawText: rawText || null,
      options: {
        signAsOp: ('true' === signAsOp),
        showTripcode: !!(req.hashpass && ('true' === tripcode))
      },
      createdAt: Tools.now().toISOString()
    };
    if (req.hashpass && tripcode) {
      data.tripcode = Tools.generateTripcode(req.hashpass);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/action/createPost', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Tools.parseForm(req);
    let { boardName, threadNumber, captchaEngine } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await Captcha.checkCaptcha(req.ip, fields);
    files = await Files.getFiles(fields, files);
    await testParameters(boardName, 'createPost', {
      fields: fields,
      files: files
    });
    transaction = new PostCreationTransaction(boardName);
    files = await Files.processFiles(boardName, files, transaction);
    let post = await PostsModel.createPost(req, fields, files, transaction);
    await IPC.render(post.boardName, post.threadNumber, post.number, 'create');
    //hasNewPosts.add(c.post.boardName + "/" + c.post.threadNumber); //TODO: pass to main process immediately
    if ('node-captcha-noscript' !== captchaEngine) {
      res.send({
        boardName: post.boardName,
        postNumber: post.number
      });
    } else {
      let hash = `post-${post.number}`;
      let path = `/${config('site.pathPrefix')}${post.boardName}/res/${post.threadNumber}.html#${hash}`;
      res.redirect(303, path);
    }
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/createThread', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Tools.parseForm(req);
    let { boardName, captchaEngine } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await Captcha.checkCaptcha(req.ip, fields);
    files = await Files.getFiles(fields, files);
    await testParameters(boardName, 'createThread', {
      fields: fields,
      files: files
    });
    transaction = new PostCreationTransaction(boardName);
    let thread = await ThreadsModel.createThread(req, fields, transaction);
    files = await Files.processFiles(boardName, files, transaction);
    let post = await PostsModel.createPost(req, fields, files, transaction, {
      postNumber: thread.number,
      date: new Date(thread.createdAt)
    });
    await IPC.render(post.boardName, post.threadNumber, post.number, 'create');
    if ('node-captcha-noscript' !== captchaEngine) {
      res.send({
        boardName: thread.boardName,
        threadNumber: thread.number
      });
    } else {
      res.redirect(303, `/${config('site.pathPrefix')}${thread.boardName}/res/${thread.number}.html`);
    }
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/editPost', async function(req, res, next) {
  try {
    let { fields } = await Tools.parseForm(req);
    let { boardName, postNumber } = fields;
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editPost');
    await testParameters(boardName, 'editPost', {
      fields: fields,
      postNumber: postNumber
    });
    let post = await PostsModel.editPost(req, fields);
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
    res.send({
      boardName: post.boardName,
      postNumber: post.number
    });
  } catch (err) {
    next(err);
  }
});

router.post('/action/addFiles', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Tools.parseForm(req);
    let { boardName, postNumber } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'addFilesToPost');
    let post = await PostsModel.getPost(boardName, postNumber);
    if (!post) {
      return Promise.reject(Tools.translate('No such post'));
    }
    files = await Files.getFiles(fields, files);
    if (files.length <= 0) {
      throw new Error(Tools.translate('No file specified'));
    }
    await testParameters(boardName, 'addFiles', {
      fields: fields,
      files: files,
      postNumber: postNumber
    });
    transaction = new PostCreationTransaction(boardName);
    files = await Files.processFiles(boardName, files, transaction);
    await FilesModel.addFiles(boardName, postNumber, files, transaction);
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
    res.send({});
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/deletePost', async function(req, res, next) {
  try {
    let { fields } = await Tools.parseForm(req);
    let { boardName, postNumber, password } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'deletePost', Tools.sha1(password));
    await PostsModel.deletePost(req, fields);
    res.send({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/deleteFile', async function(req, res, next) {
  try {
    let { fields } = await Tools.parseForm(req);
    let { fileName, password } = fields;
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    let fileInfo = await FilesModel.getFileInfoByName(fileName);
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    let { boardName, postNumber } = fileInfo;
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'deleteFile', Tools.sha1(password));
    let post = await testParameters(boardName, 'deleteFile', { postNumber: postNumber });
    await FilesModel.deleteFile(fileName);
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
    res.send({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/editFileRating', async function(req, res, next) {
  try {
    let { fields } = await Tools.parseForm(req);
    let { fileName, rating, password } = fields;
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    let fileInfo = await FilesModel.getFileInfoByName(fileName);
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    let { boardName, postNumber } = fileInfo;
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await UsersModel.checkGeoBan(req.geolocation);
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editFileRating', Tools.sha1(password));
    await FilesModel.editFileRating(fileName, rating);
    IPC.render(boardName, post.threadNumber, postNumber, 'edit');
    res.send({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/editAudioTags', async function(req, res, next) {
  let { fields } = await Tools.parseForm(req);
  let { fileName, password } = fields;
  if (!fileName || typeof fileName !== 'string') {
    throw new Error(Tools.translate('Invalid file name'));
  }
  let fileInfo = await FilesModel.getFileInfoByName(fileName);
  if (!fileInfo) {
    throw new Error(Tools.translate('No such file'));
  }
  if (!Tools.isAudioType(fileInfo.mimeType)) {
    throw new Error(Tools.translate('Not an audio file'));
  }
  let { boardName, postNumber } = fileInfo;
  await UsersModel.checkUserBan(req.ip, boardName, { write: true });
  req.geolocation = await geolocation(req.ip);
  await UsersModel.checkGeoBan(req.geolocation);
  await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editAudioTags', Tools.sha1(password));
  await FilesModel.editAudioTags(fileName, fields);
  IPC.render(boardName, post.threadNumber, postNumber, 'edit');
  res.send({});
});

export default router;
