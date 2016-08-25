import _ from 'underscore';
import express from 'express';

import Board from '../boards/board';
import Captcha from '../captchas/captcha';
import geolocation from '../core/geolocation';
import * as Search from '../core/search';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import * as ChatsModel from '../models/chats';
import * as UsersModel from '../models/users';

let router = express.Router();

function splitCommand(cmd) {
  let args = [];
  let arg = '';
  let quot = 0;
  for (let i = 0; i < cmd.length; ++i) {
    let c = cmd[i];
    if (/\s/.test(c)) {
      if (quot) {
        arg += c;
      } else if (arg.length > 0) {
        args.push(arg);
        arg = '';
      }
    } else {
      if ('"' === c && (i < 1 || '\\' !== cmd[i - 1])) {
        switch (quot) {
        case 1:
          quot = 0;
          break;
        case -1:
          arg += c;
          break;
        case 0:
        default:
          quot = 1;
          break;
        }
      } else if ("'" === c && (i < 1 || '\\' !== cmd[i - 1])) {
        switch (quot) {
        case 1:
          arg += c;
          break;
        case -1:
          quot = 0;
          break;
        case 0:
        default:
          quot = -1;
          break;
        }
      } else {
        if (('"' === c || "'" === c) && (i > 0 || '\\' == cmd[i - 1]) && arg.length > 0) {
          arg = arg.substring(0, arg.length - 1);
        }
        arg += c;
      }
    }
  }
  if (arg.length > 0) {
    if (quot) {
      return null;
    }
    args.push(arg);
  }
  let command = null;
  if (args.length > 0) {
    command = args.shift();
  }
  return {
    command: command,
    arguments: args
  };
}

router.post('/action/sendChatMessage', async function(req, res, next) {
  try {
    let { fields: { boardName, postNumber, text } } = await Tools.parseForm(req);
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
    await ChatsModel.addChatMessage(req, boardName, postNumber, text);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/deleteChatMessages', async function(req, res, next) {
  try {
    let { fields: { boardName, postNumber } } = await Tools.parseForm(req);
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
    await ChatsModel.deleteChatMessages(req, boardName, postNumber);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/synchronize', async function(req, res, next) {
  try {
    let { fields: { key, data } } = await Tools.parseForm(req);
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
    let { fields: { query, boardName, page } } = await Tools.parseForm(req);
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
    let phrases = splitCommand(query);
    if (!phrases || !phrases.command) {
      throw new Error(Tools.translate('Invalid search query'));
    }
    req.geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: req.geolocationInfo
    });
    let model = {
      searchQuery: query,
      searchBoard: boardName
    };
    query = {
      requiredPhrases: [],
      excludedPhrases: [],
      possiblePhrases: []
    };
    [phrases.command].concat(phrases.arguments).forEach((phrase) => {
      if (phrase.substr(0, 1) === '+') {
        query.requiredPhrases.push(phrase.substr(1).toLowerCase());
      } else if (phrase.substr(0, 1) === '-') {
        query.excludedPhrases.push(phrase.substr(1).toLowerCase());
      } else {
        query.possiblePhrases.push(phrase.toLowerCase());
      }
    });
    model.phrases = query.requiredPhrases.concat(query.excludedPhrases).concat(query.possiblePhrases);
    model.phrases = Tools.withoutDuplicates(model.phrases);
    let result = await Search.findPosts(query, {
      boardName: boardName,
      page: page
    });
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
