import _ from 'underscore';
import FS from 'q-io/fs';

import * as PostsModel from './posts';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import Key from '../storage/key';
import UnorderedSet from '../storage/unordered-set';
import Board from '../boards/board';
import * as Permissions from '../helpers/permissions';
import * as Tools from '../helpers/tools';

let BannedUserIPs = new UnorderedSet(client(), 'bannedUserIps', {
  parse: false,
  stringify: false
});
let RegisteredUserIPs = new UnorderedSet(client(), 'registeredUserIps', {
  parse: false,
  stringify: false
});
let RegisteredUserLevels = new Hash(client(), 'registeredUserLevels', {
  parse: false,
  stringify: false
});
let SynchronizationData = new Key(client(), 'synchronizationData');
let Threads = new Hash(client(), 'threads');
let UserBans = new Key(client(), 'userBans');
let UserCaptchaQuotas = new Hash(client(), 'captchaQuotas', {
  parse: quota => +quota,
  stringify: quota => quota.toString()
});
let UserPostNumbers = new UnorderedSet(client(), 'userPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});

function transformIPBans(bans) {
  return _(bans).reduce((acc, ban, ip) => {
    ip = Tools.correctAddress(ip);
    if (ip) {
      acc[ip] = ban;
    }
    return acc;
  }, {});
}

let ipBans = Tools.createWatchedResource(`${__dirname}/../misc/user-bans.json`, (path) => {
  return transformIPBans(require(path));
}, async function(path) {
  let data = await FS.read(path);
  ipBans = transformIPBans(JSON.parse(data));
}) || {};

export async function getUserCaptchaQuota(boardName, userIp) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let quota = await UserCaptchaQuotas.getOne(`${boardName}:${userIp}`);
  return Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
}

export async function setUserCaptchaQuota(boardName, userIp, quota) {
  quota = Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
  return await UserCaptchaQuotas.setOne(`${boardName}:${userIp}`, quota);
}

export async function useCaptcha(boardName, userIp) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (board.captchaQuota < 1) {
    return 0;
  }
  let key = `${boardName}:${userIp}`;
  let quota = await UserCaptchaQuotas.incrementBy(key, -1);
  if (+quota < 0) {
    return await UserCaptchaQuotas.setOne(key, 0);
  }
  return Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
}

export async function getUserIP(boardName, postNumber) {
  let post = await PostsModel.getPost(boardName, postNumber);
  if (!post) {
    return Promise.reject(new Error(Tools.translate('No such post')));
  }
  return post.user.ip;
}

export async function getBannedUserBans(ip, boardNames) {
  ip = Tools.correctAddress(ip);
  if (!boardNames) {
    boardNames = Board.boardNames();
  } else if (!_(boardNames).isArray()) {
    boardNames = [boardNames];
  }
  let bans = await Tools.series(boardNames, async function(boardName) {
    return await UserBans.get(`${ip}:${boardName}`);
  }, {});
  return _(bans).pick(ban => !!ban);
}

export async function getBannedUsers(boardNames) {
  let ips = await BannedUserIPs.getAll();
  return await Tools.series(ips, async function(ip) {
    return await getBannedUserBans(ip, boardNames);
  }, {});
}

export async function getRegisteredUser(hashpass) {
  let user = { hashpass: hashpass };
  let levels = await RegisteredUserLevels.getAll(hashpass);
  if (_(levels).isEmpty()) {
    return Promise.reject(new Error(Tools.translate('No user with this hashpass')));
  }
  user.levels = levels;
  let ips = await RegisteredUserIPs.getAll(hashpass);
  user.ips = ips || [];
  return user;
}

export async function getRegisteredUsers() {
  let keys = await RegisteredUserLevels.find();
  return await Tools.series(keys.map((key) => {
    return key.split(':')[1];
  }), async function(hashpass) {
    return await getRegisteredUser(hashpass);
  }, true);
}

export async function getSynchronizationData(key) {
  return await SynchronizationData.get(key);
}

export async function getUserPostNumbers(ip, boardName) {
  ip = Tools.correctAddress(ip) || '*';
  boardName = boardName || '*';
  return await UserPostNumbers.find(`${ip}:${boardName}`);
}

export async function addUserPostNumber(ip, boardName, postNumber) {
  ip = Tools.correctAddress(ip);
  await UserPostNumbers.addOne(postNumber, `${ip}:${boardName}`);
}

export async function removeUserPostNumber(ip, boardName, postNumber) {
  ip = Tools.correctAddress(ip);
  await UserPostNumbers.deleteOne(postNumber, `${ip}:${boardName}`);
}

export async function checkUserBan(ip, boardNames, { write } = {}) {
  ip = Tools.correctAddress(ip);
  let ban = ipBans[ip];
  if (ban && (write || 'NO_ACCESS' === ban.level)) {
    return Promise.reject({ ban: ban });
  }
  let bans = await getBannedUserBans(ip, boardNames);
  ban = _(bans).find((ban) => { return ban && (write || 'NO_ACCESS' === ban.level); });
  if (ban) {
    return Promise.reject({ ban: ban });
  }
}

export async function checkUserPermissions(req, board, { user, threadNumber }, permission, password) {
  if (req.isSuperuser()) {
    return true;
  }
  if (typeof board === 'string') {
    board = Board.board(board);
  }
  if (Tools.compareRegisteredUserLevels(req.level(board.name), Permissions[permission]()) > 0) {
    if (Tools.compareRegisteredUserLevels(req.level(board.name), user.level) > 0) {
      return true;
    }
    if (req.hashpass && req.hashpass === user.hashpass) {
      return true;
    }
    if (password && password === user.password) {
      return true;
    }
  }
  if (!board.opModeration) {
    return false;
  }
  let thread = await Threads.getOne(threadNumber, board.name);
  if (thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass)) {
    return false;
  }
  if (Tools.compareRegisteredUserLevels(req.level(board.name), user.level) >= 0) {
    return true;
  }
  if (req.hashpass && req.hashpass === user.hashpass) {
    return true;
  }
  if (password && password === user.password) {
    return true;
  }
  return false;
}
