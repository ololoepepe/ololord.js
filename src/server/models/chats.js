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
  let hash = createUserHash(user);
  let date = Tools.now();
  let messages = await ChatMessage.find({
    $or: [{
      senderHash: hash,
      date: { $gt: lastRequestDate }
    }, {
      receiverHash: hash,
      date: { $gt: lastRequestDate }
    }]
  }, {
    _id: 0,
    receiverHash: 0
  }).sort({ date: 1 }).toArray();
  let chats = messages.reduce((acc, message) => {
    message.type = (hash === message.senderHash) ? 'out' : 'in';
    let chat = acc[message.key];
    if (!chat) {
      chat = [];
      acc[message.key] = chat;
    }
    delete message.key;
    delete message.senderHash;
    message.date = message.date.toISOString();
    chat.push(message);
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
    'user.hash': 1
  });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  let receiver = post.user;
  let receiverHash = createUserHash(receiver);
  let senderHash = createUserHash(user);
  chatNumber = Tools.option(chatNumber, 'number', 0, { test: (n) => { return n > 0; } });
  chatNumber = await getChatNumber(boardName, postNumber, chatNumber);
  let key = `${boardName}:${postNumber}:${chatNumber}`;
  let ChatMessage = await client.collection('chatMessage');
  let message = await ChatMessage.findOne({ key: key }, {
    senderHash: 1,
    receiverHash: 1
  });
  if (message && (message.senderHash !== senderHash && message.receiverHash !== receiverHash)) {
    throw new Error(Tools.translate('Somebody is chatting here already'));
  }
  let date = Tools.now();
  await ChatMessage.insertOne({
    key: key,
    text: text,
    date: date,
    senderHash: senderHash,
    receiverHash: receiverHash
  });
  return {
    message: {
      text: text,
      date: date.toISOString()
    },
    chatNumber: chatNumber,
    senderHash: senderHash,
    receiverHash: receiverHash,
    receiver: receiver
  };
}

export async function deleteChatMessages({ user, boardName, postNumber, chatNumber } = {}) {
  let ChatMessage = await client.collection('chatMessage');
  let key = `${boardName}:${postNumber}:${chatNumber}`;
  let hash = createUserHash(user);
  await ChatMessage.deleteMany({
    $or: [{
      senderHash: hash,
      key: key
    }, {
      receiverHash: hash,
      key: key
    }]
  });
}
