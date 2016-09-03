#!/usr/bin/env node

require('babel-polyfill');
let _ = require('underscore');
let FS = require('q-io/fs');

let Tools = require('../server/helpers/tools');
let redisClient = require('../server/storage/redis-client-factory').default;
let Hash = require('../server/storage/hash').default;
//let Key = require('../server/storage/key').default;
let OrderedSet = require('../server/storage/ordered-set').default;

let Chat = new OrderedSet(redisClient(), 'chat');
//let ChatSubchatCount = new Key(redisClient(), 'chatSubchatCount');
let Posts = new Hash(redisClient(), 'posts');
let UserBanPostNumbers = new Hash(redisClient(), 'userBanPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});

let extraData = {};

console.log('Starting...');

Posts.keys().then((keys) => {
  return Tools.series(keys, (key) => {
    let [boardName, postNumber] = key.split(':');
    let c = {};
    console.log(`Processing post >>/${boardName}/${postNumber}`);
    return Posts.getOne(key).then((post) => {
      if (!post) {
        console.log('empty post');
        return;
      }
      c.post = post;
      if (!post.options) {
        post.options = {};
      }
      if (post.hasOwnProperty('email')) {
        post.options.sage = /^sage$/i.test(post.email);
        delete post.email;
      } else {
        post.options.sage = false;
      }
      return Posts.getOne(`${boardName}:${post.threadNumber}`);
    }).then((opPost) => {
      if (!c.post) {
        return;
      }
      c.post.opIP = !!(opPost && c.post.user.ip === opPost.user.ip);
      if (c.post.hasOwnProperty('extraData')) {
        extraData[key] = c.post.extraData;
        delete c.post.extraData;
      }
      return Posts.setOne(boardName, postNumber, c.post);
    });
  });
}).then(() => {
  return FS.write(`${__dirname}/../backup/extraData.json`, JSON.stringify(extraData));
}).then(() => {
  return UserBanPostNumbers.getAll();
}).then((result) => {
  return Tools.series(result, (value, key) => {
    return UserBanPostNumbers.setOne(key.replace(/^userBanPostNumbers/, ''), value).then(() => {
      return UserBanPostNumbers.deleteOne(key);
    });
  });
}).then(() => {
  return Chat.find();
}).then((keys) => {
  let subkeys = keys.map(key => key.replace(/^chat/, ''));
  return Tools.series(subkeys, (subkey) => {
    return Chat.delete(subkey);
  });
}).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(function(err) {
  console.log(err);
});
