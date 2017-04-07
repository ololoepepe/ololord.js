import _ from 'underscore';
import express from 'express';
import moment from 'moment';

import Board from '../boards/board';
import config from '../helpers/config';
import * as Files from '../core/files';
import geolocation from '../core/geolocation';
import PostCreationTransaction from '../helpers/post-creation-transaction';
import * as Tools from '../helpers/tools';
import * as ThreadsModel from '../models/threads';
import * as UsersModel from '../models/users';
import * as BoardsModel from '../models/boards';

let router = express.Router();

const MIN_TIME_OFFSET = -720;
const MAX_TIME_OFFSET = 840;
const BAN_EXPIRES_FORMAT = 'YYYY/MM/DD HH:mm ZZ';
const MIN_SUBNET_IP_V4 = 22;
const MAX_SUBNET_IP_V4 = 32;
const MIN_SUBNET_IP_V6 = 64;
const MAX_SUBNET_IP_V6 = 128;

function getBans(fields) {
  let { timeOffset } = fields;
  let bans = _(fields).pick((value, name) => {
    return /^banBoard_\S+$/.test(name) && 'NONE' !== fields[`banLevel_${value}`];
  });
  timeOffset = Tools.option(timeOffset, 'number', config('site.timeOffset'), {
    test: (o) => { return (o >= MIN_TIME_OFFSET) && (o <= MAX_TIME_OFFSET); }
  });
  return _(bans).reduce((acc, value, name) => {
    let expiresAt = fields[`banExpires_${value}`];
    if (expiresAt) {
      let hours = Math.floor(Math.abs(timeOffset) / 60);
      let minutes = Math.abs(timeOffset) % 60;
      let tz = ((timeOffset > 0) ? '+' : '') + Tools.pad(hours, 2, '0') + ':' + Tools.pad(minutes, 2, '0');
      expiresAt = +moment(`${expiresAt} ${tz}`, BAN_EXPIRES_FORMAT);
      if (expiresAt < (_.now() + Tools.SECOND)) {
        expiresAt = null;
      }
    } else {
      expiresAt = null;
    }
    acc[value] = {
      boardName: value,
      expiresAt: (expiresAt ? new Date(expiresAt) : null),
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
    let { fields } = await Files.parseForm(req);
    let { userIp, subnet } = fields;
    userIp = Tools.correctAddress(userIp);
    if (!userIp) {
      throw new Error(Tools.translate('Invalid IP address'));
    }
    subnet = Tools.subnet(userIp, subnet);
    if (subnet) {
      let isIPv4 = /^\:\:[0-9a-f]{1,4}\:[0-9a-f]{1,4}$/.test(userIp);
      if ((isIPv4 && (subnet.subnet < MIN_SUBNET_IP_V4)) || (!isIPv4 && (subnet.subnet < MIN_SUBNET_IP_V6))) {
        let r4 = `${MIN_SUBNET_IP_V4}-${MAX_SUBNET_IP_V4}`;
        let r6 = `${MIN_SUBNET_IP_V6}-${MAX_SUBNET_IP_V6}`;
        let t = Tools.translate('Subnet is too large. $[1] for IPv4 and $[2] for IPv6 are allowed', '', r4, r6);
        throw new Error(t);
      }
    }
    if (userIp === req.ip) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let bans = getBans(fields);
    let banLevels = Tools.BAN_LEVELS.slice(1);
    _(bans).each((ban) => {
      if (!Board.board(ban.boardName)) {
        throw new Error(Tools.translate('Invalid board: $[1]', '', ban.boardName));
      }
      if (banLevels.indexOf(ban.level) < 0) {
        throw new Error(Tools.translate('Invalid ban level: $[1]', '', ban.level));
      }
    });
    let bannedUser = await UsersModel.getBannedUser(userIp);
    let oldBans = bannedUser ? bannedUser.bans : {};
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
    let levels = await UsersModel.getRegisteredUserLevelsByIp(userIp, subnet);
    modifiedBanBoards.forEach((boardName) => {
      let level = req.level(boardName);
      if (!req.isSuperuser(boardName) && Tools.compareRegisteredUserLevels(level, levels[boardName]) <= 0) {
        throw new Error(Tools.translate('Not enough rights'));
      }
    });
    await UsersModel.banUser(userIp, newBans, subnet);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/delall', async function(req, res, next) {
  try {
    if (!req.isModer()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields } = await Files.parseForm(req);
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
      throw new Error(Tools.translate('No board specified'));
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
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/moveThread', async function(req, res, next) {
  let transaction;
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, threadNumber, targetBoardName, password } = fields;
    if (!Board.board(boardName) || !Board.board(targetBoardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    if (boardName === targetBoardName) {
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
    transaction = new PostCreationTransaction(boardName);
    let result = await ThreadsModel.moveThread(boardName, threadNumber, targetBoardName, transaction);
    res.json(result);
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/setThreadFixed', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, threadNumber, fixed, password } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread number'));
    }
    if (!req.isModer(boardName)) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, threadNumber, 'setThreadFixed', Tools.sha1(password));
    await ThreadsModel.setThreadFixed(boardName, threadNumber, 'true' === fixed);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/setThreadClosed', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, threadNumber, closed, password } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread number'));
    }
    if (!req.isModer(boardName)) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, threadNumber, 'setThreadClosed', Tools.sha1(password));
    await ThreadsModel.setThreadClosed(boardName, threadNumber, 'true' === closed);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/setThreadUnbumpable', async function(req, res, next) {
  try {
    let { fields } = await Files.parseForm(req);
    let { boardName, threadNumber, unbumpable, password } = fields;
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread number'));
    }
    if (!req.isModer(boardName)) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let geolocationInfo = await geolocation(req.ip);
    await UsersModel.checkUserBan(req.ip, boardName, {
      write: true,
      geolocationInfo: geolocationInfo
    });
    await UsersModel.checkUserPermissions(req, boardName, threadNumber, 'setThreadUnbumpable', Tools.sha1(password));
    await ThreadsModel.setThreadUnbumpable(boardName, threadNumber, 'true' === unbumpable);
    res.json({});
  } catch (err) {
    next(err);
  }
});

export default router;
