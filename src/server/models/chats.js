import _ from 'underscore';
import Crypto from 'crypto';

import redisClient from '../storage/redis-client-factory';
//import Hash from '../storage/hash';
//import Key from '../storage/key';
import OrderedSet from '../storage/ordered-set';
import UnorderedSet from '../storage/unordered-set';
//import Board from '../boards';
import * as Tools from '../helpers/tools';

//let FileInfos = new Hash(redisClient(), 'fileInfos');
let Chat = new OrderedSet(redisClient(), 'chat');
let Chats = new UnorderedSet(redisClient(), 'chats', {
  parse: false,
  stringify: false
});
/*let Posts = new Hash(redisClient(), 'posts');
let ReferringPosts = new Hash(redisClient(), 'referringPosts');
let ReferencedPosts = new Hash(redisClient(), 'referencedPosts');
let UserBans = new Key(redisClient(), 'userBans');*/

function createUserHash(user) {
  let sha256 = Crypto.createHash('sha256');
  sha256.update(user.hashpass || user.ip);
  return sha256.digest('hex');
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
