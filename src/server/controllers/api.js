import _ from 'underscore';
import Express from 'express';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';

import Board from '../boards/board';
import Captcha from '../captchas/captcha';
import * as Files from '../core/files';
import * as Tools from '../helpers/tools';
import * as BoardsModel from '../models/boards';
import * as ChatsModel from '../models/chats';
import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as ThreadsModel from '../models/threads';
import * as UsersModel from '../models/users';

const TEXT_FORMATS = new Set(['txt', 'js', 'json', 'jst', 'html', 'xml', 'css', 'md', 'example', 'gitignore', 'log']);

let router = Express.Router();

router.get('/api/post.json', async function(req, res, next) {
  if (!req.query.boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    await UsersModel.checkUserBan(req.ip, req.query.boardName);
    let post = await PostsModel.getPost(req.query.boardName, +req.query.postNumber, {
      withFileInfos: true,
      withReferences: true,
      withExtraData: true
    });
    if (!post) {
      return res.json(null);
    }
    let board = Board.board(post.boardName);
    await Files.renderPostFileInfos(post);
    post = await board.renderPost(post);
    res.json(post || null);
  } catch (err) {
    next(err);
  }
});

router.get('/api/threadInfo.json', async function(req, res, next) {
  if (!req.query.boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    await UsersModel.checkUserBan(req.ip, req.query.boardName);
    let threadInfo = await ThreadsModel.getThreadInfo(req.query.boardName, +req.query.threadNumber,
      { lastPostNumber: +req.query.lastPostNumber });
    res.json(threadInfo);
  } catch (err) {
    next(err);
  }
});

router.get('/api/threadInfos.json', async function(req, res, next) {
  let threads = req.query.threads;
  if (!_(threads).isArray()) {
    threads = [threads];
  }
  try {
    let boardNames = (threads || []).map(thread => thread.split(':').shift());
    await UsersModel.checkUserBan(req.ip, boardNames);
    let threadInfos = await Tools.series(threads || [], async function(thread) {
      let [boardName, threadNumber, lastPostNumber] = thread.split(':');
      return await ThreadsModel.getThreadInfo(boardName, +threadNumber, { lastPostNumber: +lastPostNumber });
    }, true);
    res.json(threadInfos);
  } catch (err) {
    next(err);
  }
});

router.get('/api/threadLastPostNumber.json', async function(req, res, next) {
  let boardName = req.query.boardName;
  if (!boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    await UsersModel.checkUserBan(req.ip, boardName);
    let threadLastPostNumber = await ThreadsModel.getThreadLastPostNumber(boardName, +req.query.threadNumber);
    res.json({ lastPostNumber: threadLastPostNumber });
  } catch (err) {
    next(err);
  }
});

router.get('/api/threadLastPostNumbers.json', async function(req, res, next) {
  let threads = req.query.threads;
  if (!_(threads).isArray()) {
    threads = [threads];
  }
  try {
    let boardNames = (threads || []).map(thread => thread.split(':').shift());
    await UsersModel.checkUserBan(req.ip, boardNames);
    let threadLastPostNumbers = await Tools.series(threads || [], async function(thread) {
      let [boardName, threadNumber] = thread.split(':');
      return await ThreadsModel.getThreadLastPostNumber(boardName, +threadNumber);
    }, true);
    res.json(threadLastPostNumbers);
  } catch (err) {
    next(err);
  }
});

router.get('/api/fileInfo.json', async function(req, res, next) {
  try {
    let fileInfo = null;
    if (req.query.fileName) {
      fileInfo = await FilesModel.getFileInfoByName(req.query.fileName);
    } else if (req.query.fileHash) {
      fileInfo = await FilesModel.getFileInfoByHash(req.query.fileHash);
    } else {
      return next(Tools.translate('Neither file name nor hash is specified'));
    }
    res.json(fileInfo);
  } catch (err) {
    next(err);
  }
});

router.get('/api/fileExistence.json', async function(req, res, next) {
  try {
    let exists = false;
    if (req.query.fileName) {
      exists = await FilesModel.fileInfoExistsByName(req.query.fileName);
    } else if (req.query.fileHash) {
      exists = await FilesModel.fileInfoExistsByHash(req.query.fileHash);
    } else {
      return next(Tools.translate('Neither file name nor hash is specified'));
    }
    res.json(exists);
  } catch (err) {
    next(err);
  }
});

router.get('/api/lastPostNumber.json', async function(req, res, next) {
  if (!req.query.boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    let lastPostNumber = await BoardsModel.getLastPostNumber(req.query.boardName);
    res.json({ lastPostNumber: lastPostNumber });
  } catch (err) {
    next(err);
  }
});

router.get('/api/lastPostNumbers.json', async function(req, res, next) {
  let boardNames = req.query.boardNames;
  if (!boardNames) {
    boardNames = Board.boardNames();
  } else if (!_(boardNames).isArray()) {
    boardNames = [boardNames];
  }
  try {
    let lastPostNumbers = await BoardsModel.getLastPostNumbers(boardNames);
    res.json(_(lastPostNumbers).reduce((acc, lastPostNumber, index) => {
      acc[boardNames[index]] = lastPostNumber;
      return acc;
    }, {}));
  } catch (err) {
    next(err);
  }
});

router.get('/api/chatMessages.json', async function(req, res, next) {
  try {
    let chats = await ChatsModel.getChatMessages(req, req.query.lastRequestDate);
    res.json(chats);
  } catch (err) {
    next(err);
  }
});

router.get('/api/synchronization.json', async function(req, res, next) {
  if (!req.query.key) {
    return next(Tools.translate('No key specified'));
  }
  try {
    let data = await UsersModel.getSynchronizationData(req.query.key);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/api/captchaQuota.json', async function(req, res, next) {
  if (!req.query.boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    await UsersModel.checkUserBan(req.ip, req.query.boardName);
    let quota = await UsersModel.getUserCaptchaQuota(req.query.boardName, req.ip);
    res.json({ quota: quota });
  } catch (err) {
    next(err);
  }
});

router.get('/api/userIp.json', async function(req, res, next) {
  if (!req.query.boardName) {
    return next(Tools.translate('Invalid board'));
  }
  try {
    await UsersModel.checkUserBan(req.ip, req.query.boardName);
    if (!req.isModer()) {
      return next(Tools.translate('Not enough rights'));
    }
    let ip = await UsersModel.getUserIP(req.query.boardName, +req.query.postNumber);
    res.json(Tools.addIPv4({ ip: ip }));
  } catch(err) {
    next(err);
  }
});

router.get('/api/bannedUser.json', async function(req, res, next) {
  let ip = Tools.correctAddress(req.query.ip);
  if (!ip) {
    return next(Tools.translate('Invalid IP address'));
  }
  if (!req.isModer()) {
    return next(Tools.translate('Not enough rights'));
  }
  try {
    let bans = await UsersModel.getBannedUserBans(ip, Board.boardNames().filter(boardName => req.isModer(boardName)));
    res.json(Tools.addIPv4({
      ip: ip,
      bans: bans
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/api/bannedUsers.json', async function(req, res, next) {
  if (!req.isModer()) {
    return next(Tools.translate('Not enough rights'));
  }
  try {
    let users = await UsersModel.getBannedUsers(Board.boardNames().filter(boardName => req.isModer(boardName)));
    res.json(_(users).map((bans, ip) => {
      return Tools.addIPv4({
        ip: ip,
        bans: bans
      });
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/api/registeredUser.json', async function(req, res, next) {
  if (!req.isSuperuser()) {
    return next(Tools.translate('Not enough rights'));
  }
  let hashpass = req.query.hashpass;
  if (!Tools.mayBeHashpass(hashpass)) {
    return next(Tools.translate('Invalid hashpass'));
  }
  try {
    let user = await UsersModel.getRegisteredUser(hashpass);
    res.json(Tools.addIPv4(user));
  } catch (err) {
    next(err);
  }
});

router.get('/api/registeredUsers.json', async function(req, res, next) {
  if (!req.isSuperuser()) {
    return next(Tools.translate('Not enough rights'));
  }
  try {
    let users = await UsersModel.getRegisteredUsers();
    res.json(users.map(user => Tools.addIPv4(user)));
  } catch (err) {
    next(err);
  }
});

router.get('/api/fileTree.json', async function(req, res, next) {
  if (!req.isSuperuser()) {
    return next(Tools.translate('Not enough rights'));
  }
  try {
    let dir = req.query.dir;
    if (!dir || '#' === dir) {
      dir = './';
    }
    if ('/' !== dir.slice(-1)[0]) {
      dir += '/';
    }
    let path = `${__dirname}/../${dir}`;
    let list = await FS.list(path);
    list = await Tools.series(list, async function(file) {
      let stat = await FS.stat(`${path}/${file}`);
      let node = {
        id: dir + file,
        text: file
      };
      if (stat.isDirectory()) {
        node.type = 'folder';
        node.children = true;
      } else if (stat.isFile()) {
        node.type = 'file';
      }
      return node;
    }, true);
    res.json(list);
  } catch (err) {
    if ('ENOENT' === err.code) {
      err.status = 404;
    } else if ('ENOTDIR' === err.code) {
      err = Tools.translate('Not a directory');
    }
    next(err);
  }
});

router.get('/api/fileContent.json', async function(req, res, next) {
  if (!req.isSuperuser()) {
    return next(Tools.translate('Not enough rights'));
  }
  try {
    let encoding = !TEXT_FORMATS.has((req.query.fileName || '').split('.').pop()) ? 'b' : undefined;
    let content = await FS.read(`${__dirname}/../${req.query.fileName}`, encoding);
    res.json({ content: content });
  } catch (err) {
    if ('ENOENT' === err.code) {
      err.status = 404;
    } else if ('EISDIR' === err.code) {
      err = Tools.translate('Not a file');
    }
    next(err);
  }
});

router.get('/api/fileHeaders.json', async function(req, res, next) {
  if (!req.query.url) {
    return next(Tools.translate('Invalid URL'));
  }
  try {
    let options = {
      method: 'HEAD',
      timeout: Tools.MINUTE //TODO: magic numbers
    };
    let proxy = Tools.proxy();
    if (proxy) {
      options = merge.recursive(options, {
        host: proxy.host,
        port: proxy.port,
        headers: { 'Proxy-Authorization': proxy.auth },
        path: req.query.url,
      });
    } else {
      options.url = req.query.url;
    }
    let response = await HTTP.request(options);
    if (200 !== +response.status) {
      return next(Tools.translate('Failed to get file headers'));
    }
    res.json(response.headers);
  } catch (err) {
    next(err);
  }
});

Captcha.captchaIDs().forEach((id) => {
  Captcha.captcha(id).apiRoutes().forEach((route) => {
    router[route.method](`/api${route.path}`, route.handler);
  });
});

Board.boardNames().forEach((name) => {
  Board.board(name).apiRoutes().forEach((route) => {
    router[route.method](`/api${route.path}`, route.handler);
  });
});

module.exports = router;
