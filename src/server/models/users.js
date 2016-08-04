import _ from 'underscore';

import * as PostsModel from './posts';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import Key from '../storage/key';
import UnorderedSet from '../storage/unordered-set';
import Board from '../boards/board';
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
let UserBans = new Key(client(), 'userBans');
let UserCaptchaQuotas = new Hash(client(), 'captchaQuotas', {
  parse: quota => +quota,
  stringify: quota => quota.toString()
});
let UserPostNumbers = new Key(client(), 'userPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});

export async function getUserCaptchaQuota(boardName, userIp) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(Tools.translate('Invalid board'));
  }
  let quota = UserCaptchaQuotas.getOne(`${boardName}:${userIp}`);
  return Tools.option(quota, 'number', 0, { test: (q) => { return q >= 0; } });
}

export async function getUserIP(boardName, postNumber) {
  let post = await PostsModel.getPost(boardName, postNumber);
  if (!post) {
    return Promise.reject(Tools.translate('No such post'));
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
    return Promise.reject(Tools.translate('No user with this hashpass'));
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
