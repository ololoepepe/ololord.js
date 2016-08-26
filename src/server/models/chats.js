import _ from 'underscore';
import Crypto from 'crypto';

import * as PostsModel from './posts';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import redisClient from '../storage/redis-client-factory';
import OrderedSet from '../storage/ordered-set';
import UnorderedSet from '../storage/unordered-set';

let Chat = new OrderedSet(redisClient(), 'chat');
let ChatMembers = new UnorderedSet(redisClient(), 'chatMembers');
let Chats = new UnorderedSet(redisClient(), 'chats', {
  parse: false,
  stringify: false
});

function createUserHash(user) {
  return Tools.crypto('sha256', user.hashpass || user.ip);
}

export async function getChatMessages(user, lastRequestDate) {
  lastRequestDate = +(new Date(lastRequestDate)) || 0;
  let hash = createUserHash(user);
  let date = Tools.now().toISOString();
  let keys = await Chats.getAll(hash);
  let chats = await Tools.series(keys, async function(key) {
    let list = await Chat.getSomeByScore(lastRequestDate, Infinity, key);
    return (list || []).map((msg) => {
      return {
        text: msg.text,
        date: msg.date,
        type: ((hash === msg.senderHash) ? 'out' : 'in')
      };
    });
  }, {});
  return {
    lastRequestDate: date,
    chats: _(chats).pick((list) => { return list.length > 0; })
  };
}

export async function addChatMessage(user, boardName, postNumber, text) {
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
  let key = `${boardName}:${postNumber}`;
  let senderHash = createUserHash(user);
  let date = Tools.now();
  let post = await PostsModel.getPost(boardName, postNumber);
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  let receiver = post.user;
  let receiverHash = createUserHash(receiver);
  let messages = await Chat.getSome(0, 0, key);
  if (messages.length > 0 && messages[0].senderHash !== senderHash && messages[0].receiverHash !== senderHash) {
    throw new Error(Tools.translate('Somebody is chatting here already'));
  }
  let members = await ChatMembers.getAll(key);
  if (members.length < 2) {
    await ChatMembers.addSome([{
      hash: senderHash,
      ip: user.ip,
      hashpass: user.hashpass
    }, {
      hash: receiverHash,
      ip: receiver.ip,
      hashpass: receiver.hashpass
    }], key);
  } else {
    if (senderHash === receiverHash) {
      let member = _(members).find((member) => { return member.hash !== senderHash; });
      if (member) {
        receiverHash = member.hash;
        receiver = {
          ip: member.ip,
          hashpass: member.hashpass
        };
      }
    }
    await Chats.addOne(key, senderHash);
  }
  await Chats.addOne(key, receiverHash);
  await Chat.addOne({
    text: text,
    date: date.toISOString(),
    senderHash: senderHash,
    receiverHash: receiverHash
  }, date.valueOf(), key);
  let ttl = config('server.chat.ttl') * Tools.SECOND;
  await Chats.expire(ttl, senderHash);
  await Chats.expire(ttl, receiverHash);
  await Chat.expire(ttl, key);
  await ChatMembers.expire(ttl, key);
  return {
    message: {
      text: text,
      date: date.toISOString()
    },
    senderHash: senderHash,
    receiverHash: receiverHash,
    receiver: receiver
  };
}

export async function deleteChatMessages(user, boardName, postNumber) {
  await Chats.deleteOne(createUserHash(user));
}
