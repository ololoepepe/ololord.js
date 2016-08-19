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
let RegisteredUserHashes = new Hash(client(), 'registeredUserHashes', {
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
let SuperuserHashes = new UnorderedSet(client(), 'superuserHashes', {
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

function transformGeoBans(bans) {
  return _(bans).reduce((acc, value, key) => {
    acc.set(key.toUpperCase(), !!value);
    return acc;
  }, new Map());
}

let geoBans = Tools.createWatchedResource(`${__dirname}/../misc/geo-bans.json`, (path) => {
  return transformGeoBans(require(path));
}, async function(path) {
  let data = await FS.read(path);
  geoBans = transformGeoBans(JSON.parse(data));
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

export async function getRegisteredUserLevel(hashpass, boardName) {
  if (!hashpass || !Tools.mayBeHashpass(hashpass)) {
    return Promise.reject(new Error(Tools.translate('Invalid hashpass')));
  }
  if (!Board.board(boardName)) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let exists = await SuperuserHashes.contains(hashpass);
  if (exists) {
    return 'SUPERUSER';
  }
  let level = await RegisteredUserLevels.getOne(boardName, hashpass);
  return level || null;
}

export async function getRegisteredUserLevelByIp(ip, boardName) {
  ip = Tools.correctAddress(ip);
  if (!ip) {
    return Promise.reject(new Error(Tools.translate('Invalid IP address')));
  }
  let hashpass = await RegisteredUserHashes.getOne(ip);
  if (!hashpass) {
    return null;
  }
  return await getRegisteredUserLevel(hashpass, boardName);
}

export async function getRegisteredUserLevels(hashpass) {
  if (!hashpass || !Tools.mayBeHashpass(hashpass)) {
    return {};
  }
  let exists = await SuperuserHashes.contains(hashpass);
  if (exists) {
    return Board.boardNames().reduce((acc, boardName) => {
      acc[boardName] = 'SUPERUSER';
      return acc;
    }, {});
  }
  let levels = await RegisteredUserLevels.getAll(hashpass);
  return levels || {};
}

export async function getRegisteredUserLevelsByIp(ip) {
  ip = Tools.correctAddress(ip);
  if (!ip) {
    return {};
  }
  let hashpass = await RegisteredUserHashes.getOne(ip);
  if (!hashpass) {
    return {};
  }
  return await getRegisteredUserLevels(hashpass);
    return db.hget("registeredUserHashes", ip).then(function(hashpass) {
        if (!hashpass)
            return Promise.resolve({});
        return registeredUserLevels(hashpass);
    });
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

async function processRegisteredUserData(levels, ips) {
  if (!Tools.hasOwnProperties(levels)) {
    return Promise.reject(new Error(Tools.translate('Access level is not specified for any board')));
  }
  if (Object.keys(levels).some(boardName => !Board.board(boardName))) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let invalidLevel = _(levels).some((level) => {
    return (Tools.compareRegisteredUserLevels(level, 'USER') < 0)
      || (Tools.compareRegisteredUserLevels(level, 'SUPERUSER') >= 0);
  });
  if (invalidLevel) {
    return Promise.reject(new Error(Tools.translate('Invalid access level')));
  }
  if (_(ips).isArray()) {
    ips = ips.map(ip => Tools.correctAddress(ip));
    if (ips.some(ip => !ip)) {
      return Promise.reject(new Error(Tools.translate('Invalid IP address')));
    }
  }
  return ips;
}

export async function registerUser(hashpass, levels, ips) {
  ips = await processRegisteredUserData(levels, ips);
  let existingUserLevel = await RegisteredUserLevels.exists(hashpass);
  if (existingUserLevel) {
    return Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered')));
  }
  let existingSuperuserHash = await SuperuserHashes.contains(hashpass);
  if (existingSuperuserHash) {
    return Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered as superuser')));
  }
  await RegisteredUserLevels.setSome(levels, hashpass);
  if (_(ips).isArray()) {
    //TODO: May be optimised (hmset)
    await Tools.series(ips, async function(ip) {
      await RegisteredUserHashes.setOne(ip, hashpass);
      await RegisteredUserIPs.addOne(ip, hashpass);
    });
  }
}

export async function updateRegisteredUser(hashpass, levels, ips) {
  ips = await processRegisteredUserData(levels, ips);
  let existingUserLevel = await RegisteredUserLevels.exists(hashpass);
  if (!existingUserLevel) {
    return Promise.reject(new Error(Tools.translate('No user with this hashpass')));
  }
  await RegisteredUserLevels.setSome(levels, hashpass);
  let existingIPs = await RegisteredUserIPs.getAll(hashpass);
  if (existingIPs && existingIPs.length > 0) {
    await RegisteredUserHashes.deleteSome(ips);
  }
  await RegisteredUserIPs.delete(hashpass);
  if (_(ips).isArray()) {
    //TODO: May be optimised (hmset)
    await Tools.series(ips, async function(ip) {
      await RegisteredUserHashes.setOne(ip, hashpass);
      await RegisteredUserIPs.addOne(ip, hashpass);
    });
  }
}

export async function unregisterUser(hashpass) {
  let count = await RegisteredUserLevels.delete(hashpass);
  if (count <= 0) {
    return Promise.reject(new Error(Tools.translate('No user with this hashpass')));
  }
  let ips = await RegisteredUserIPs.getAll(hashpass);
  if (ips && ips.length > 0) {
    await RegisteredUserHashes.deleteSome(ips);
  }
  await RegisteredUserIPs.delete(hashpass);
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

export async function checkUserPermissions(req, boardName, postNumber, permission, password) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let { user, threadNumber } = await PostsModel.getPost(boardName, postNumber);
  if (req.isSuperuser()) {
    return;
  }
  if (Tools.compareRegisteredUserLevels(req.level(boardName), Permissions[permission]()) > 0) {
    if (Tools.compareRegisteredUserLevels(req.level(boardName), 'USER') > 0
      && Tools.compareRegisteredUserLevels(req.level(boardName), user.level) > 0) {
      return;
    }
    if (req.hashpass && req.hashpass === user.hashpass) {
      return;
    }
    if (password && password === user.password) {
      return;
    }
  }
  if (!board.opModeration) {
    return Promise.reject(new Error(Tools.translate('Not enough rights')));
  }
  let thread = await Threads.getOne(threadNumber, boardName);
  if (thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass)) {
    return Promise.reject(new Error(Tools.translate('Not enough rights')));
  }
  if (Tools.compareRegisteredUserLevels(req.level(boardName), user.level) >= 0) {
    return;
  }
  if (req.hashpass && req.hashpass === user.hashpass) {
    return;
  }
  if (password && password === user.password) {
    return;
  }
  return Promise.reject(new Error(Tools.translate('Not enough rights')));
}

export function checkGeoBan(geolocationInfo) {
  let def = geoBans.get('*');
  if (def) {
    geolocationInfo = geolocationInfo || {};
  } else if (!geolocationInfo || !geolocationInfo.countryCode) {
    return;
  }
  let countryCode = geolocationInfo.countryCode;
  if (typeof countryCode !== 'string') {
    countryCode = '';
  }
  let user = geoBans.get(countryCode.toUpperCase());
  if (def) {
    var banned = !user && (typeof user === 'boolean');
  } else {
    var banned = user;
  }
  if (banned) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled for this country')));
  }
}
