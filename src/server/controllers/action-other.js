import _ from 'underscore';
import express from 'express';

import Board from '../boards/board';
import Captcha from '../captchas/captcha';
import * as Files from '../core/files';
import geolocation from '../core/geolocation';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import * as ChatsModel from '../models/chats';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';

let router = express.Router();

router.post('/action/sendChatMessage', async function(req, res, next) {
  try {
    let { fields: { boardName, postNumber, chatNumber, text } } = await Files.parseForm(req);
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    if (!text || typeof text !== 'string') {
      throw new Error(Tools.translate('Message is empty'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    let result = await ChatsModel.addChatMessage({
      user: req,
      boardName: boardName,
      postNumber: postNumber,
      chatNumber: chatNumber,
      text: text
    });
    let { message, senderHash, receiverHash, receiver } = result;
    if (senderHash !== receiverHash) {
      message.type = 'in';
      let ip = receiver.hashpass ? null : receiver.ip;
      IPC.send('sendChatMessage', {
        type: 'newChatMessage',
        message: {
          message: message,
          boardName: boardName,
          postNumber: postNumber,
          chatNumber: result.chatNumber
        },
        ips: ip,
        hashpasses: receiver.hashpass
      });
    }
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/deleteChatMessages', async function(req, res, next) {
  try {
    let { fields: { boardName, postNumber, chatNumber } } = await Files.parseForm(req);
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!postNumber) {
      throw new Error(Tools.translate('Invalid post number'));
    }
    chatNumber = Tools.option(chatNumber, 'number', 0, { test: (n) => { return n > 0; } });
    if (!chatNumber) {
      throw new Error(Tools.translate('Invalid chat number'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    await ChatsModel.deleteChatMessages({
      user: req,
      boardName: boardName,
      postNumber: postNumber,
      chatNumber: chatNumber
    });
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/synchronize', async function(req, res, next) {
  try {
    let { fields: { key, data } } = await Files.parseForm(req);
    if (!key || typeof key !== 'string') {
      throw new Error(Tools.translate('No key specified'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    try {
      data = JSON.parse(data);
    } catch (err) {
      throw new Error(Tools.translate('Failed to parse data'));
    }
    await UsersModel.setSynchronizationData(key, data);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/search', async function(req, res, next) {
  try {
    let { fields: { query, boardName, page } } = await Files.parseForm(req);
    if (!query || typeof query !== 'string') {
      throw new Error(Tools.translate('Search query is empty'));
    }
    if (query.length > config('site.maxSearchQueryLength')) {
      throw new Error(Tools.translate('Search query is too long'));
    }
    if ('*' === boardName) {
      boardName = '';
    }
    if (boardName && !Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    page = Tools.option(page, 'number', 0, { test: (p) => { return p >= 0; } });
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    let phrases = query.match(/\w+|"[^"]+"/g) || [];
    let model = {
      searchQuery: query,
      phrases: phrases.map(phrase => phrase.replace(/(^\-|^"|"$)/g, '')),
      searchBoard: boardName
    };
    let result = await PostsModel.findPosts(query, boardName, page);
    let maxSubjectLength = config('system.search.maxResultPostSubjectLengh');
    let maxTextLength = config('system.search.maxResultPostTextLengh');
    model.searchResults = result.posts.map((post) => {
      let text = (post.plainText || '').replace(/\r*\n+/g, ' ');
      if (text.length > maxTextLength) {
        text = text.substr(0, maxTextLength - 1) + '…';
      }
      let subject = post.subject || text;
      if (subject.length > maxSubjectLength) {
        subject = subject.substr(0, maxSubjectLength - 1) + '…';
      }
      return {
        boardName: post.boardName,
        postNumber: post.number,
        threadNumber: post.threadNumber,
        archived: post.archived,
        subject: subject,
        text: text
      };
    });
    model.total = result.total;
    model.max = result.max;
    res.json(model);
  } catch (err) {
    next(err);
  }
});

Captcha.captchaIDs().forEach((id) => {
  Captcha.captcha(id).actionRoutes().forEach((route) => {
    router[route.method](`/action${route.path}`, route.handler);
  });
});

Board.boardNames().forEach((name) => {
  Board.board(name).actionRoutes().forEach((route) => {
    router[route.method](`/action${route.path}`, route.handler);
  });
});

module.exports = router;
