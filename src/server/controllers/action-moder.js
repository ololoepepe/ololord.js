import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';
var moment = require("moment");
import UUID from 'uuid';

import Board from '../boards/board';
var Captcha = require("../captchas/captcha");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../core/markup");

import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import PostCreationTransaction from '../storage/post-creation-transaction';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import geolocation from '../storage/geolocation';

let router = express.Router();

function getBans(fields) {
  let { timeOffset } = fields;
  let bans = _(fields).pick((value, name) => {
    return /^banBoard_\S+$/.test(name) && 'NONE' !== fields[`banLevel_${value}`];
  });
  timeOffset = Tools.option(timeOffset, 'number', config('site.timeOffset'), {
    test: (o) => { return (o >= -720) && (o <= 840); } //TODO: magic numbers
  });
  bans = _(bans).reduce((acc, value, name) => {
    let expiresAt = fields[`banExpires_${value}`];
    if (expiresAt) {
      let hours = Math.floor(timeOffset / 60);
      let minutes = Math.abs(timeOffset) % 60;
      let tz = ((timeOffset > 0) ? '+' : '') + ((Math.abs(hours) < 10) ? '0' : '') + hours + ':'
        + ((minutes < 10) ? '0' : '') + minutes; //TODO: use pad function
      expiresAt = +moment(`${expiresAt} ${tz}`, 'YYYY/MM/DD HH:mm ZZ'); //TODO: magic numbers
      if (expiresAt < (_.now() + Tools.Second)) {
        expiresAt = null;
      }
    } else {
      expiresAt = null;
    }
    acc[boardName] = {
      boardName: value,
      expiresAt: expiresAt,
      level: fields[`banLevel_${value}`],
      reason: fields[`banReason_${value}`],
      postNumber: Tools.option(fields[`banPostNumber_${value}`], 'number', null, { test: Tools.testPostNumber })
    };
    return acc;
  }, {});
}

router.post('/action/banUser', async function(req, res, next) {
  try {
    if (!req.isModer()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields } = await Tools.parseForm(req);
    let { userIp } = fields;
    userIp = Tools.correctAddress(userIp);
    if (!userIp) {
      throw new Error(Tools.translate('Invalid IP address'));
    }
    if (userIp === req.ip) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let bans = getBans(fields);
    let banLevels = Tools.BAN_LEVELS.slice(1);
    bans.each((ban) => {
      if (!Board.board(ban.boardName)) {
        throw new Error(Tools.translate('Invalid board: $[1]', '', ban.boardName));
      }
      if (banLevels.indexOf(ban.level) < 0) {
        throw new Error(Tools.translate('Invalid ban level: $[1]', '', ban.level));
      }
    });
    let oldBans = await UsersModel.getBannedUserBans(userIp);
    let date = Tools.now();
    let modifiedBanBoards = new Set();
    let newBans = Board.boardNames().reduce((acc, boardName) => {
      if (req.isModer(boardName)) {
        if (bans.hasOwnProperty(boardName)) {
          let ban = bans[boardName];
          ban.createdAt = date;
          acc[boardName] = ban;
          modifiedBanBoards.add(boardName);
        } else if (oldBans.hasOwnProperty(boardName)) {
          modifiedBanBoards.add(boardName);
        }
      } else if (oldBans.hasOwnProperty(boardName)) {
        acc[boardName] = oldBans[boardName];
      }
      return acc;
    }, {});
    let levels = UsersModel.getRegisteredUserLevelsByIp(userIp);
    modifiedBanBoards.forEach((boardName) => {
      let level = req.level(boardName);
      if (!req.isSuperuser(boardName) && Tools.compareRegisteredUserLevels(level, levels[boardName]) <= 0) {
        throw new Error(Tools.translate('Not enough rights'));
      }
    });
    await UsersModel.banUser(userIp, newBans);
    res.send({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/delall', async function(req, res, next) {
  try {
    if (!req.isModer()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields } = await Tools.parseForm(req);
    let { userIp } = fields;
    userIp = Tools.correctAddress(userIp);
    if (!userIp) {
      throw new Error(Tools.translate('Invalid IP address'));
    }
    if (userIp === req.ip) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let boardNames = _(fields).filter((boardName, key) => {
      return /^board_\S+$/.test(key);
    });
    if (boardNames.length <= 0) {
      return throw new Error(Tools.translate('No board specified'));
    }
    boardNames.forEach((boardName) => {
      if (!Board.board(boardName)) {
        throw new Error(Tools.translate('Invalid board'));
      }
      if (!req.isModer(boardName)) {
        throw new Error(Tools.translate('Not enough rights'));
      }
    });
    let geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardNames, {
      write: true,
      geolocationInfo: geolocationInfo
    });
    await BoardsModel.delall(req, userIp, boardNames);
    res.send({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/moveThread', async function(req, res, next) {
  try {
    let { fields } = await Tools.parseForm(req);
    let { boardName, threadNumber, targetBoardName, password } = fields;
    if (!Board.board(boardName) || !Board.board(targetBoardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    if (sourceBoardName == targetBoardName) {
      throw new Error(Tools.translate('Source and target boards are the same'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread number'));
    }
    if (!req.isModer(boardName) || !req.isModer(targetBoardName)) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, [boardName, targetBoardName], {
      write: true,
      geolocationInfo: geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, threadNumber, 'moveThread', Tools.sha1(password));
    let result = await ThreadsModel.moveThread(boardName, threadNumber, targetBoardName);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/action/setThreadFixed", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadFixed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/setThreadClosed", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadClosed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/setThreadUnbumpable", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadUnbumpable(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

export default router;
