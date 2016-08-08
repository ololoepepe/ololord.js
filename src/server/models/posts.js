import _ from 'underscore';

import * as ThreadsModel from './threads';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import Key from '../storage/key';
import UnorderedSet from '../storage/unordered-set';
import Board from '../boards/board';
import * as Tools from '../helpers/tools';

let FileInfos = new Hash(client(), 'fileInfos');
let PostFileInfoNames = new UnorderedSet(client(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
let Posts = new Hash(client(), 'posts');
let ReferringPosts = new Hash(client(), 'referringPosts');
let ReferencedPosts = new Hash(client(), 'referencedPosts');
let UserBans = new Key(client(), 'userBans');

function sortedReferences(references) {
  return _(references).toArray().sort((a, b) => {
    return (a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt))
      || a.boardName.localeCompare(b.boardName) || (a.postNumber - b.postNumber);
  }).map((reference) => {
    delete reference.createdAt;
    return reference;
  });
}

async function addDataToPost(board, post, { withExtraData, withFileInfos, withReferences } = {}) {
  let key = `${post.boardName}:${post.number}`;
  let ban = await UserBans.get(`${post.user.ip}:${post.boardName}`);
  post.bannedFor = !!(ban && ban.postNumber === post.number);
  if (withExtraData) {
    let extraData = await board.loadExtraData(post.number);
    post.extraData = extraData;
  }
  if (withFileInfos) {
    let fileNames = await PostFileInfoNames.getAll(key);
    let fileInfos = await FileInfos.getSome(fileNames);
    post.fileInfos = fileInfos;
  }
  if (withReferences) {
    let referringPosts = await ReferringPosts.getAll(key);
    let referencedPosts = await ReferencedPosts.getAll(key);
    post.referringPosts = sortedReferences(referringPosts);
    post.referencedPosts = sortedReferences(referencedPosts);
  }
}

export async function getPost(boardName, postNumber, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let key = `${boardName}:${postNumber}`;
  let post = await Posts.getOne(key);
  if (!post) {
    return post;
  }
  let threadPostNumbers = await ThreadsModel.getThreadPostNumbers(boardName, post.threadNumber);
  post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
  await addDataToPost(board, post, options);
  return post;
}

export async function getPosts(boardName, postNumbers, options) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!_(postNumbers).isArray()) {
    postNumbers = [postNumbers];
  }
  postNumbers = postNumbers.map((postNumber) => {
    return Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  });
  if (postNumbers.some(postNumber => !postNumber)) {
    return Promise.reject(new Error(Tools.translate('Invalid post number')));
  }
  let posts = await Posts.getSome(postNumbers.map(postNumber => `${boardName}:${postNumber}`));
  posts = _(posts).toArray();
  if (posts.length <= 0) {
    return [];
  }
  let threadPostNumbers = await ThreadsModel.getThreadPostNumbers(boardName, posts[0].threadNumber);
  await Tools.series(posts, async function(post) {
    post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
    await addDataToPost(board, post, options);
  });
  return posts;
}
