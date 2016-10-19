import _ from 'underscore';
import Crypto from 'crypto';

import * as PostsModel from './posts';
import Board from '../boards/board';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import mongodbClient from '../storage/mongodb-client-factory';

let client = mongodbClient();

function createUserHash(user) {
  return Tools.crypto('sha256', user.hashpass || user.ip);
}

function createMessagesQuery(user) {
  let query = [{ 'sender.ip': user.ip }, { 'receiver.ip': user.ip }];
  if (user.hashpass) {
    query.push({ 'sender.hashpass': user.hashpass });
    query.push({ 'receiver.hashpass': user.hashpass });
  }
  return query;
}

function usersEqual(user1, user2) {
  return ((user1.ip === user2.ip) || (user1.hashpass && (user1.hashpass === user2.hashpass)));
}

function messageType(message, user) {
  if (usersEqual(user, message.sender)) {
    return 'out';
  } else {
    return 'in';
  }
}

function selectUser(user1, user2, first) {
  return {
    ip: (first ? user1.ip : user2.ip),
    hashpass: (first ? user1.hashpass : user2.hashpass)
  };
}

async function getChatNumber(boardName, postNumber, chatNumber) {
  let ChatNumberCounter = await client.collection('chatNumberCounter');
  let key = `${boardName}:${postNumber}`;
  let counter = await ChatNumberCounter.findOne({
    _id: key,
    lastChatNumber: { $lte: chatNumber }
  });
  if (counter) {
    return chatNumber;
  }
  let result = await ChatNumberCounter.findOneAndUpdate({ _id: key }, {
    $inc: { lastChatNumber: 1 }
  }, {
    projection: { lastChatNumber: 1 },
    upsert: true,
    returnOriginal: false
  });
  if (!result) {
    return 0;
  }
  let { lastChatNumber } = result.value;
  return lastChatNumber;
}

export async function getChatMessages(user, lastRequestDate) {
  let ChatMessage = await client.collection('chatMessage');
  let date = Tools.now();
  let messages = await ChatMessage.find({
    $and: [{
      $or: createMessagesQuery(user)
    }, {
      date: { $gt: lastRequestDate }
    }]
  }, {
    _id: 0
  }).sort({ date: 1 }).toArray();
  let chats = messages.reduce((acc, message) => {
    let chat = acc[message.key];
    if (!chat) {
      chat = [];
      acc[message.key] = chat;
    }
    delete message.key;
    let list = [{
      messageUser: message.sender,
      type: 'out'
    }, {
      messageUser: message.receiver,
      type: 'in'
    }];
    delete message.sender;
    delete message.receiver;
    message.date = message.date.toISOString();
    list.filter(({ messageUser }) => usersEqual(user, messageUser)).forEach(({ messageUser, type }) => {
      let msg = _.clone(message);
      msg.type = type;
      chat.push(msg);
    });
    return acc;
  }, {});
  return {
    lastRequestDate: date.toISOString(),
    chats: chats
  };
}

export async function addChatMessage({ user, boardName, postNumber, chatNumber, text } = {}) {
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
  let Post = await client.collection('post');
  let post = await Post.findOne({
    boardName: boardName,
    number: postNumber
  }, {
    'user.ip': 1,
    'user.hashpass': 1
  });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  chatNumber = Tools.option(chatNumber, 'number', 0, { test: (n) => { return n > 0; } });
  chatNumber = await getChatNumber(boardName, postNumber, chatNumber);
  let key = `${boardName}:${postNumber}:${chatNumber}`;
  let ChatMessage = await client.collection('chatMessage');
  let message = await ChatMessage.findOne({ key: key }, {
    sender: 1,
    receiver: 1
  });
  let isSender = !message || usersEqual(message.sender, user);
  let isReceiver = message && usersEqual(message.receiver, user);
  if (!isSender && !isReceiver) {
    throw new Error(Tools.translate('Somebody is chatting here already'));
  }
  let messageSender = message ? message.sender : post.user;
  let messageReceiver = message ? message.receiver : post.user;
  let receiver = selectUser(user, message ? message.receiver : post.user, isReceiver);
  let date = Tools.now();
  await ChatMessage.insertOne({
    key: key,
    text: text,
    date: date,
    sender: selectUser(user, message ? message.sender : post.user, isSender),
    receiver: receiver
  });
  return {
    message: {
      text: text,
      date: date.toISOString()
    },
    chatNumber: chatNumber,
    receiver: receiver
  };
}

export async function deleteChatMessages({ user, boardName, postNumber, chatNumber } = {}) {
  let ChatMessage = await client.collection('chatMessage');
  await ChatMessage.deleteMany({
    $and: [createMessagesQuery(user), { key: `${boardName}:${postNumber}:${chatNumber}` }]
  });
}
