#!/usr/bin/env node

let Database = require('../helpers/database');
let Tools = require('../helpers/tools');

let db = Database.db;

console.log('Starting...');

db.hkeys('posts').then(function(keys) {
  return Tools.series(keys, function(key) {
    var c = {};
    return db.hget('posts', key).then(function(post) {
      post = JSON.parse(post);
      c.post = post;
      console.log(`Processing post ${key}`);
      if (post.hasOwnProperty('email')) {
        post.sage = /^sage$/i.test(post.email);
        delete post.email;
      } else {
        post.sage = false;
      }
      return db.hget('posts', `${post.boardName}:${post.threadNumber}`);
    }).then(function(opPost) {
      opPost = JSON.parse(opPost);
      c.post.opIP = !!(opPost && c.post.user.ip == opPost.user.ip);
      return db.hset('posts', key, JSON.stringify(c.post));
    });
  });
}).then(function() {
  console.log('Done!');
  process.exit(0);
}).catch(function(err) {
  console.log(err);
});
