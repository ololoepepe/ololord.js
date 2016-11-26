import _ from 'underscore';
import FS from 'q-io/fs';

import * as PostsModel from './posts';
import * as ThreadsModel from './threads';
import Board from '../boards/board';
import config from '../helpers/config';
import FSWatcher from '../helpers/fs-watcher';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Permissions from '../helpers/permissions';
import * as Tools from '../helpers/tools';
import Channel from '../storage/channel';
import Hash from '../storage/hash';
import Key from '../storage/key';
import mongodbClient from '../storage/mongodb-client-factory';
import redisClient from '../storage/redis-client-factory';

let client = mongodbClient();

let BanExpiredChannel = new Channel(redisClient('BAN_EXPIRED'), `__keyevent@${config('system.redis.db')}__:expired`, {
  parse: false,
  stringify: false
});
let UserBans = new Key(redisClient(), 'userBans');
let UserCaptchaQuotas = new Hash(redisClient(), 'captchaQuotas', {
  parse: quota => +quota,
  stringify: quota => quota.toString()
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

let ipBans = FSWatcher.createWatchedResource(`${__dirname}/../../misc/user-bans.json`, (path) => {
  return transformIPBans(require(path));
}, async function(path) {
  let data = await FS.read(path);
  ipBans = transformIPBans(JSON.parse(data));
}) || {};

function transformGeoBans(bans) {
  return _(bans).reduce((acc, value, key) => {
    if (typeof value === 'string') {
      value = [value];
    }
    if (_(value).isArray()) {
      value = new Set(value.map(ip => Tools.correctAddress(ip)).filter(ip => !!ip));
    } else {
      value = !!value;
    }
    acc.set(key.toUpperCase(), value);
    return acc;
  }, new Map());
}

let geoBans = FSWatcher.createWatchedResource(`${__dirname}/../../misc/geo-bans.json`, (path) => {
  return transformGeoBans(require(path));
}, async function(path) {
  let data = await FS.read(path);
  geoBans = transformGeoBans(JSON.parse(data));
}) || new Map();

export async function getUserCaptchaQuota(boardName, userID) {
  if (!Board.board(boardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let quota = await UserCaptchaQuotas.getOne(userID);
  quota = Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
  if (quota <= 0) {
    quota = await UserCaptchaQuotas.getOne(`${boardName}:${userID}`);
  }
  return Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
}

export async function setUserCaptchaQuota(boardName, userID, quota) {
  if (!Board.board(boardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  quota = Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
  return await UserCaptchaQuotas.setOne(`${boardName}:${userID}`, quota);
}

export async function incrementUserCaptchaQuotaBy(userID, quota, boardName) {
  let key = userID;
  if (boardName) {
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    key = `${boardName}:${userID}`;
  }
  quota = Tools.option(quota, 'number', 1, { test: (q) => { return q >= 0; } });
  return await UserCaptchaQuotas.incrementBy(key, quota);
}

export async function useCaptcha(boardName, userID) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (board.captchaQuota < 1) {
    return 0;
  }
  let key = userID;
  quota = await UserCaptchaQuotas.getOne(userID);
  quota = Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } })
  if (quota <= 0) {
    key = `${boardName}:${userID}`;
  }
  let quota = await UserCaptchaQuotas.incrementBy(key, -1);
  if (+quota < 0) {
    return await UserCaptchaQuotas.setOne(key, 0);
  }
  return Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
}

export async function getUserIP(boardName, postNumber) {
  let Post = await client.collection('post');
  let post = await Post.findOne({
    boardName: boardName,
    number: postNumber
  }, { 'user.ip': 1 });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  return post.user.ip;
}

function getBannedUserBoardNames(boardNames) {
  if (!boardNames) {
    return Board.boardNames();
  } else if (!_(boardNames).isArray()) {
    return [boardNames];
  } else {
    return boardNames;
  }
}

function processBannedUser(boardNames, bannedUser) {
  bannedUser.bans = bannedUser.bans.filter((ban) => {
    return boardNames.indexOf(ban.boardName) >= 0;
  }).reduce((acc, ban) => {
    acc[ban.boardName] = ban;
    return acc;
  }, {});
  return bannedUser;
}

export async function getBannedUser(ip, boardNames) {
  ip = Tools.correctAddress(ip);
  let BannedUser = await client.collection('bannedUser');
  let binaryAddress = Tools.binaryAddress(ip);
  let bannedUser = await BannedUser.findOne({
    $or: [
      { ip: ip },
      {
        subnet: {
          start: { $lte: binaryAddress },
          end: { $gte: binaryAddress }
        }
      }
    ]
  }, { _id: 0 });
  if (!bannedUser) {
    return {
      ip: ip,
      bans: {}
    };
  }
  return processBannedUser(getBannedUserBoardNames(boardNames), bannedUser);
}

export async function getBannedUsers(boardNames) {
  let BannedUser = await client.collection('bannedUser');
  let bannedUsers = await BannedUser.find({}, { _id: 0 }).toArray();
  boardNames = getBannedUserBoardNames(boardNames);
  return bannedUsers.map(processBannedUser.bind(null, boardNames)).reduce((acc, bannedUser) => {
    acc[bannedUser.ip] = bannedUser;
    return acc;
  }, {});
}

function processRegisteredUser(user) {
  if (user.superuser) {
    user.levels = Board.boardNames().reduce((acc, boardName) => {
      acc[boardName] = 'SUPERUSER';
      return acc;
    }, {});
  } else {
    user.levels = user.levels.reduce((acc, level) => {
      acc[level.boardName] = level.level;
      return acc;
    }, {});
  }
  return user;
}

async function getRegisteredUserInternal(query, { full } = {}) {
  let User = await client.collection('user');
  let projection = { _id: 0 };
  if (!full) {
    projection = {
      superuser: 1,
      levels: 1
    };
  }
  let user = await User.findOne(query, projection);
  if (!user) {
    return null;
  }
  return processRegisteredUser(user);
}

export async function getRegisteredUserLevels(hashpass) {
  let user = await getRegisteredUserInternal({ hashpass: hashpass });
  return user ? user.levels : {};
}

export async function getRegisteredUserLevelsByIp(ip, subnet) {
  ip = Tools.correctAddress(ip);
  if (!ip) {
    return {};
  }
  let query = {
    $or: [{ 'ips.ip': ip }]
  };
  if (subnet) {
    query.$or.push({
      'ips.binary': {
        $elemMatch: {
          $gte: subnet.start,
          $lte: subnet.end
        }
      }
    });
  }
  let user = await getRegisteredUserInternal(query);
  return user ? user.levels : {};
}

export async function getRegisteredUser(hashpass) {
  let user = await getRegisteredUserInternal({
    hashpass: hashpass,
    superuser: { $exists: false }
  }, { full: true });
  if (!user) {
    throw new Error(Tools.translate('No user with this hashpass'));
  }
  return user;
}

export async function getRegisteredUsers() {
  let User = await client.collection('user');
  let users = await User.find({
    superuser: { $exists: false }
  }, { _id: 0 }).toArray();
  return users.map(processRegisteredUser);
}

function processUserIPs(ips) {
  if (_(ips).isArray()) {
    ips = ips.map(ip => Tools.correctAddress(ip));
    if (ips.some(ip => !ip)) {
      throw new Error(Tools.translate('Invalid IP address'));
    }
  }
  return ips;
}

function processRegisteredUserData(levels, ips) {
  if (levels.length <= 0) {
    throw new Error(Tools.translate('Access level is not specified for any board'));
  }
  if (levels.some(level => !Board.board(level.boardName))) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let invalidLevel = _(levels).some((level) => {
    return (Tools.compareRegisteredUserLevels(level.level, 'USER') < 0)
      || (Tools.compareRegisteredUserLevels(level.level, 'SUPERUSER') >= 0);
  });
  if (invalidLevel) {
    throw new Error(Tools.translate('Invalid access level'));
  }
  return processUserIPs(ips);
}

export async function registerUser(hashpass, levels, ips) {
  let User = await client.collection('user');
  let count = await User.count({ hashpass: hashpass });
  if (count > 0) {
    throw new Error(Tools.translate('A user with this hashpass is already registered'));
  }
  await User.insertOne({
    hashpass: hashpass,
    levels: levels,
    ips: processRegisteredUserData(levels, ips)
  });
}

export async function updateRegisteredUser(hashpass, levels, ips) {
  let User = await client.collection('user');
  let { matchedCount } = await User.updateOne({
    hashpass: hashpass
  }, {
    $set: {
      levels: levels,
      ips: processRegisteredUserData(levels, ips)
    }
  });
  if (matchedCount <= 0) {
    throw new Error(Tools.translate('No user with this hashpass'));
  }
}

export async function unregisterUser(hashpass) {
  let User = await client.collection('user');
  let { deletedCount } = await User.deleteOne({ hashpass: hashpass });
  if (deletedCount <= 0) {
    throw new Error(Tools.translate('No user with this hashpass'));
  }
}

export async function addSuperuser(hashpass, ips) {
  if (!hashpass) {
    throw new Error(Tools.translate('Invalid hashpass'));
  }
  let User = await client.collection('user');
  let count = await User.count({ hashpass: hashpass });
  if (count > 0) {
    throw new Error(Tools.translate('A user with this hashpass is already registered'));
  }
  await User.insertOne({
    hashpass: hashpass,
    superuser: true,
    ips: processUserIPs(ips)
  });
}

export async function removeSuperuser(hashpass) {
  if (!hashpass) {
    throw new Error(Tools.translate('Invalid hashpass'));
  }
  let User = await client.collection('user');
  let { deletedCount } = await User.deleteOne({ hashpass: hashpass });
  if (deletedCount <= 0) {
    throw new Error(Tools.translate('No user with this hashpass'));
  }
}

export async function getSynchronizationData(key) {
  let SynchronizationData = await client.collection('synchronizationData');
  return await SynchronizationData.findOne({ key: key });
}

export async function setSynchronizationData(key, data) {
  let SynchronizationData = await client.collection('synchronizationData');
  let expireAt = Tools.now();
  expireAt.setSeconds(expireAt.getSeconds() + config('server.synchronizationData.ttl'));
  await await SynchronizationData.updateOne({ key: key }, {
    $set: {
      data: data,
      expiresAt: expireAt
    }
  }, { upsert: true });
}

function checkGeoBan(geolocationInfo, ip) {
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
  if (ip && ((typeof user === 'object' && user.has(ip)) || (typeof def === 'object' && def.has(ip)))) {
    return;
  }
  if (typeof user === 'boolean' && !user) {
    return;
  }
  if (!user && !def) {
    return;
  }
  throw new Error(Tools.translate('Posting is disabled for this country'));
}

export async function checkUserBan(ip, boardNames, { write, geolocationInfo } = {}) {
  ip = Tools.correctAddress(ip);
  let ban = ipBans[ip];
  if (ban && (write || 'NO_ACCESS' === ban.level)) {
    throw { ban: ban };
  }
  if (boardNames) {
    let bannedUser = await getBannedUser(ip, boardNames);
    ban = _(bannedUser.bans).find((ban) => { return ban && (write || 'NO_ACCESS' === ban.level); });
    if (ban) {
      throw { ban: ban };
    }
  }
  if (geolocationInfo) {
    return checkGeoBan(geolocationInfo, ip);
  }
}

export async function checkUserPermissions(req, boardName, postNumber, permission, password) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let Post = await client.collection('post');
  let post = await Post.findOne({
    boardName: boardName,
    number: postNumber
  }, {
    threadNumber: 1,
    user: 1
  });
  if (!post) {
    throw new Error(Tools.translate('Not such post: $[1]', '', `/${boardName}/${postNumber}`));
  }
  let { user, threadNumber } = post;
  if (req.isSuperuser()) {
    return;
  }
  if (Tools.compareRegisteredUserLevels(req.level(boardName), Permissions[permission]()) >= 0) {
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
    throw new Error(Tools.translate('Not enough rights'));
  }
  let Thread = await client.collection('thread');
  let thread = await Thread.fineOne({
    boardName: boardName,
    number: threadNumber
  });
  if (!thread) {
    throw new Error(Tools.translate('Not such thread: $[1]', '', `/${boardName}/${threadNumber}`));
  }
  if (thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass)) {
    throw new Error(Tools.translate('Not enough rights'));
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
  throw new Error(Tools.translate('Not enough rights'));
}

export async function updatePostBanInfo(boardName, postNumber, bannedFor) {
  if (!Board.board(boardName)) {
    throw new Error(Tools.translate('Invalid board'));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return;
  }
  let Post = await client.collection('post');
  let result = await Post.findOneAndUpdate({
    boardName: boardName,
    number: postNumber
  }, {
    $set: { 'options.bannedFor': !!bannedFor }
  }, {
    projection: { threadNumber: 1 },
    returnOriginal: false
  });
  let post = result.value;
  if (!post) {
    return;
  }
  await IPC.render(boardName, post.threadNumber, postNumber, 'edit');
}

function getPostsToUpdate(oldBans, newBans) {
  let postsBannedFor = [];
  let postsNotBannedFor = [];
  Board.boardNames().forEach((boardName) => {
    let ban = newBans[boardName];
    if (ban) {
      if (ban.postNumber) {
        postsBannedFor.push({
          boardName: boardName,
          postNumber: ban.postNumber
        });
      }
    } else {
      ban = oldBans[boardName];
      if (ban && ban.postNumber) {
        postsNotBannedFor.push({
          boardName: boardName,
          postNumber: ban.postNumber
        });
      }
    }
  });
  return {
    postsBannedFor: postsBannedFor,
    postsNotBannedFor: postsNotBannedFor
  };
}

export async function banUser(ip, newBans, subnet) {
  ip = Tools.correctAddress(ip);
  if (!ip) {
    throw new Error(Tools.translate('Invalid IP address'));
  }
  let bannedUser = await getBannedUser(ip);
  let oldBans = bannedUser.bans;
  await Tools.series(oldBans, async function(_1, boardName) {
    await UserBans.delete(`${ip}:${boardName}`);
  });
  let BannedUser = await client.collection('bannedUser');
  if (_(newBans).isEmpty()) {
    await BannedUser.deleteOne({ ip: ip });
  } else {
    await BannedUser.updateOne({ ip: ip }, {
      $set: {
        subnet: subnet,
        bans: _(newBans).toArray()
      }
    }, { upsert: true });
    await Tools.series(_(newBans).pick((ban) => {
      return ban.expiresAt;
    }), async function(ban) {
      let delay = Math.ceil((+ban.expiresAt - +Tools.now()) / Tools.SECOND);
      await UserBans.setex(ban, delay, `${ip}:${ban.boardName}`);
    });
  }
  let { postsBannedFor, postsNotBannedFor } = getPostsToUpdate(oldBans, newBans);
  await Tools.series(postsBannedFor, ({ postNumber, boardName }) => {
    return updatePostBanInfo(boardName, postNumber, true);
  });
  await Tools.series(postsNotBannedFor, ({ postNumber, boardName }) => {
    return updatePostBanInfo(boardName, postNumber, false);
  });
}

async function updateBanOnMessage(message) {
  try {
    let ip = Tools.correctAddress(message.split(':').slice(1, -1).join(':'));
    if (!ip) {
      throw new Error(Tools.translate('Invalid IP address'));
    }
    let boardName = message.split(':').pop();
    if (!Board.board(boardName)) {
      throw new Error(Tools.translate('Invalid board'));
    }
    let BannedUser = await client.collection('bannedUser');
    let { value: bannedUser } = await BannedUser.findOneAndUpdate({ ip: ip }, {
      $pull: {
        bans: { boardName: boardName }
      }
    }, {
      projection: {
        bans: {
          $elemMatch: { boardName: boardName }
        }
      },
      returnOriginal: true
    });
    if (!bannedUser || (bannedUser.bans.length !== 1)) {
      throw new Error(Tools.translate('Internal error: no user ban found'));
    }
    await BannedUser.deleteOne({
      ip: ip,
      bans: { $size: 0 }
    });
    let postNumber = Tools.option(bannedUser.bans[0].postNumber, 'number', 0, { test: Tools.testPostNumber });
    if (postNumber) {
      await updatePostBanInfo(boardName, postNumber, false);
    }
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function initializeUserBansMonitoring() {
  //NOTE: Enabling "key expired" notifications
  await redisClient().config('SET', 'notify-keyspace-events', 'Ex');
  await BanExpiredChannel.subscribe(updateBanOnMessage);
}
