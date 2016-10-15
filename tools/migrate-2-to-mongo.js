#!/usr/bin/env node

require('babel-polyfill');
require('source-map-support/register');
const _ = require('underscore');

const Board = require('../server/boards/board').default;
const Tools = require('../server/helpers/tools');
const Hash = require('../server/storage/hash').default;
const Key = require('../server/storage/key').default;
const mongodbClient = require('../server/storage/mongodb-client-factory').default;
const redisClient = require('../server/storage/redis-client-factory').default;
const sqlClient = require('../server/storage/sql-client-factory').default;
const UnorderedSet = require('../server/storage/unordered-set').default;

let client = mongodbClient();
let ArchivedFileInfos = new Hash(sqlClient(), 'archivedFileInfos');
let ArchivedPostFileInfoNames = new UnorderedSet(sqlClient(), 'archivedPostFileInfoNames', {
  parse: false,
  stringify: false
});
let ArchivedReferringPosts = new Hash(sqlClient(), 'archivedReferringPosts');
let ArchivedReferencedPosts = new Hash(sqlClient(), 'archivedReferencedPosts');
let ArchivedPosts = new Hash(sqlClient(), 'archivedPosts');
let ArchivedThreadFixedFlags = new Hash(sqlClient(), 'archivedThreadFixedFlags', {
  parse: flag => !!flag,
  stringify: flag => +(!!flag)
});
let ArchivedThreadPostNumbers = new UnorderedSet(sqlClient(), 'archivedThreadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let ArchivedThreads = new Hash(sqlClient(), 'archivedThreads');
let ArchivedThreadUpdateTimes = new Hash(sqlClient(), 'archivedThreadUpdateTimes', {
  parse: false,
  stringify: false
});
let FileInfos = new Hash(redisClient(), 'fileInfos');
let PostCounters = new Hash(redisClient(), 'postCounters', {
  parse: number => +number,
  stringify: number => number.toString()
});
let PostFileInfoNames = new UnorderedSet(redisClient(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
let Posts = new Hash(redisClient(), 'posts');
let ReferringPosts = new Hash(redisClient(), 'referringPosts');
let ReferencedPosts = new Hash(redisClient(), 'referencedPosts');
let RegisteredUserHashes = new Hash(redisClient(), 'registeredUserHashes', {
  parse: false,
  stringify: false
});
let RegisteredUserIPs = new UnorderedSet(redisClient(), 'registeredUserIps', {
  parse: false,
  stringify: false
});
let RegisteredUserLevels = new Hash(redisClient(), 'registeredUserLevels', {
  parse: false,
  stringify: false
});
let SuperuserHashes = new UnorderedSet(redisClient(), 'superuserHashes', {
  parse: false,
  stringify: false
});
let ThreadFixedFlags = new Hash(redisClient(), 'threadFixedFlags', {
  parse: flag => !!flag,
  stringify: flag => +(!!flag)
});
let ThreadPostNumbers = new UnorderedSet(redisClient(), 'threadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let Threads = new Hash(redisClient(), 'threads');
let ThreadUpdateTimes = new Hash(redisClient(), 'threadUpdateTimes', {
  parse: false,
  stringify: false
});
let UserBans = new Key(redisClient(), 'userBans');

const COLLECTION_NAMES = ['post', 'postCounter', 'thread', 'user', 'bannedUser'];
const POST_SOURCES = [{
  Posts: Posts,
  FileInfos: FileInfos,
  PostFileInfoNames: PostFileInfoNames,
  ReferringPosts: ReferringPosts,
  ReferencedPosts: ReferencedPosts,
  ThreadFixedFlags: ThreadFixedFlags,
  ThreadPostNumbers: ThreadPostNumbers,
  Threads: Threads,
  ThreadUpdateTimes: ThreadUpdateTimes
}, {
  archived: true,
  Posts: ArchivedPosts,
  FileInfos: ArchivedFileInfos,
  PostFileInfoNames: ArchivedPostFileInfoNames,
  ReferringPosts: ArchivedReferringPosts,
  ReferencedPosts: ArchivedReferencedPosts,
  ThreadFixedFlags: ArchivedThreadFixedFlags,
  ThreadPostNumbers: ArchivedThreadPostNumbers,
  Threads: ArchivedThreads,
  ThreadUpdateTimes: ArchivedThreadUpdateTimes
}];

console.log('Starting...');

let c = { postNumbers: {} };

Board.initialize();

function initCollections() {
  c.c = {};
  return Tools.series(COLLECTION_NAMES, (collectionName) => {
    return client.collection(collectionName).then((collection) => {
      c.c[collectionName] = collection;
    });
  });
}

function migrateUser(hash) {
  let user = {
    hashpass: hash,
    levels: []
  };
  return RegisteredUserLevels.getAll(hash).then((levels) => {
    _(levels).each((level, boardName) => {
      user.levels.push({
        boardName: boardName,
        level: level
      });
    });
    return RegisteredUserIPs.getAll(hash);
  }).then((ips) => {
    user.ips = ips.map((ip) => {
      return {
        ip: ip,
        binary: Tools.binaryAddress(ip)
      };
    });
    return c.c.user.insertOne(user);
  });
}

function migrateSuperuser(hash) {
  let user = {
    hashpass: hash,
    superuser: true
  };
  return RegisteredUserIPs.getAll(hash).then((ips) => {
    user.ips = ips;
    return c.c.user.insertOne(user);
  });
}

function migrateUsers() {
  return RegisteredUserLevels.find().then((keys) => {
    return Tools.series(keys.map(key => key.split(':')[1]), migrateUser);
  }).then(() => {
    return SuperuserHashes.getAll();
  }).then((hashes) => {
    return Tools.series(hashes, migrateSuperuser);
  });
}

function migrateBannedUser(ip, boardNames) {
  return Tools.series(boardNames, (boardName) => {
    let subkey = `${ip}:${boardName}`;
    let cc = {};
    return UserBans.get(subkey);
  }, true).then((bans) => {
    bans.forEach((ban, index) => {
      ban.boardName = boardNames[index];
      ban.createdAt = new Date(ban.createdAt);
      if (ban.hasOwnProperty('expiresAt')) {
        ban.expiresAt = new Date(ban.expiresAt);
      }
    });
    return c.c.bannedUser.insertOne({
      ip: ip,
      bans: bans
    });
  });
}

function migrateBannedUsers() {
  return UserBans.find().then((keys) => {
    let bans = keys.map((key) => {
      return {
        ip: key.split(':').slice(1, -1).join(':'),
        boardName: key.split(':').slice(-1)[0]
      };
    });
    return Tools.series(bans.reduce((acc, ban) => {
      let boardNames = acc[ban.ip];
      if (!boardNames) {
        boardNames = [];
        acc[ban.ip] = boardNames;
      }
      boardNames.push(ban.boardName);
      return acc;
    }, {}), (boardNames, ip) => {
      return migrateBannedUser(ip, boardNames);
    });
  });
}

function getPostSequenceNumber(sources, boardName, threadNumber, postNumber) {
  let key = `${boardName}:${threadNumber}`;
  let postNumbers = c.postNumbers[key];
  if (postNumbers) {
    return Promise.resolve(postNumbers.indexOf(postNumber) + 1);
  }
  return sources.ThreadPostNumbers.getAll(key).then((postNumbers) => {
    postNumbers.sort((pn1, pn2) => { return pn1 - pn2; });
    c.postNumbers[key] = postNumbers;
    return (postNumbers.indexOf(postNumber) + 1);
  });
}

function migratePost(sources, key) {
  console.log(`Processing post: ${key}${sources.archived ? ' [arch]' : ''}`);
  let cc = {};
  return sources.Posts.getOne(key).then((post) => {
    cc.post = post;
    cc.post.archived = !!sources.archived;
    return getPostSequenceNumber(sources, post.boardName, post.threadNumber, post.number);
  }).then((sequenceNumber) => {
    cc.post.sequenceNumber = sequenceNumber;
    return UserBans.get(`${cc.post.user.ip}:${cc.post.boardName}`);
  }).then((ban) => {
    cc.post.options.bannedFor = !!(ban && ban.postNumber === cc.post.number);
    return sources.ReferencedPosts.getAll(key);
  }).then((referenced) => {
    cc.referenced = referenced;
    return sources.ReferringPosts.getAll(key);
  }).then((referring) => {
    cc.referring = referring;
    return Tools.series(cc.referring, (ref) => {
      if (ref.createdAt) {
        return;
      }
      return sources.ReferencedPosts.getAll(`${ref.boardName}:${ref.postNumber}`).then((otherRefs) => {
        let otherRef = _(otherRefs).find((otherRef) => {
          return (otherRef.boardName === cc.post.boardName) && (otherRef.postNumber === cc.post.number);
        });
        if (!otherRef || !otherRef.createdAt) {
          return;
        }
        ref.createdAt = otherRef.createdAt;
      });
    });
  }).then(() => {
    return sources.PostFileInfoNames.getAll(key);
  }).then((fileInfoNames) => {
    return sources.FileInfos.getSome(fileInfoNames);
  }).then((fileInfos) => {
    cc.post.referencedPosts = _(cc.referenced).toArray();
    cc.post.referringPosts = _(cc.referring).toArray();
    cc.post.fileInfos = _(fileInfos).toArray();
    if (!cc.post.hasOwnProperty('plainText')) {
      cc.post.plainText = null;
    }
    return c.c.post.insertOne(cc.post);
  });
}

function migratePosts(sources) {
  return sources.Posts.keys().then((keys) => {
    return Tools.series(keys, (key) => {
      return migratePost(sources, key);
    });
  });
}

function migrateThread(sources, boardName, threadNumber) {
  console.log(`Processing thread: ${boardName}:${threadNumber}${sources.archived ? ' [arch]' : ''}`);
  let cc = {};
  return sources.Threads.getOne(threadNumber, boardName).then((thread) => {
    cc.thread = thread;
    cc.thread.archived = !!sources.archived;
    return sources.ThreadUpdateTimes.getOne(threadNumber, boardName);
  }).then((updatedAt) => {
    cc.thread.updatedAt = updatedAt;
    return sources.ThreadFixedFlags.getOne(threadNumber, boardName);
  }).then((fixed) => {
    cc.thread.fixed = !!fixed;
    if (cc.thread.hasOwnProperty('options')) {
      delete cc.thread.options;
    }
    return c.c.thread.insertOne(cc.thread);
  });
}

function migrateThreads(sources) {
  return Threads.find().then((keys) => {
    let boardNames = keys.map(key => key.split(':')[1]);
    return Tools.series(boardNames, (boardName) => {
      return sources.Threads.keys(boardName).then((threadNumbers) => {
        return Tools.series(threadNumbers, (threadNumber) => {
          return migrateThread(sources, boardName, +threadNumber);
        });
      });
    });
  });
}

function migrateCounters() {
  return PostCounters.getAll().then((counters) => {
    return c.c.postCounter.insertMany(_(counters).map((lastPostNumber, boardName) => {
      return {
        _id: boardName,
        lastPostNumber: lastPostNumber
      };
    }));
  });
}

client.dropDatabase().then(() => {
  return client.createIndexes();
}).then(() => {
  return initCollections();
}).then(() => {
  return sqlClient();
}).then((sclient) => {
  return sclient.transaction();
}).then(() => {
  console.log('=== Migrating registeredUsers/superusers ===');
  return migrateUsers();
}).then(() => {
  console.log('=== registeredUsers/superusers migrated ===');
  console.log('=== Migrating bannedUsers ===');
  return migrateBannedUsers();
}).then(() => {
  console.log('=== bannedUsers migrated ===');
  console.log('=== Migrating postCounters ===');
  return migrateCounters();
}).then(() => {
  console.log('=== postCounters migrated ===');
  console.log('=== Migrating threads ===');
  return Tools.series(POST_SOURCES, migrateThreads);
}).then(() => {
  console.log('=== threads migrated ===');
  console.log('=== Migrating posts ===');
  return Tools.series(POST_SOURCES, migratePosts);
}).then(() => {
  console.log('=== posts migrated ===');
  return sqlClient();
}).then((sclient) => {
  return sclient.rollback();
}).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
