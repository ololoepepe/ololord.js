import _ from 'underscore';
import express from 'express';

import Board from '../boards/board';
import Captcha from '../captchas/captcha';
import * as Files from '../core/files';
import geolocation from '../core/geolocation';
import config from '../helpers/config';
import * as IPC from '../helpers/ipc';
import PostCreationTransaction from '../helpers/post-creation-transaction';
import * as Tools from '../helpers/tools';
import markup from '../markup';
import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as ThreadsModel from '../models/threads';
import * as UsersModel from '../models/users';

let router = express.Router();

async function testParameters(req, boardName, mode, { fields, files, postNumber } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
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
    post = await PostsModel.getPost(boardName, postNumber);
    if (typeof fields.text === 'undefined') {
      fields.text = post.rawText;
    }
    fileCount = await FilesModel.getPostFileCount(boardName, postNumber, { archived: post.archived });
  }
  await board.testParameters({
    req: req,
    mode: mode,
    fields: fields,
    files: files,
    existingFileCount: fileCount
  });
  return post;
}

router.post('/action/markupText', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, text, markupMode, signAsOp, tripcode } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    let rawText = text || '';
    await testParameters(req, boardName, 'markupText', { fields: fields });
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
      data.tripcode = board.generateTripcode(req.hashpass);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/action/createPost', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Files.parseForm(req);
    let { boardName, threadNumber, captchaEngine } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await Captcha.checkCaptcha(req, fields);
    files = await Files.getFiles(fields, files);
    await testParameters(req, boardName, 'createPost', {
      fields: fields,
      files: files
    });
    transaction = new PostCreationTransaction(boardName);
    files = await Files.processFiles(boardName, files, transaction);
    let post = await PostsModel.createPost(req, fields, files, transaction);
    IPC.send('notifyAboutNewPosts', `${boardName}/${threadNumber}`);
    if ('node-captcha-noscript' !== captchaEngine) {
      res.json({
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
    let { fields, files } = await Files.parseForm(req);
    let { boardName, captchaEngine } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await Captcha.checkCaptcha(req, fields);
    files = await Files.getFiles(fields, files);
    await testParameters(req, boardName, 'createThread', {
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
    if ('node-captcha-noscript' !== captchaEngine) {
      res.json({
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
    let { fields } = await Files.parseForm(req);
    let { boardName, postNumber } = fields;
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editPost');
    await testParameters(req, boardName, 'editPost', {
      fields: fields,
      postNumber: postNumber
    });
    let post = await PostsModel.editPost(req, fields);
    res.json({
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
    let { fields, files } = await Files.parseForm(req);
    let { boardName, postNumber } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'addFilesToPost');
    let post = await PostsModel.getPost(boardName, postNumber);
    if (!post) {
      throw new Error(Tools.translate('No such post'));
    }
    files = await Files.getFiles(fields, files);
    if (files.length <= 0) {
      throw new Error(Tools.translate('No file specified'));
    }
    await testParameters(req, boardName, 'addFiles', {
      fields: fields,
      files: files,
      postNumber: postNumber
    });
    transaction = new PostCreationTransaction(boardName);
    files = await Files.processFiles(boardName, files, transaction);
    await FilesModel.addFilesToPost(boardName, postNumber, files, { archived: post.archived });
    res.json({});
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/deletePost', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, postNumber, password } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'deletePost', Tools.sha1(password));
    let isThread = await ThreadsModel.threadExists(boardName, postNumber);
    if (isThread) {
      await ThreadsModel.deleteThread(boardName, postNumber);
    } else {
      await PostsModel.deletePost(boardName, postNumber);
    }
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/deleteFile', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { fileName, password } = fields;
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    let fileInfo = await FilesModel.getFileInfoByName(fileName);
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    let { boardName, postNumber } = fileInfo;
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'deleteFile', Tools.sha1(password));
    let post = await testParameters(req, boardName, 'deleteFile', { postNumber: postNumber });
    await FilesModel.deleteFile(fileName);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/editFileRating', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { fileName, rating, password } = fields;
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    let fileInfo = await FilesModel.getFileInfoByName(fileName);
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    let { boardName, postNumber } = fileInfo;
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editFileRating', Tools.sha1(password));
    await FilesModel.editFileRating(fileName, rating);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/editAudioTags', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { fileName, password } = fields;
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    let fileInfo = await FilesModel.getFileInfoByName(fileName);
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    if (!Files.isAudioType(fileInfo.mimeType)) {
      throw new Error(Tools.translate('Not an audio file'));
    }
    let { boardName, postNumber } = fileInfo;
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, postNumber, 'editAudioTags', Tools.sha1(password));
    await FilesModel.editAudioTags(fileName, fields);
    res.json({});
  } catch (err) {
    next(err);
  }
});

export default router;
