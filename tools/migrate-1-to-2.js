#!/usr/bin/env node

require('babel-polyfill');
require('source-map-support/register');
let _ = require('underscore');
let FS = require('q-io/fs');

let Tools = require('../server/helpers/tools');
let Hash = require('../server/storage/hash').default;
let OrderedSet = require('../server/storage/ordered-set').default;
let redisClient = require('../server/storage/redis-client-factory').default;
let sqlClient = require('../server/storage/sql-client-factory').default;
let UnorderedSet = require('../server/storage/unordered-set').default;

let ArchivedFileHashes = new UnorderedSet(sqlClient(), 'archivedFileHashes');
let ArchivedFileInfos = new Hash(sqlClient(), 'archivedFileInfos');
let ArchivedPostFileInfoNames = new UnorderedSet(sqlClient(), 'archivedPostFileInfoNames', {
  parse: false,
  stringify: false
});
let ArchivedReferringPosts = new Hash(sqlClient(), 'archivedReferringPosts');
let ArchivedReferencedPosts = new Hash(sqlClient(), 'archivedReferencedPosts');
let ArchivedThreadPostNumbers = new UnorderedSet(sqlClient(), 'archivedThreadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let ArchivedPosts = new Hash(sqlClient(), 'archivedPosts');
let ArchivedThreads = new Hash(sqlClient(), 'archivedThreads');
let ArchivedThreadsOld = new Hash(redisClient(), 'archivedThreads');
let ArchivedThreadUpdateTimes = new Hash(sqlClient(), 'archivedThreadUpdateTimes', {
  parse: false,
  stringify: false
});
let Chat = new OrderedSet(redisClient(), 'chat');
let FileHashes = new UnorderedSet(redisClient(), 'fileHashes');
let FileInfos = new Hash(redisClient(), 'fileInfos');
let PostExtraData = new Hash(redisClient(), 'postExtraData');
let PostFileInfoNames = new UnorderedSet(redisClient(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
let Posts = new Hash(redisClient(), 'posts');
let ReferringPosts = new Hash(redisClient(), 'referringPosts');
let ReferencedPosts = new Hash(redisClient(), 'referencedPosts');
let ThreadPostNumbers = new UnorderedSet(redisClient(), 'threadPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});
let ThreadUpdateTimes = new Hash(redisClient(), 'threadUpdateTimes', {
  parse: false,
  stringify: false
});
let UserBanPostNumbers = new Hash(redisClient(), 'userBanPostNumbers', {
  parse: number => +number,
  stringify: number => number.toString()
});

console.log('Starting...');

function processPosts() {
  let extraData = {};
  return Posts.keys().then((keys) => {
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
    return FS.write(`${__dirname}/../backup/extraDataFromPost.json`, JSON.stringify(extraData));
  }).then(() => {
    return PostExtraData.getAll();
  }).then((extraData) => {
    return FS.write(`${__dirname}/../backup/extraData.json`, JSON.stringify(extraData));
  });
}

function processUserBans() {
  return UserBanPostNumbers.getAll().then((result) => {
    return Tools.series(result, (value, key) => {
      return UserBanPostNumbers.setOne(key.replace(/^userBanPostNumbers/, ''), value).then(() => {
        return UserBanPostNumbers.deleteOne(key);
      });
    });
  });
}

function processChats() {
  return Chat.find().then((keys) => {
    let subkeys = keys.map(key => key.replace(/^chat/, ''));
    return Tools.series(subkeys, (subkey) => {
      return Chat.delete(subkey);
    });
  });
}

function processArchivedThreads() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedThreadsOld.find();
  }).then((keys) => {
    return Tools.series(keys.map(key => key.split(':').pop()), (boardName) => {
      return ArchivedThreadsOld.getAll(boardName).then((result) => {
        return Tools.series(result, (thread, threadNumber) => {
          return ArchivedThreads.setOne(threadNumber, thread, boardName);
        });
      }).then(() => {
        return ArchivedThreadsOld.delete(boardName);
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

function processThreadUpdateTimes() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedThreads.find();
  }).then((keys) => {
    return Tools.series(keys.map(key => key.split(':').pop()), (boardName) => {
      return ArchivedThreads.keys(boardName).then((threadNumbers) => {
        return Tools.series(threadNumbers, (threadNumber) => {
          return ThreadUpdateTimes.getOne(threadNumber, boardName).then((dateTime) => {
            return ArchivedThreadUpdateTimes.setOne(threadNumber, dateTime, boardName);
          }).then(() => {
            return ThreadUpdateTimes.deleteOne(threadNumber, boardName);
          });
        });
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

function processThreadPostNumbers() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedThreads.find();
  }).then((keys) => {
    return Tools.series(keys.map(key => key.split(':').pop()), (boardName) => {
      return ArchivedThreads.keys(boardName).then((threadNumbers) => {
        return Tools.series(threadNumbers, (threadNumber) => {
          let key = `${boardName}:${threadNumber}`;
          return ThreadPostNumbers.getAll(key).then((list) => {
            return ArchivedThreadPostNumbers.addSome(list, key);
          }).then(() => {
            return ThreadPostNumbers.delete(key);
          });
        });
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

function processArchivedPosts() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedThreads.find();
  }).then((keys) => {
    return Tools.series(keys.map(key => key.split(':').pop()), (boardName) => {
      return ArchivedThreads.keys(boardName).then((threadNumbers) => {
        return Tools.series(threadNumbers, (threadNumber) => {
          return ArchivedThreadPostNumbers.getAll(`${boardName}:${threadNumber}`).then((postNumbers) => {
            return Tools.series(postNumbers, (postNumber) => {
              let key = `${boardName}:${postNumber}`;
              return Posts.getOne(key).then((post) => {
                post.archived = true;
                return ArchivedPosts.setOne(key, post);
              }).then(() => {
                return Posts.deleteOne(key);
              });
            });
          });
        });
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

function processArchivedPostReferences() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedPosts.keys();
  }).then((keys) => {
    return Tools.series(keys, (key) => {
      return ReferringPosts.getAll(key).then((result) => {
        return ArchivedReferringPosts.setSome(result, key);
      }).then(() => {
        return ReferringPosts.delete(key);
      }).then(() => {
        return ReferencedPosts.getAll(key);
      }).then((result) => {
        return ArchivedReferencedPosts.setSome(result, key);
      }).then(() => {
        return ReferencedPosts.delete(key);
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

function createFileHash(fileInfo) {
  return {
    name: fileInfo.name,
    thumb: { name: fileInfo.thumb.name },
    size: fileInfo.size,
    boardName: fileInfo.boardName,
    mimeType: fileInfo.mimeType,
    rating: fileInfo.rating
  };
}

function processArchivedFiles() {
  return sqlClient().then((client) => {
    return client.transaction();
  }).then(() => {
    return ArchivedPosts.keys();
  }).then((keys) => {
    return Tools.series(keys, (key) => {
      let fileNames;
      let fileInfos;
      return PostFileInfoNames.getAll(key).then((list) => {
        fileNames = list;
        return ArchivedPostFileInfoNames.addSome(fileNames, key);
      }).then(() => {
        return PostFileInfoNames.delete(key);
      }).then(() => {
        return Tools.series(fileNames, function(fileName) {
          return FileInfos.getOne(fileName);
        }, {});
      }).then((list) => {
        fileInfos = list;
        return ArchivedFileInfos.setSome(fileInfos);
      }).then(() => {
        return FileInfos.deleteSome(fileNames);
      }).then(() => {
        return Tools.series(fileInfos, function(fileInfo) {
          let fileHash = createFileHash(fileInfo);
          return ArchivedFileHashes.addOne(fileHash, fileInfo.hash).then(() => {
            return FileHashes.deleteOne(fileHash, fileInfo.hash);
          }).then(() => {
            return FileHashes.count(fileInfo.hash);
          }).then((size) => {
            if (size <= 0) {
              return FileHashes.delete(fileInfo.hash);
            }
          });
        });
      });
    });
  }).then(() => {
    return sqlClient();
  }).then((client) => {
    return client.commit();
  });
}

const MAP = {
  'posts': processPosts,
  'user-bans': processUserBans,
  'chats': processChats,
  'archived-threads': processArchivedThreads,
  'thread-update-times': processThreadUpdateTimes,
  'thread-post-numbers': processThreadPostNumbers,
  'archived-posts': processArchivedPosts,
  'archived-post-references': processArchivedPostReferences,
  'archived-files': processArchivedFiles
}

const ALL = _(MAP).map((_1, key) => { return key; });

let toProcess = _(process.argv.filter(arg => MAP.hasOwnProperty(arg))).uniq();
if (process.argv.indexOf('--all') >= 0) {
  toProcess = ALL;
}

console.log('Available:', ALL.concat('--all'));
console.log('Selected:', toProcess);

Tools.series(toProcess, (id) => {
  let f = MAP[id];
  if (typeof f !== 'function') {
    return;
  }
  console.log('Processing: ' + id);
  return f();
}).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.log(err);
  process.exit(1);
});
