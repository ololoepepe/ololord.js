var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var bigInt = require("big-integer");
var Crypto = require("crypto");
var Elasticsearch = require("elasticsearch");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Redis = require("ioredis");
var SQLite3 = require("sqlite3");
var Util = require("util");

var mkpath = promisify("mkpath");

var Board = require("../boards");
var BoardModel = require("../models/board");
var Cache = require("./cache");
var Captcha = require("../captchas");
var config = require("./config");
var controller = require("./controller");
var Global = require("./global");
var markup = require("./markup");
var Permissions = require("./permissions");
var Tools = require("./tools");

var Ratings = {};
var RegisteredUserLevels = {};
var BanLevels = {};

var createRedisClient = function() {
    var redisNodes = config("system.redis.nodes");
    if (Util.isArray(redisNodes) && redisNodes.length > 0) {
        return new Redis.Cluster(redisNodes, {
            clusterRetryStrategy: config("system.redis.clusterRetryStrategy", function(times) {
                return Math.min(100 + times * 2, 2000);
            }),
            enableReadyCheck: config("system.redis.enableReadyCheck", false),
            scaleReads: config("system.redis.scaleReads", "master"),
            maxRedirections: config("system.redis.maxRedirections", 16),
            retryDelayOnFailover: config("system.redis.retryDelayOnFailover", 100),
            retryDelayOnClusterDown: config("system.redis.retryDelayOnClusterDown", 100),
            retryDelayOnTryAgain: config("system.redis.retryDelayOnTryAgain", 100),
            redisOptions: {
                password: config("system.redis.password", ""),
                db: config("system.redis.db", 0)
            }
        });
    } else {
        return new Redis({
            port: config("system.redis.port", 6379),
            host: config("system.redis.host", "127.0.0.1"),
            family: config("system.redis.family", 4),
            password: config("system.redis.password", ""),
            db: config("system.redis.db", 0)
        });
    }
};

var db = createRedisClient();
var dbGeo = new SQLite3.Database(__dirname + "/../geolocation/ip2location.sqlite");
var es = new Elasticsearch.Client({ host: config("system.elasticsearch.host", "localhost:9200") });

module.exports.db = db;
module.exports.es = es;

db.tmp_hmget = db.hmget;
db.hmget = function(key, hashes) {
    if (!hashes || (Util.isArray(hashes) && hashes.length <= 0))
        return Promise.resolve([]);
    return db.tmp_hmget.apply(db, arguments);
};

db.tmp_sadd = db.sadd;
db.sadd = function(key, members) {
    if (!members || (Util.isArray(members) && members.length <= 0))
        return Promise.resolve(0);
    return db.tmp_sadd.apply(db, arguments);
};

db.tmp_srem = db.srem;
db.srem = function(key, members) {
    if (!members || (Util.isArray(members) && members.length <= 0))
        return Promise.resolve(0);
    return db.tmp_srem.apply(db, arguments);
};

Ratings["SafeForWork"] = "SFW";
Ratings["Rating15"] = "R-15";
Ratings["Rating18"] = "R-18";
Ratings["Rating18G"] = "R-18G";

RegisteredUserLevels["Superuser"] = "SUPERUSER";
RegisteredUserLevels["Admin"] = "ADMIN";
RegisteredUserLevels["Moder"] = "MODER";
RegisteredUserLevels["User"] = "USER";

BanLevels["ReadOnly"] = "READ_ONLY";
BanLevels["NoAccess"] = "NO_ACCESS";

Object.defineProperty(module.exports, "Ratings", { value: Ratings });
Object.defineProperty(module.exports, "RegisteredUserLevels", { value: RegisteredUserLevels });

var sortedReferensces = function(references) {
    if (!references)
        return [];
    var list = [];
    Tools.forIn(references, function(ref) {
        list.push(JSON.parse(ref));
    });
    return list.sort(function(a, b) {
        var da = new Date(a.createdAt);
        var db = new Date(b.createdAt);
        if (da < db)
            return -1;
        if (da > db)
            return 1;
        if (a.boardName < b.boardName)
            return -1;
        if (a.boardName > b.boardName)
            return 1;
        if (a.postNumber < b.postNumber)
            return -1;
        if (a.postNumber > b.postNumber)
            return 1;
        return 0;
    }).map(function(ref) {
        delete ref.createdAt;
        return ref;
    });
};

var checkPermissions = function(req, board, post, permission, password) {
    if (req.isSuperuser())
        return Promise.resolve(true);
    if (compareRegisteredUserLevels(req.level(board.name), Permissions[permission]()) >= 0) {
        if (compareRegisteredUserLevels(req.level(board.name), post.user.level) > 0)
            return Promise.resolve(true);
        if (req.hashpass && req.hashpass == post.user.hashpass)
            return Promise.resolve(true);
        if (password && password == post.user.password)
            return Promise.resolve(true);
    }
    if (!board.opModeration)
        return Promise.resolve(false);
    return db.hget("threads:" + board.name, post.threadNumber).then(function(thread) {
        thread = JSON.parse(thread);
        if (thread.user.ip != req.ip && (!req.hashpass || req.hashpass != thread.user.hashpass))
            return Promise.resolve(false);
        if (compareRegisteredUserLevels(req.level(board.name), post.user.level) >= 0)
            return Promise.resolve(true);
        if (req.hashpass && req.hashpass == post.user.hashpass)
            return Promise.resolve(true);
        if (password && password == post.user.password)
            return Promise.resolve(true);
        return Promise.resolve(false);
    });
};

var threadPostNumbers = function(boardName, threadNumber) {
    return db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function(list) {
        if (!list)
            return Promise.resolve([]);
        return Promise.resolve(list.map(function(number) {
            return +number;
        }).sort(function(a, b) {
            a = +a;
            b = +b;
            if (a < b)
                return -1;
            else if (a > b)
                return 1;
            else
                return 0;
        }));
    });
};

module.exports.threadPostNumbers = threadPostNumbers;

var postFileInfoNames = function(boardName, postNumber) {
    return db.smembers("postFileInfoNames:" + boardName + ":" + postNumber).then(function(list) {
        if (!list)
            return Promise.resolve([]);
        return Promise.resolve(list.sort(function(a, b) {
            a = +a.split(".").shift();
            b = +b.split(".").shift();
            if (a < b)
                return -1;
            else if (a > b)
                return 1;
            else
                return 0;
        }));
    });
};

var getThreads = function(boardName, options) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    var opts = (typeof options == "object");
    var c = {};
    var key = ((options && options.archived) ? "archivedThreads" : "threads") + ":" + boardName;
    var p = db.hgetall(key).then(function(result) {
        if (!result)
            return [];
        var filter = opts && (typeof options.filterFunction == "function");
        var limit = (opts && !isNaN(options.limit) && options.limit > 0) ? options.limit : 0; //NOTE: 0 means no limit
        var i = 0;
        var threads = [];
        for (var number in result) {
            if (!result.hasOwnProperty(number))
                continue;
            var thread = JSON.parse(result[number]);
            if (!filter || options.filterFunction(thread))
                threads.push(thread);
            if (limit && threads.length >= limit)
                break;
        }
        return threads;
    }).then(function(threads) {
        var promises = threads.map(function(thread) {
            return db.hget("threadUpdateTimes:" + boardName, thread.number).then(function(time) {
                thread.updatedAt = time;
                return thread;
            });
        });
        return Promise.all(promises);
    });
    if (!opts || !options.withPostNumbers)
        return p;
    return p.then(function(threads) {
        c.threads = threads;
        var promises = threads.map(function(thread) {
            return threadPostNumbers(boardName, thread.number);
        });
        return Promise.all(promises);
    }).then(function(results) {
        results.forEach(function(result, i) {
            c.threads[i].postNumbers = result;
        });
        return c.threads;
    });
};

module.exports.getThreads = getThreads;

module.exports.getThread = function(boardName, threadNumber, archived) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    var key = archived ? "archivedThreads" : "threads";
    return db.hget(key + ":" + boardName, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = JSON.parse(thread);
        return db.hget("threadUpdateTimes:" + boardName, thread.number);
    }).then(function(time) {
        c.thread.updatedAt = time;
        return threadPostNumbers(boardName, c.thread.number);
    }).then(function(postNumbers) {
        c.thread.postNumbers = postNumbers;
        return Promise.resolve(c.thread);
    });
};

var bannedFor = function(boardName, postNumber, userIp) {
    return db.get("userBans:" + userIp + ":" + boardName).then(function(ban) {
        if (!ban)
            return Promise.resolve(false);
        return Promise.resolve(JSON.parse(ban).postNumber == postNumber);
    });
};

var threadPosts = function(boardName, threadNumber, options) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread"));
    var opts = (typeof options == "object");
    var filter = opts && (typeof options.filterFunction == "function");
    var limit = (opts && !isNaN(options.limit) && options.limit > 0) ? options.limit : 0; //NOTE: 0 means no limit
    var reverse = opts && options.reverse;
    var c = { posts: [] };
    var p = threadPostNumbers(boardName, threadNumber).then(function(result) {
        var i = reverse ? (result.length - 1) : 0;
        var bound = reverse ? -1 : result.length;
        var step = limit ? limit : result.length;
        var pred = function() {
            return reverse ? (i > bound) : (i < bound);
        };
        var getKeys = function() {
            var keys = [];
            var x = 0;
            for (; pred() && x < step; i += (reverse ? -1 : 1), ++x)
                keys.push(boardName + ":" + result[i]);
            return keys;
        };
        var getNext = function() {
            var keys = getKeys();
            return db.hmget("posts", keys).then(function(posts) {
                posts = posts.filter(function(post) {
                    return post;
                }).map(function(post) {
                    post = JSON.parse(post);
                    post.sequenceNumber = result.indexOf(post.number) + 1;
                    return post;
                });
                c.posts = c.posts.concat(filter? posts.filter(options.filterFunction) : posts);
                if (!pred() || (limit && c.posts.length >= limit)) {
                    if (limit && c.posts.length >= limit)
                        c.posts = c.posts.slice(0, limit);
                    return;
                }
                return getNext();
            });
        };
        return getNext();
    }).then(function() {
        var promises = c.posts.map(function(post) {
            return bannedFor(boardName, post.number, post.user.ip).then(function(banned) {
                post.bannedFor = banned;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    });
    if (!opts || (!options.withFileInfos && !options.withReferences && !options.withExtraData))
        return p;
    return p.then(function() {
        var promises = [];
        if (options.withFileInfos) {
            promises = c.posts.map(function(post) {
                return postFileInfoNames(boardName, post.number).then(function(names) {
                    return Promise.all(names.map(function(name) {
                        return db.hget("fileInfos", name);
                    }));
                }).then(function(fileInfos) {
                    post.fileInfos = fileInfos ? fileInfos.map(function(fileInfo) {
                        return JSON.parse(fileInfo);
                    }) : [];
                    if (post.fileInfos.indexOf(null) >= 0)
                    return Promise.resolve();
                });
            });
        }
        if (options.withReferences) {
            promises = promises.concat(c.posts.map(function(post) {
                return db.hgetall("referencedPosts:" + boardName + ":" + post.number).then(function(referencedPosts) {
                    post.referencedPosts = sortedReferensces(referencedPosts);
                    return db.hgetall("referringPosts:" + boardName + ":" + post.number);
                }).then(function(referringPosts) {
                    post.referringPosts = sortedReferensces(referringPosts);
                    return Promise.resolve();
                });
            }));
        }
        if (options.withExtraData) {
            promises = promises.concat(c.posts.map(function(post) {
                return board.loadExtraData(post.number).then(function(extraData) {
                    if (!Util.isNullOrUndefined(extraData))
                        post.extraData = extraData;
                    return Promise.resolve();
                })
            }));
        }
        return Promise.all(promises);
    }).then(function() {
        return c.posts;
    });
};

module.exports.threadPosts = threadPosts;

var getPost = function(boardName, postNumber, options) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    var opts = (typeof options == "object");
    var c = {};
    var key = boardName + ":" + postNumber;
    var p = db.hget("posts", key).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("No such post"));
        c.post = JSON.parse(post);
        return bannedFor(boardName, c.post.number, c.post.user.ip);
    }).then(function(banned) {
        c.post.bannedFor = banned;
        return Promise.resolve(c.post);
    });
    if (!opts || (!options.withFileInfos && !options.withReferences && !options.withExtraData))
        return p;
    return p.then(function() {
        return threadPostNumbers(c.post.boardName, c.post.threadNumber);
    }).then(function(postNumbers) {
        c.post.sequenceNumber = postNumbers.indexOf(c.post.number) + 1;
        var promises = [];
        if (options.withFileInfos) {
            promises.push(postFileInfoNames(boardName, postNumber).then(function(names) {
                c.names = names;
                return Promise.all(names.map(function(name) {
                    return db.hget("fileInfos", name);
                }));
            }).then(function(fileInfos) {
                return Promise.resolve(c.post.fileInfos = fileInfos ? fileInfos.map(function(fileInfo) {
                    return JSON.parse(fileInfo);
                }) : []);
            }));
        }
        if (options.withReferences) {
            promises.push(db.hgetall("referencedPosts:" + key).then(function(referencedPosts) {
                c.post.referencedPosts = sortedReferensces(referencedPosts);
                return db.hgetall("referringPosts:" + key);
            }).then(function(referringPosts) {
                c.post.referringPosts = sortedReferensces(referringPosts);
                return Promise.resolve();
            }));
        }
        if (options.withExtraData) {
            promises.push(board.loadExtraData(postNumber).then(function(extraData) {
                if (!Util.isNullOrUndefined(extraData))
                    c.post.extraData = extraData;
                return Promise.resolve();
            }));
        }
        return Promise.all(promises);
    }).then(function() {
        return c.post;
    });
};

module.exports.getPost = getPost;

var getFileInfo = function(file) {
    var p;
    if (file.fileName) {
        p = Promise.resolve(file.fileName);
    } else {
        p = db.srandmember("fileHashes:" + file.fileHash).then(function(fileInfo) {
            if (!fileInfo)
                return Promise.reject(Tools.translate("No such file"));
            return Promise.resolve(JSON.parse(fileInfo).name);
        });
    }
    return p.then(function(fileName) {
        return db.hget("fileInfos", fileName);
    }).then(function(fileInfo) {
        if (!fileInfo)
            return Promise.reject(Tools.translate("No such file"));
        return Promise.resolve(JSON.parse(fileInfo));
    });
};

module.exports.getFileInfo = getFileInfo;

module.exports.threadPostCount = function(boardName, threadNumber) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread"));
    return db.scard("threadPostNumbers:" + boardName + ":" + threadNumber);
};

var toHashpass = function(password, notHashpass) {
    if (notHashpass || !Tools.mayBeHashpass(password))
        password = Tools.sha1(password);
    return password;
};

module.exports.addSuperuser = function(password, ips, notHashpass) {
    if (!password)
        return Promise.reject(Tools.translate("Invalid password"));
    var invalidIp;
    if (Util.isArray(ips)) {
        invalidIp = ips.some(function(ip, i) {
            ip = Tools.correctAddress(ip);
            if (!ip)
                return true;
            ips[i] = ip;
        });
    }
    if (invalidIp)
        return Promise.reject(Tools.translate("Invalid IP address"));
    var hashpass = toHashpass(password, notHashpass);
    return db.exists("registeredUserLevels:" + hashpass).then(function(result) {
        if (result)
            return Promise.reject(Tools.translate("A user with this hashpass is already registered"));
        return db.sadd("superuserHashes", hashpass);
    }).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("A user with this hashpass is already registered"));
        return Tools.series(ips, function(ip) {
            return db.hset("registeredUserHashes", ip, hashpass).then(function() {
                return db.sadd("registeredUserIps:" + hashpass, ip);
            });
        });
        return Promise.resolve();
    });
};

module.exports.removeSuperuser = function(password, notHashpass) {
    if (!password)
        return Promise.reject(Tools.translate("Invalid password"));
    var hashpass = toHashpass(password, notHashpass);
    return db.srem("superuserHashes", hashpass).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("No user with this hashpass"));
    }).then(function() {
        return db.smembers("registeredUserIps:" + hashpass);
    }).then(function(ips) {
        if (!ips)
            return Promise.resolve();
        return Tools.series(ips, function(ip) {
            return db.hdel("registeredUserHashes", ip);
        });
    }).then(function() {
        return db.del("registeredUserIps:" + hashpass);
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.registerUser = function(password, levels, ips, notHashpass) {
    if (!password)
        return Promise.reject(Tools.translate("Invalid password"));
    var hashpass = toHashpass(password, notHashpass);
    if (!Tools.hasOwnProperties(levels))
        return Promise.reject(Tools.translate("Access level is not specified for any board"));
    var invalidBoard = Object.keys(levels).some(function(boardName) {
        if (!Board.board(boardName))
            return true;
    });
    if (invalidBoard)
        return Promise.reject(Tools.translate("Invalid board"));
    var invalidLevel = Tools.toArray(levels).some(function(level) {
        if (compareRegisteredUserLevels(level, RegisteredUserLevels.User) < 0
            || compareRegisteredUserLevels(level, RegisteredUserLevels.Superuser) >= 0) {
            return true;
        }
    });
    if (invalidLevel)
        return Promise.reject(Tools.translate("Invalid access level"));
    var invalidIp;
    if (Util.isArray(ips)) {
        invalidIp = ips.some(function(ip, i) {
            ip = Tools.correctAddress(ip);
            if (!ip)
                return true;
            ips[i] = ip;
        });
    }
    if (invalidIp)
        return Promise.reject(Tools.translate("Invalid IP address"));
    return db.exists("registeredUserLevels:" + hashpass).then(function(result) {
        if (result)
            return Promise.reject(Tools.translate("A user with this hashpass is already registered"));
        return db.sismember("superuserHashes", hashpass);
    }).then(function(result) {
        if (result)
            return Promise.reject(Tools.translate("A user with this hashpass is already registered as superuser"));
        return db.hmset("registeredUserLevels:" + hashpass, levels);
    }).then(function() {
        if (!Util.isArray(ips))
            return Promise.resolve();
        return Tools.series(ips, function(ip) {
            return db.hset("registeredUserHashes", ip, hashpass).then(function() {
                return db.sadd("registeredUserIps:" + hashpass, ip);
            });
        });
    }).then(function() {
        return Promise.resolve(hashpass);
    });
};

module.exports.unregisterUser = function(hashpass) {
    if (!hashpass || !Tools.mayBeHashpass(hashpass))
        return Promise.reject(Tools.translate("Invalid hashpass"));
    return db.del("registeredUserLevels:" + hashpass).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("No user with this hashpass"));
        return db.smembers("registeredUserIps:" + hashpass);
    }).then(function(ips) {
        if (!ips)
            return Promise.resolve();
        return Tools.series(ips, function(ip) {
            return db.hdel("registeredUserHashes", ip);
        });
    }).then(function() {
        return db.del("registeredUserIps:" + hashpass);
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.updateRegisteredUser = function(hashpass, levels, ips, notHashpass) {
    if (!hashpass || !Tools.mayBeHashpass(hashpass))
        return Promise.reject(Tools.translate("Invalid hashpass"));
    if (!Tools.hasOwnProperties(levels))
        return Promise.reject(Tools.translate("Access level is not specified for any board"));
    var invalidBoard = Object.keys(levels).some(function(boardName) {
        if (!Board.board(boardName))
            return true;
    });
    if (invalidBoard)
        return Promise.reject(Tools.translate("Invalid board"));
    var invalidLevel = Tools.toArray(levels).some(function(level) {
        if (compareRegisteredUserLevels(level, RegisteredUserLevels.User) < 0
            || compareRegisteredUserLevels(level, RegisteredUserLevels.Superuser) >= 0) {
            return true;
        }
    });
    if (invalidLevel)
        return Promise.reject(Tools.translate("Invalid access level"));
    var invalidIp;
    if (Util.isArray(ips)) {
        invalidIp = ips.some(function(ip, i) {
            ip = Tools.correctAddress(ip);
            if (!ip)
                return true;
            ips[i] = ip;
        });
    }
    if (invalidIp)
        return Promise.reject(Tools.translate("Invalid IP address"));
    return db.del("registeredUserLevels:" + hashpass).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("No user with this hashpass"));
        return db.hmset("registeredUserLevels:" + hashpass, levels);
    }).then(function() {
        return db.smembers("registeredUserIps:" + hashpass);
    }).then(function(ips) {
        if (!ips)
            return Promise.resolve();
        return Tools.series(ips, function(ip) {
            return db.hdel("registeredUserHashes", ip);
        });
    }).then(function() {
        return db.del("registeredUserIps:" + hashpass);
    }).then(function() {
        if (!Util.isArray(ips))
            return Promise.resolve();
        return Tools.series(ips, function(ip) {
            return db.hset("registeredUserHashes", ip, hashpass).then(function() {
                return db.sadd("registeredUserIps:" + hashpass, ip);
            });
        });
    }).then(function() {
        return Promise.resolve();
    });
};

var registeredUser = function(hashpass) {
    var user = { hashpass: hashpass };
    return db.hgetall("registeredUserLevels:" + hashpass).then(function(levels) {
        if (!levels || !Tools.hasOwnProperties(levels))
            return Promise.reject(Tools.translate("No user with this hashpass"));
        user.levels = levels;
        return db.smembers("registeredUserIps:" + hashpass);
    }).then(function(ips) {
        user.ips = ips || [];
        return Promise.resolve(user);
    });
};

module.exports.registeredUser = registeredUser;

module.exports.registeredUsers = function() {
    return db.keys("registeredUserLevels:*").then(function(keys) {
        return Tools.series(keys.map(function(key) {
            return key.split(":")[1];
        }), function(hashpass) {
            return registeredUser(hashpass);
        }, true);
    });
};

var registeredUserLevel = function(password, boardName, notHashpass) {
    if (!password)
        return Promise.reject(Tools.translate("Invalid password"));
    if (!Board.board(boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    var hashpass = toHashpass(password, notHashpass);
    return db.sismember("superuserHashes", hashpass).then(function(result) {
        if (!result)
            return db.hgetall("registeredUserLevels:" + hashpass);
        return Promise.resolve({ boardName: RegisteredUserLevels.Superuser });
    }).then(function(levels) {
        levels = levels || {};
        return Promise.resolve(levels[boardName] || null);
    });
};

module.exports.registeredUserLevel = registeredUserLevel;

var registeredUserLevelByIp = function(ip, boardName) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return Promise.reject(Tools.translate("Invalid IP address"));
    return db.hget("registeredUserHashes", ip).then(function(hashpass) {
        if (!hashpass)
            return Promise.resolve(null);
        return registeredUserLevel(hashpass, boardName);
    });
};

module.exports.registeredUserLevelByIp = registeredUserLevelByIp;

var registeredUserLevels = function(reqOrHashpass) {
    if (reqOrHashpass && typeof reqOrHashpass == "object" && reqOrHashpass.cookies)
        reqOrHashpass = Tools.hashpass(reqOrHashpass);
    if (!reqOrHashpass)
        return Promise.resolve(null);
    return db.sismember("superuserHashes", reqOrHashpass).then(function(result) {
        if (!result)
            return db.hgetall("registeredUserLevels:" + reqOrHashpass);
        return Promise.resolve(Board.boardNames().reduce(function(acc, boardName) {
            acc[boardName] = RegisteredUserLevels.Superuser;
            return acc;
        }, {}));
    }).then(function(levels) {
        return Promise.resolve(levels || {});
    });
};

module.exports.registeredUserLevels = registeredUserLevels;

var registeredUserLevelsByIp = function(ip) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return Promise.reject(Tools.translate("Invalid IP address"));
    return db.hget("registeredUserHashes", ip).then(function(hashpass) {
        if (!hashpass)
            return Promise.resolve({});
        return registeredUserLevels(hashpass);
    });
};

module.exports.registeredUserLevelsByIp = registeredUserLevelsByIp;

module.exports.registeredUserIps = function(reqOrHashpass) {
    if (reqOrHashpass && typeof reqOrHashpass == "object" && reqOrHashpass.cookies)
        reqOrHashpass = Tools.hashpass(reqOrHashpass);
    if (!reqOrHashpass)
        return Promise.resolve(null);
    return db.smembers("registeredUserIps:" + reqOrHashpass).then(function(ips) {
        return Promise.resolve(ips || []);
    });
};

var lastPostNumber = function(boardName) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    return db.hget("postCounters", boardName).then(function(number) {
        if (!number)
            return 0;
        return +number;
    });
};

module.exports.lastPostNumber = lastPostNumber;

var nextPostNumber = function(boardName, incrby) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    incrby = +incrby;
    if (isNaN(incrby) || incrby < 1)
        incrby = 1;
    return db.hincrby("postCounters", boardName, incrby).then(function(number) {
        if (!number)
            return 0;
        if (1 == incrby && board.skippedGetOrder > 0 && !(number % Math.pow(10, board.skippedGetOrder)))
            return nextPostNumber(boardName, incrby);
        return number;
    });
};

module.exports.nextPostNumber = nextPostNumber;

module.exports.getFileInfosByHashes = function(hashes) {
    if (!hashes)
        return Promise.resolve([]);
    if (!Util.isArray(hashes))
        hashes = [hashes];
    return Tools.series(hashes, function(hash) {
        return db.srandmember("fileHashes:" + hash).then(function(fileInfo) {
            fileInfo = JSON.parse(fileInfo);
            fileInfo.hash = hash;
            return Promise.resolve(fileInfo);
        });
    }, true);
};

var waitForFile = function(filePath, options) { //TODO: That is not okay
    var delay = (options && options.delay) || 50;
    var retry = (options && retry) || 4;
    var f = function() {
        return FS.exists(filePath).then(function(exists) {
            return Tools.promiseIf(exists, function() {
                return Promise.resolve();
            }, function() {
                if (!retry)
                    return Promise.reject((options && options.error) || "File not found");
                --retry;
                return (new Promise(function(resolve, reject) {
                    setTimeout(resolve, delay);
                })).then(retry);
            });
        });
    };
    return f();
};

var processFile = function(board, file, transaction) {
    return board.generateFileName(file).then(function(fn) {
        var targetFilePath = __dirname + "/../public/" + board.name + "/src/" + fn.name;
        var targetThumbPath = __dirname + "/../public/" + board.name + "/thumb/" + fn.thumbName;
        transaction.filePaths.push(targetFilePath);
        transaction.filePaths.push(targetThumbPath);
        if (file.copy) {
            var sourceFilePath = __dirname + "/../public/" + file.boardName + "/src/" + file.name;
            var sourceThumbPath = __dirname + "/../public/" + file.boardName + "/thumb/" + file.thumbName;
            return FS.copy(sourceFilePath, targetFilePath).then(function() {
                return FS.copy(sourceThumbPath, targetThumbPath);
            }).then(function() {
                return waitForFile(targetThumbPath, { error: Tools.translate("Failed to copy file") }); //TODO: Fix
            }).then(function() {
                return getFileInfo({ fileName: file.name });
            }).then(function(fileInfo) {
                return {
                    dimensions: fileInfo.dimensions,
                    extraData: fileInfo.extraData,
                    hash: fileInfo.hash,
                    ihash: fileInfo.ihash || null,
                    mimeType: fileInfo.mimeType,
                    name: fn.name,
                    rating: file.rating,
                    size: fileInfo.size,
                    thumb: {
                        dimensions: fileInfo.thumb.dimensions,
                        name: fn.thumbName
                    }
                };
            });
        } else {
            var sourceFilePath = file.path;
            var c = {};
            return board.processFile(file).then(function() {
                return FS.move(sourceFilePath, targetFilePath);
            }).then(function() {
                transaction.filePaths.push(file.thumbPath);
                return FS.move(file.thumbPath, targetThumbPath);
            }).then(function() {
                return waitForFile(targetThumbPath, { error: Tools.translate("Failed to copy file") }); //TODO: Fix
            }).then(function() {
                return {
                    dimensions: file.dimensions,
                    extraData: file.extraData,
                    hash: file.hash,
                    ihash: file.ihash || null,
                    mimeType: file.mimeType,
                    name: fn.name,
                    rating: file.rating,
                    size: file.size,
                    thumb: {
                        dimensions: file.thumbDimensions,
                        name: fn.thumbName
                    }
                };
            });
        }
    });
};

var processFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (files.length < 1)
        return Promise.resolve([]);
    return mkpath(__dirname + "/../public/" + board.name + "/src").then(function() {
        return mkpath(__dirname + "/../public/" + board.name + "/thumb");
    }).then(function() {
        return Tools.series(files, function(file) {
            return processFile(board, file, transaction);
        }, true);
    });
};

var createFileHash = function(fileInfo) {
    return {
        name: fileInfo.name,
        thumb: { name: fileInfo.thumb.name },
        size: fileInfo.size,
        boardName: fileInfo.boardName,
        mimeType: fileInfo.mimeType,
        rating: fileInfo.rating
    };
};

var addFileHashes = function(fileInfos) {
    if (!fileInfos)
        return Promise.resolve();
    if (!Util.isArray(fileInfos))
        fileInfos = [fileInfos];
    if (fileInfos.length < 1)
        return Promise.resolve();
    return Tools.series(fileInfos, function(fileInfo) {
        return db.sadd("fileHashes:" + fileInfo.hash, JSON.stringify(createFileHash(fileInfo)));
    });
};

var removeFileHashes = function(fileInfos) {
    if (!fileInfos)
        return Promise.resolve();
    if (!Util.isArray(fileInfos))
        fileInfos = [fileInfos];
    if (fileInfos.length < 1)
        return Promise.resolve();
    return Tools.series(fileInfos, function(fileInfo) {
        return db.srem("fileHashes:" + fileInfo.hash, JSON.stringify(createFileHash(fileInfo))).then(function() {
            return db.scard("fileHashes:" + fileInfo.hash);
        }).then(function(size) {
            if (size > 0)
                return Promise.resolve();
            return db.del("fileHashes:" + fileInfo.hash);
        });
    });
};

var createPost = function(req, fields, files, transaction, threadNumber, date) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!board.postingEnabled)
        return Promise.reject(Tools.translate("Posting is disabled at this board"));
    date = date || Tools.now();
    var c = {};
    if (threadNumber)
        c.postNumber = threadNumber;
    else
        threadNumber = +fields.threadNumber;
    var rawText = (fields.text || null);
    var markupModes = [];
    var referencedPosts = {};
    var password = Tools.sha1(fields.password);
    var hashpass = (req.hashpass || null);
    var ip = (req.ip || null);
    Tools.forIn(markup.MarkupModes, function(val) {
        if (fields.markupMode && fields.markupMode.indexOf(val) >= 0)
            markupModes.push(val);
    });
    return getThreads(board.name, {
        limit: 1,
        filterFunction: function(thread) {
            return thread.number == threadNumber;
        }
    }).then(function(threads) {
        if (!threads || threads.length != 1)
            return Promise.reject(Tools.translate("No such thread"));
        if (threads[0].closed)
            return Promise.reject(Tools.translate("Posting is disabled in this thread"));
        c.unbumpable = !!threads[0].unbumpable;
        c.level = req.level(board.name) || null;
        return db.scard("threadPostNumbers:" + board.name + ":" + threadNumber);
    }).then(function(postCount) {
        c.postCount = postCount;
        if (c.postCount >= board.postLimit)
            return Promise.reject(Tools.translate("Post limit reached"));
        return markup(board.name, rawText, {
            markupModes: markupModes,
            referencedPosts: referencedPosts,
            accessLevel: c.level
        });
    }).then(function(text) {
        c.text = text;
        return board.postExtraData(req, fields, files);
    }).then(function(extraData) {
        c.extraData = !Util.isNullOrUndefined(extraData) ? extraData : null;
        return getGeolocationInfo(ip);
    }).then(function(geo) {
        c.geo = geo;
        if (c.postNumber)
            return Promise.resolve(c.postNumber);
        else
            return nextPostNumber(board.name);
    }).then(function(postNumber) {
        c.postNumber = postNumber;
        c.post = {
            bannedFor: false,
            boardName: board.name,
            createdAt: date.toISOString(),
            email: fields.email || null,
            geolocation: c.geo,
            markup: markupModes,
            name: fields.name || null,
            number: c.postNumber,
            options: {
                showTripcode: !!req.hashpass && ("true" == fields.tripcode),
                signAsOp: ("true" == fields.signAsOp)
            },
            rawText: rawText,
            subject: fields.subject || null,
            text: c.text || null,
            plainText: (c.text ? Tools.plainText(c.text, { brToNewline: true }) : null),
            threadNumber: threadNumber,
            updatedAt: null,
            user: {
                hashpass: hashpass,
                ip: ip,
                level: c.level,
                password: password
            }
        };
        transaction.postNumber = c.postNumber;
        return db.hset("posts", board.name + ":" + c.postNumber, JSON.stringify(c.post));
    }).then(function() {
        return board.storeExtraData(c.postNumber, c.extraData);
    }).then(function() {
        return addReferencedPosts(c.post, referencedPosts);
    }).then(function() {
        return db.sadd("userPostNumbers:" + ip + ":" + board.name, c.postNumber);
    }).then(function() {
        if (files.length < 1)
            return Promise.resolve();
        return Promise.all(files.map(function(fileInfo) {
            fileInfo.boardName = board.name;
            fileInfo.postNumber = c.postNumber;
            return db.hset("fileInfos", fileInfo.name, JSON.stringify(fileInfo)).then(function() {
                return db.sadd("postFileInfoNames:" + board.name + ":" + c.postNumber, fileInfo.name);
            });
        }));
    }).then(function() {
        return addFileHashes(files);
    }).then(function() {
        return es.index({
            index: "ololord.js",
            type: "posts",
            id: board.name + ":" + c.postNumber,
            body: {
                plainText: c.post.plainText,
                subject: c.post.subject,
                boardName: board.name,
                threadNumber: c.post.threadNumber
            }
        })
    }).then(function() {
        return db.sadd("threadPostNumbers:" + board.name + ":" + threadNumber, c.postNumber);
    }).then(function() {
        if (c.postCount >= board.bumpLimit || (fields.email && fields.email.toLowerCase() == "sage"))
            return Promise.resolve();
        if (c.unbumpable)
            return Promise.resolve();
        return db.hset("threadUpdateTimes:" + board.name, threadNumber, date.toISOString());
    }).then(function() {
        c.post.referencedPosts = c.refs;
        c.fileInfos = files;
        return c.post;
    });
};

var checkCaptcha = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!board.captchaEnabled)
        return Promise.resolve();
    var ip = req.ip;
    return getUserCaptchaQuota(board.name, ip).then(function(quota) {
        if (board.captchaQuota > 0 && +quota > 0)
            return captchaUsed(board.name, ip);
        var supportedCaptchaEngines = board.supportedCaptchaEngines;
        if (supportedCaptchaEngines.length < 1)
            return Promise.reject(Tools.translate("Internal error"));
        var ceid = fields.captchaEngine;
        var isSupported = function(id) {
            for (var i = 0; i < supportedCaptchaEngines.length; ++i) {
                if (supportedCaptchaEngines[i].id == id)
                    return true;
            }
            return false;
        };
        if (!ceid || !isSupported(ceid)) {
            if (isSupported("node-captcha"))
                ceid = "node-captcha";
            else
                ceid = supportedCaptchaEngines[0].id;
        }
        var captcha = Captcha.captcha(ceid);
        if (!captcha)
            return Promise.reject(Tools.translate("Invalid captcha engine"));
        return captcha.checkCaptcha(req, fields).then(function() {
            return captchaSolved(board.name, ip);
        });
    });
};

module.exports.createPost = function(req, fields, files, transaction) {
    var threadNumber = +fields.threadNumber;
    var c = {};
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread"));
    return checkCaptcha(req, fields).then(function() {
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        return createPost(req, fields, files, transaction);
    }).then(function(post) {
        c.post = post;
        return Global.generate(post.boardName, post.threadNumber, post.number, "create");
    }).then(function() {
        return Promise.resolve(c.post);
    });
};

var rerenderReferringPosts = function(post, options) {
    return db.hgetall("referringPosts:" + post.boardName + ":" + post.number).then(function(referringPosts) {
        return Tools.series(referringPosts, function(ref) {
            ref = JSON.parse(ref);
            if (options && options.removingThread
                    && ref.boardName == post.boardName && ref.threadNumber == post.threadNumber) {
                return Promise.resolve();
            }
            return rerenderPost(ref.boardName, ref.postNumber, true);
        });
    });
};

var removeReferencedPosts = function(post, nogenerate) {
    var key = post.boardName + ":" + post.number;
    var c = {};
    return db.hgetall("referencedPosts:" + key).then(function(referencedPosts) {
        c.referencedPosts = {};
        var promises = [];
        Tools.forIn(referencedPosts, function(ref, refKey) {
            promises.push(db.hdel("referringPosts:" + refKey, key));
            ref = JSON.parse(ref);
            c.referencedPosts[refKey] = ref;
        });
        return Promise.all(promises);
    }).then(function() {
        if (!nogenerate) {
            Tools.forIn(c.referencedPosts, function(ref, refKey) {
                if (ref.boardName != post.boardName || ref.threadNumber != post.threadNumber)
                    Global.generate(ref.boardName, ref.threadNumber, ref.postNumber, "edit");
            });
        }
        return db.del("referencedPosts:" + key);
    });
};

var addReferencedPosts = function(post, referencedPosts, nogenerate) {
    var key = post.boardName + ":" + post.number;
    var promises = [];
    Tools.forIn(referencedPosts, function(ref, refKey) {
        promises.push(db.hset("referencedPosts:" + key, refKey, JSON.stringify(ref)));
    });
    return Promise.all(promises).then(function() {
        if (!nogenerate) {
            Tools.forIn(referencedPosts, function(ref, refKey) {
                if (ref.boardName != post.boardName || ref.threadNumber != post.threadNumber)
                    Global.generate(ref.boardName, ref.threadNumber, ref.postNumber, "edit");
            });
        }
        var promises = [];
        Tools.forIn(referencedPosts, function(ref, refKey) {
            promises.push(db.hset("referringPosts:" + refKey, key, JSON.stringify({
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                createdAt: refKey.createdAt
            })));
        });
        return Promise.all(promises);
    });
};

var removePost = function(boardName, postNumber, options) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return db.sadd("postsPlannedForDeletion", boardName + ":" + postNumber).then(function() {
        return getPost(boardName, postNumber, { withReferences: true });
    }).then(function(post) {
        c.post = post;
        return db.srem("threadPostNumbers:" + boardName + ":" + post.threadNumber, postNumber);
    }).then(function() {
        return db.hdel("posts", boardName + ":" + postNumber);
    }).then(function() {
        if (options && options.leaveReferences)
            return Promise.resolve();
        return rerenderReferringPosts(c.post, { removingThread: options && options.removingThread });
    }).catch(function(err) {
        Global.error(err);
    }).then(function() {
        if (options && options.leaveReferences)
            return Promise.resolve();
        return removeReferencedPosts(c.post);
    }).catch(function(err) {
        Global.error(err);
    }).then(function() {
        return db.srem("userPostNumbers:" + c.post.user.ip + ":" + board.name, postNumber);
    }).then(function() {
        return postFileInfoNames(boardName, postNumber);
    }).then(function(names) {
        c.fileInfoNames = names;
        return Promise.all(names.map(function(name) {
            return db.hget("fileInfos", name);
        }));
    }).then(function(fileInfos) {
        if (options && options.leaveFileInfos)
            return Promise.resolve();
        c.fileInfos = [];
        c.paths = [];
        fileInfos.forEach(function(fileInfo) {
            if (!fileInfo)
                return;
            fileInfo = JSON.parse(fileInfo);
            c.fileInfos.push(fileInfo);
            c.paths.push(__dirname + "/../public/" + boardName + "/src/" + fileInfo.name);
            c.paths.push(__dirname + "/../public/" + boardName + "/thumb/" + fileInfo.thumb.name);
        });
        return db.del("postFileInfoNames:" + boardName + ":" + postNumber);
    }).then(function() {
        if (options && options.leaveFileInfos)
            return Promise.resolve();
        return Promise.all(c.fileInfoNames.map(function(name) {
            return db.hdel("fileInfos", name);
        }));
    }).then(function() {
        if (options && options.leaveFileInfos)
            return Promise.resolve();
        return removeFileHashes(c.fileInfos);
    }).then(function() {
        return board.removeExtraData(postNumber);
    }).then(function() {
        return es.delete({
            index: "ololord.js",
            type: "posts",
            id: boardName + ":" + postNumber
        });
    }).then(function() {
        if (!options || !options.leaveFileInfos) {
            c.paths.forEach(function(path) {
                return FS.remove(path).catch(function(err) {
                    Global.error(err.stack || err);
                });
            });
        }
        return db.srem("postsPlannedForDeletion", boardName + ":" + postNumber);
    });
};

module.exports.removePost = removePost;

var removeThread = function(boardName, threadNumber, options) {
    var key = ((options && options.archived) ? "archivedThreads:" : "threads:") + boardName;
    return db.sadd("threadsPlannedForDeletion", boardName + ":" + threadNumber).then(function() {
        return db.hdel(key, threadNumber);
    }).then(function() {
        return db.hdel("threadUpdateTimes:" + boardName, threadNumber);
    }).then(function() {
        setTimeout(function() {
            var c = {};
            db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function(result) {
                c.postNumbers = result;
                return db.del("threadPostNumbers:" + boardName + ":" + threadNumber);
            }).then(function() {
                return Tools.series(c.postNumbers, function(postNumber) {
                    return removePost(boardName, postNumber, {
                        leaveFileInfos: options && options.leaveFileInfos,
                        leaveReferences: options && options.leaveReferences,
                        removingThread: true
                    });
                });
            }).then(function() {
                return db.srem("threadsPlannedForDeletion", boardName + ":" + threadNumber);
            }).catch(function(err) {
                Global.error(err.stack || err);
            });
        }, 5000);
        return Promise.resolve();
    });
};

module.exports.removeThread = removeThread;

module.exports.createThread = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!board.postingEnabled)
        return Promise.reject(Tools.translate("Posting is disabled at this board"));
    var c = {};
    var date = Tools.now();
    var hashpass = req.hashpass || null;
    var password = Tools.sha1(fields.password);
    return checkCaptcha(req, fields).then(function() {
        return getThreads(board.name);
    }).then(function(threads) {
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        if (c.threads.length < board.threadLimit)
            return Promise.resolve();
        return getThreads(board.name, { archived: true }).then(function(threads) {
            c.archivedThreads = threads;
            c.archivedThreads.sort(Board.sortThreadsByDate);
            if (c.archivedThreads.length <= 0 || c.archivedThreads.length < board.archiveLimit)
                return Promise.resolve();
            return removeThread(board.name, c.archivedThreads.pop().number, { archived: true });
        }).then(function() {
            c.thread = c.threads.pop();
            if (board.archiveLimit <= 0)
                return removeThread(board.name, c.thread.number);
            return db.hdel("threads:" + board.name, c.thread.number).then(function() {
                c.thread.archived = true;
                return db.hset("archivedThreads:" + board.name, c.thread.number, JSON.stringify(c.thread));
            }).then(function() {
                return db.smembers("threadPostNumbers:" + board.name + ":" + c.thread.number);
            }).then(function(numbers) {
                return Tools.series(numbers.map(function(number) {
                    return +number;
                }), function(number) {
                    return es.get({
                        index: "ololord.js",
                        type: "posts",
                        id: board.name + ":" + number
                    }).then(function(data) {
                        var body = data._source;
                        body.archived = true;
                        return es.index({
                            index: "ololord.js",
                            type: "posts",
                            id: board.name + ":" + number,
                            body: body
                        });
                    });
                });
            }).then(function() {
                c.archPath = `${__dirname}/../public/${board.name}/arch`;
                //NOTE: Yep, no return here for the sake of speed
                var oldThreadNumber = c.thread.number;
                mkpath(c.archPath).then(function() {
                    c.sourceId = `${board.name}/res/${oldThreadNumber}.json`;
                    return Cache.readFile(c.sourceId);
                }).then(function(data) {
                    c.model = JSON.parse(data);
                    c.model.thread.archived = true;
                    return FS.write(`${c.archPath}/${oldThreadNumber}.json`, JSON.stringify(c.model));
                }).then(function() {
                    return BoardModel.generateThreadHTML(board, oldThreadNumber, c.model, true);
                }).then(function(data) {
                    return FS.write(`${c.archPath}/${oldThreadNumber}.html`, data);
                }).then(function() {
                    return Cache.removeFile(c.sourceId);
                }).then(function() {
                    return Cache.removeFile(`${board.name}/res/${oldThreadNumber}.html`);
                }).catch(function(err) {
                    Global.error(err);
                });
                return Promise.resolve();
            });
        });
    }).then(function() {
        return nextPostNumber(board.name);
    }).then(function(threadNumber) {
        c.threadNumber = threadNumber;
        c.thread = {
            archived: false,
            boardName: board.name,
            closed: false,
            createdAt: date.toISOString(),
            fixed: false,
            unbumpable: false,
            number: c.threadNumber,
            user: {
                hashpass: hashpass,
                ip: (req.ip || null),
                level: req.level(board.name),
                password: password
            }
        };
        transaction.threadNumber = c.threadNumber;
        return db.hset("threads:" + board.name, c.threadNumber, JSON.stringify(c.thread));
    }).then(function() {
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        c.files = files;
        return createPost(req, fields, files, transaction, c.threadNumber, date);
    }).then(function(post) {
        return Global.generate(post.boardName, post.threadNumber, post.number, "create");
    }).then(function() {
        return c.thread;
    });
};

var userLevels = [
    "USER",
    "MODER",
    "ADMIN",
    "SUPERUSER"
];

var compareRegisteredUserLevels = function(l1, l2) {
    l1 = userLevels.indexOf(l1);
    l2 = userLevels.indexOf(l2);
    if (l1 < l2)
        return -1;
    else if (l1 > l2)
        return 1;
    else
        return 0;
};

module.exports.compareRegisteredUserLevels = compareRegisteredUserLevels;

var getGeolocationInfo = function(ip) {
    var info = {
        cityName: null,
        countryCode: null,
        countryName: null
    };
    if (!ip)
        return Promise.resolve(info);
    var address = Tools.correctAddress(ip);
    if (!address)
        return Promise.resolve(info);
    var ipv4 = Tools.preferIPv4(ip);
    var q = "SELECT ipFrom, countryCode, countryName, cityName FROM ip2location WHERE ipTo >= ? LIMIT 1";
    var stmt = dbGeo.prepare(q);
    stmt.pget = promisify(stmt.get);
    if (ipv4)
        address = bigInt(new Address4(ipv4).bigInteger().toString());
    else
        address = bigInt(new Address6(address).bigInteger().toString());
    return stmt.pget(address.toString()).then(function(result) {
        stmt.finalize();
        if (!result)
            return info;
        var ipFrom;
        try {
            ipFrom = bigInt(result.ipFrom);
        } catch (err) {
            return info;
        }
        if (ipFrom.greater(address))
            return info;
        info.cityName = result.cityName;
        info.countryCode = result.countryCode;
        info.countryName = result.countryName;
        return info;
    });
};

var Transaction = function() {
    this.filePaths = [];
    this.board = null;
    this.postNumber = 0;
    this.threadNumber = 0;
};

Transaction.prototype.rollback = function() {
    this.filePaths.forEach(function(path) {
        FS.exists(path).then(function(exists) {
            if (!exists)
                return;
            FS.remove(path).catch(function(err) {
                Global.error(err.stack || err);
            });
        });
    });
    if (this.threadNumber > 0)
        removeThread(this.board.name, this.threadNumber);
    if (this.postNumber > 0)
        removePost(this.board.name, this.postNumber);
};

module.exports.Transaction = Transaction;

var mapPhrase = function(phrase) {
    return {
        bool: {
            should: [
                { match_phrase: { plainText: phrase } },
                { match_phrase: { subject: phrase } }
            ]
        }
    };
};

module.exports.findPosts = function(query, boardName, page) {
    page = +page;
    if (!page || page < 0)
        page = 0;
    var startFrom = page * config("system.searchLimit", 100);
    var q = { bool: {} };
    if (query.requiredPhrases && query.requiredPhrases.length > 0)
        q.bool.must = query.requiredPhrases.map(mapPhrase);
    if (boardName)
        q.bool.must = (q.bool.must || []).concat({ match_phrase: { boardName: boardName } });
    if (query.excludedPhrases && query.excludedPhrases.length > 0)
        q.bool.must_not = query.excludedPhrases.map(mapPhrase);
    if (query.possiblePhrases && query.possiblePhrases.length > 0) {
        if (query.requiredPhrases && query.requiredPhrases.length > 0)
            q.bool.should = query.possiblePhrases.map(mapPhrase);
        else
            q.bool.must = (q.bool.must || []).concat({ bool: { should: query.possiblePhrases.map(mapPhrase) } });
    }
    return es.search({
        index: "ololord.js",
        type: "posts",
        from: startFrom,
        size: config("system.searchLimit", 100),
        body: { query: q }
    }).then(function(result) {
        return {
            posts: result.hits.hits.map(function(hit) {
                return {
                    boardName: hit._id.split(":").shift(),
                    number: +hit._id.split(":").pop(),
                    threadNumber: +hit._source.threadNumber,
                    plainText: hit._source.plainText,
                    subject: hit._source.subject,
                    archived: !!hit._source.archived
                };
            }),
            total: result.hits.total,
            max: config("system.searchLimit", 100)
        };
    });
};

var getUserCaptchaQuota = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    return db.hget("captchaQuotas", boardName + ":" + userIp).then(function(quota) {
        return Promise.resolve((+quota > 0) ? +quota : 0);
    });
};

module.exports.getUserCaptchaQuota = getUserCaptchaQuota;

var captchaSolved = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var quota = board.captchaQuota;
    if (quota < 1)
        return Promise.resolve(0);
    return db.hincrby("captchaQuotas", boardName + ":" + userIp, quota);
};

module.exports.captchaSolved = captchaSolved;

var captchaUsed = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (board.captchaQuota < 1)
        return Promise.resolve(0);
    return db.hincrby("captchaQuotas", boardName + ":" + userIp, -1).then(function(quota) {
        if (+quota < 0)
            return db.hset("captchaQuotas", boardName + ":" + userIp, 0);
        return (quota < 0) ? 0 : quota;
    });
};

module.exports.captchaUsed = captchaUsed;

var rerenderPost = function(boardName, postNumber, silent) {
    var key = boardName + ":" + postNumber;
    var c = {};
    if (!silent)
        console.log(`Rendering post: [${boardName}] ${postNumber}`);
    var referencedPosts = {};
    return getPost(boardName, postNumber).then(function(post) {
        c.post = post;
        return markup(c.post.boardName, c.post.rawText, {
            markupModes: c.post.markup,
            referencedPosts: referencedPosts,
            accessLevel: c.post.user.level
        });
    }).then(function(text) {
        c.post.text = text;
        return db.hset("posts", key, JSON.stringify(c.post));
    }).then(function() {
        return removeReferencedPosts(c.post, !silent);
    }).then(function() {
        return addReferencedPosts(c.post, referencedPosts, !silent);
    }).then(function() {
        if (silent)
            Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return Promise.resolve();
    });
};

var rerenderBoardPosts = function(boardName, posts) {
    return Tools.series(posts, function(post) {
        return rerenderPost(boardName, post);
    });
};

var rebuildPostSearchIndex = function(boardName, postNumber, threads) {
    var key = boardName + ":" + postNumber;
    if (!boardName || !postNumber)
        return Promise.resolve();
    console.log(`Rebuilding post search index: >>/${boardName}/${postNumber}`);
    threads = threads || {};
    var c = {};
    return getPost(boardName, postNumber).then(function(post) {
        c.post = post;
        return Tools.promiseIf(threads.hasOwnProperty(c.post.threadNumber), function() {
            return Promise.resolve(threads[c.post.threadNumber]);
        }, function() {
            return db.hget("threads:" + boardName, c.post.threadNumber).then(function(thread) {
                if (thread)
                    return Promise.resolve(thread);
                return db.hget("archivedThreads:" + boardName, c.post.threadNumber);
            }).then(function(thread) {
                if (!thread)
                    return Promise.reject(Tools.translate("No such thread"));
                thread = JSON.parse(thread);
                threads[thread.number] = thread;
                return Promise.resolve(thread);
            });
        });
    }).then(function(thread) {
        return es.index({
            index: "ololord.js",
            type: "posts",
            id: boardName + ":" + postNumber,
            body: {
                plainText: c.post.plainText,
                subject: c.post.subject,
                boardName: boardName,
                threadNumber: c.post.threadNumber,
                archived: !!thread.archived
            }
        });
    }).catch(function(err) {
        Global.error(err.stack || err);
        return Promise.resolve();
    }).then(function() {
        return Promise.resolve();
    });
};

var rebuildBoardSearchIndex = function(boardName, postNumbers) {
    var threads = {};
    return Tools.series(postNumbers, function(postNumber) {
        return rebuildPostSearchIndex(boardName, postNumber, threads);
    });
};

module.exports.rerenderPosts = function(boardNames) {
    var postNumbers = {};
    return db.hkeys("posts").then(function(keys) {
        keys.forEach(function(key) {
            var boardName = key.split(":").shift();
            var postNumber = +key.split(":").pop();
            if (!postNumbers.hasOwnProperty(boardName))
                postNumbers[boardName] = [];
            postNumbers[boardName].push(postNumber);
        });
        var postList = boardNames.map(function(boardName) {
            return {
                boardName: boardName,
                postNumbers: (postNumbers.hasOwnProperty(boardName) ? postNumbers[boardName] : [])
            };
        });
        return Tools.series(postList, function(item) {
            return rerenderBoardPosts(item.boardName, item.postNumbers);
        });
    });
};

module.exports.rebuildSearchIndex = function() {
    var posts = {};
    return db.hkeys("posts").then(function(keys) {
        keys.forEach(function(key) {
            var boardName = key.split(":").shift();
            var postNumber = +key.split(":").pop();
            if (!posts.hasOwnProperty(boardName))
                posts[boardName] = [];
            posts[boardName].push(postNumber);
        });
        var postList = Board.boardNames().map(function(boardName) {
            return {
                boardName: boardName,
                posts: (posts.hasOwnProperty(boardName) ? posts[boardName] : [])
            };
        });
        return Tools.series(postList, function(item) {
            return rebuildBoardSearchIndex(item.boardName, item.posts);
        });
    });
};

module.exports.addFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    return getPost(board.name, postNumber, { withExtraData: true }).then(function(post) {
        c.post = post;
        return checkPermissions(req, board, post, "addFilesToPost");
    }).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("Not enough rights"));
        return postFileInfoNames(board.name, c.post.number);
    }).then(function(names) {
        if (names.length + files.length > board.maxFileCount)
            return Promise.reject(Tools.translate("Too many files"));
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        c.files = files;
        return Tools.series(c.files, function(fileInfo) {
            fileInfo.boardName = board.name;
            fileInfo.postNumber = c.post.number;
            return db.hset("fileInfos", fileInfo.name, JSON.stringify(fileInfo)).then(function() {
                return db.sadd("postFileInfoNames:" + board.name + ":" + c.post.number, fileInfo.name);
            });
        });
    }).then(function() {
        return addFileHashes(c.files);
    }).then(function() {
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return Promise.resolve(c.post);
    });
};

module.exports.editPost = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var date = Tools.now();
    var c = {};
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    var rawText = fields.text || null;
    var email = fields.email || null;
    var name = fields.name || null;
    var subject = fields.subject || null;
    var markupModes = [];
    var referencedPosts = {};
    Tools.forIn(markup.MarkupModes, function(val) {
        if (fields.markupMode && fields.markupMode.indexOf(val) >= 0)
            markupModes.push(val);
    });
    return getPost(board.name, postNumber, { withExtraData: true }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("Invalid post"));
        c.post = post;
        return db.hget("threads:" + board.name, c.post.threadNumber);
    }).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        return checkPermissions(req, board, c.post, "editPost");
    }).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("Not enough rights"));
        return postFileInfoNames(c.post.boardName, c.post.number);
    }).then(function(numbers) {
        if (!rawText && numbers.length < 1)
            return Promise.reject(Tools.translate("Both file and comment are missing"));
        if (rawText && rawText.length > board.maxTextLength)
            return Promise.reject(Tools.translate("Text is too long"));
        if (email && email.length > board.maxEmailLength)
            return Promise.reject(Tools.translate("E-mail is too long"));
        if (name && name.length > board.maxNameLength)
            return Promise.reject(Tools.translate("Name is too long"));
        if (subject && subject.length > board.maxSubjectLength)
            return Promise.reject(Tools.translate("Subject is too long"));
        return markup(board.name, rawText, {
            markupModes: markupModes,
            referencedPosts: referencedPosts,
            accessLevel: req.level(board.name)
        });
    }).then(function(text) {
        c.text = text;
        c.plainText = (c.text ? Tools.plainText(c.text, { brToNewline: true }) : null);
        return board.postExtraData(req, fields, null, c.post)
    }).then(function(extraData) {
        c.extraData = extraData;
        c.post.email = email || null;
        c.post.markup = markupModes;
        c.post.name = name || null;
        c.post.plainText = c.plainText;
        c.post.rawText = rawText;
        c.post.subject = subject || null;
        c.post.text = c.text || null;
        c.post.updatedAt = date.toISOString();
        delete c.post.bannedFor;
        return db.hset("posts", board.name + ":" + c.post.number, JSON.stringify(c.post));
    }).then(function() {
        return board.removeExtraData(c.post.number);
    }).then(function() {
        return board.storeExtraData(c.post.number, c.extraData);
    }).then(function() {
        return removeReferencedPosts(c.post);
    }).then(function() {
        return addReferencedPosts(c.post, referencedPosts);
    }).then(function() {
        return es.index({
            index: "ololord.js",
            type: "posts",
            id: board.name + ":" + c.post.number,
            body: {
                plainText: c.plainText,
                subject: subject,
                boardName: board.name,
                threadNumber: c.post.threadNumber
            }
        });
    }).then(function() {
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return Promise.resolve();
    });
};

module.exports.setThreadFixed = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var fixed = ("true" == fields.fixed);
        if (thread.fixed == fixed)
            return Promise.resolve();
        thread.fixed = fixed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return Global.generate(board.name, threadNumber, threadNumber, "edit");
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadClosed = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var closed = ("true" == fields.closed);
        if (thread.closed == closed)
            return Promise.resolve();
        thread.closed = closed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return Global.generate(board.name, threadNumber, threadNumber, "edit");
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadUnbumpable = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var unbumpable = ("true" == fields.unbumpable);
        if (!!thread.unbumpable == unbumpable)
            return Promise.resolve();
        thread.unbumpable = unbumpable;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return Global.generate(board.name, threadNumber, threadNumber, "edit");
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.deletePost = function(req, res, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    var c = {};
    return controller.checkBan(req, res, board.name, true).then(function() {
        return getPost(board.name, postNumber);
    }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("Invalid post"));
        c.post = post;
        c.isThread = post.threadNumber == post.number;
        c.archived = ("true" == fields.archived);
        if (c.archived && !c.isThread)
            return Promise.reject(Tools.translate("Deleting posts from archived threads is not allowed"));
        return checkPermissions(req, board, post, "deletePost", Tools.sha1(fields.password));
    }).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("Not enough rights"));
        return (c.isThread) ? removeThread(board.name, postNumber, { archived: c.archived })
            : removePost(board.name, postNumber);
    }).then(function() {
        var p;
        if (c.isThread && c.archived) {
            var path = `${__dirname}/../public/${board.name}/arch/${postNumber}.`;
            p = FS.remove(path + "json").then(function() {
                return FS.remove(path + "html");
            }).then(function() {
                return Global.generateArchive(board.name);
            });
        } else if (!c.archived) {
            p = c.isThread ? Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "delete")
                : Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        }
        return p;
    }).then(function() {
        return {
            boardName: board.name,
            threadNumber: ((c.post.threadNumber != c.post.number) ? c.post.threadNumber : 0)
        };
    });
};

module.exports.moveThread = function(req, fields) {
    var sourceBoard = Board.board(fields.boardName);
    var targetBoard = Board.board(fields.targetBoardName);
    if (!sourceBoard || !targetBoard)
        return Promise.reject(Tools.translate("Invalid board"));
    if (sourceBoard.name == targetBoard.name)
        return Promise.reject(Tools.translate("Source and target boards are the same"));
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    if (!req.isModer(sourceBoard.name) || !req.isModer(targetBoard.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var password = Tools.sha1(fields.password);
    var c = {};
    var sourcePath = __dirname + "/../public/" + sourceBoard.name + "/src"
    var sourceThumbPath = __dirname + "/../public/" + sourceBoard.name + "/thumb";
    var targetPath = __dirname + "/../public/" + targetBoard.name + "/src"
    var targetThumbPath = __dirname + "/../public/" + targetBoard.name + "/thumb";
    return getThreads(sourceBoard.name, {
        withPostNumbers: true,
        filterFunction: function(thread) {
            return thread && threadNumber == thread.number;
        }
    }).then(function(thread) {
        if (!thread || thread.length != 1)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = thread[0];
        if ((!password || password != c.thread.user.password)
            && (!req.hashpass || req.hashpass != c.thread.user.hashpass)
            && !req.isSuperuser()
            && (compareRegisteredUserLevels(req.level(sourceBoard.name), c.thread.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        delete c.thread.updatedAt;
        c.postNumbers = c.thread.postNumbers;
        delete c.thread.postNumbers;
        var promises = c.postNumbers.map(function(postNumber) {
            return getPost(sourceBoard.name, postNumber, {
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            });
        });
        return Promise.all(promises);
    }).then(function(posts) {
        c.posts = posts;
        return nextPostNumber(targetBoard.name, c.posts.length);
    }).then(function(lastPostNumber) {
        lastPostNumber = lastPostNumber - c.posts.length + 1;
        c.thread.number = lastPostNumber;
        c.postNumberMap = {};
        c.posts.forEach(function(post, i) {
            c.postNumberMap[post.number] = lastPostNumber;
            ++lastPostNumber;
        });
        return mkpath(targetPath);
    }).then(function() {
        return mkpath(targetThumbPath);
    }).then(function() {
        return Tools.series(c.posts, function(post) {
            var oldPostNumber = post.number;
            post.number = c.postNumberMap[post.number];
            post.threadNumber = c.thread.number;
            post.boardName = targetBoard.name;
            var referencedPosts = post.referencedPosts;
            delete post.referencedPosts;
            var extraData = post.extraData;
            delete post.extraData;
            var referringPosts = post.referringPosts;
            delete post.referringPosts;
            var fileInfos = post.fileInfos;
            fileInfos.forEach(function(fileInfo) {
                fileInfo.boardName = targetBoard.name;
                fileInfo.postNumber = post.number;
            });
            delete post.fileInfos;
            c.toRerender = {};
            c.toUpdate = {};
            if (post.rawText) {
                Tools.forIn(c.postNumberMap, function(newPostNumber, previousPostNumber) {
                    var rx = new RegExp(`>>/${sourceBoard.name}/${previousPostNumber}`, "g");
                    post.rawText = post.rawText.replace(rx, `>>/${targetBoard.name}/${newPostNumber}`);
                    rx = new RegExp(`>>${previousPostNumber}`, "g");
                    post.rawText = post.rawText.replace(rx, `>>${newPostNumber}`);
                });
                referencedPosts.forEach(function(ref) {
                    if (ref.boardName != sourceBoard.name)
                        return;
                    var rx = new RegExp(`>>${ref.postNumber}`, "g");
                    post.rawText = post.rawText.replace(rx, `>>/${sourceBoard.name}/${ref.postNumber}`);
                });
            }
            return db.hset("posts", targetBoard.name + ":" + post.number, JSON.stringify(post)).then(function() {
                return targetBoard.storeExtraData(post.number, extraData);
            }).then(function() {
                return Tools.series(referencedPosts, function(ref) {
                    var nref;
                    if (ref.boardName == sourceBoard.name && ref.threadNumber == threadNumber) {
                        nref = {
                            boardName: targetBoard.name,
                            threadNumber: post.threadNumber,
                            postNumber: c.postNumberMap[ref.postNumber]
                        };
                    } else {
                        c.toUpdate[ref.boardName + ":" + ref.threadNumber] = {
                            boardName: ref.boardName,
                            threadNumber: ref.threadNumber
                        };
                        nref = ref;
                    }
                    return db.hdel(`referencedPosts:${sourceBoard.name}:${oldPostNumber}`,
                            `${ref.boardName}:${ref.postNumber}`).then(function() {
                        return db.hset(`referencedPosts:${targetBoard.name}:${post.number}`,
                                `${nref.boardName}:${nref.postNumber}`, JSON.stringify(nref));
                    });
                });
            }).then(function() {
                return Tools.series(referringPosts, function(ref) {
                    var nref;
                    if (ref.boardName == sourceBoard.name && ref.threadNumber == threadNumber) {
                        nref = {
                            boardName: targetBoard.name,
                            threadNumber: post.threadNumber,
                            postNumber: c.postNumberMap[ref.postNumber]
                        };
                    } else {
                        c.toRerender[ref.boardName + ":" + ref.postNumber] = {
                            boardName: ref.boardName,
                            postNumber: ref.postNumber
                        };
                        c.toUpdate[ref.boardName + ":" + ref.threadNumber] = {
                            boardName: ref.boardName,
                            threadNumber: ref.threadNumber
                        };
                        nref = ref;
                    }
                    return db.hdel(`referringPosts:${sourceBoard.name}:${oldPostNumber}`,
                            `${ref.boardName}:${ref.postNumber}`).then(function() {
                        return db.hset(`referringPosts:${targetBoard.name}:${post.number}`,
                                `${nref.boardName}:${nref.postNumber}`, JSON.stringify(nref));
                    });
                });
            }).then(function() {
                return db.sadd("userPostNumbers:" + post.user.ip + ":" + targetBoard.name, post.number);
            }).then(function() {
                return Tools.series(fileInfos, function(fileInfo) {
                    return db.hset("fileInfos", fileInfo.name, JSON.stringify(fileInfo)).then(function() {
                        return db.sadd("postFileInfoNames:" + targetBoard.name + ":" + post.number, fileInfo.name);
                    }).then(function() {
                        return FS.move(sourcePath + "/" + fileInfo.name, targetPath + "/" + fileInfo.name);
                    }).then(function() {
                        return FS.move(sourceThumbPath + "/" + fileInfo.thumb.name,
                            targetThumbPath + "/" + fileInfo.thumb.name);
                    });
                });
            }).then(function() {
                return addFileHashes(fileInfos);
            }).then(function() {
                return es.index({
                    index: "ololord.js",
                    type: "posts",
                    id: targetBoard.name + ":" + post.number,
                    body: {
                        plainText: post.plainText,
                        subject: post.subject,
                        boardName: targetBoard.name,
                        threadNumber: post.threadNumber
                    }
                })
            });
        });
    }).then(function() {
        return db.hset("threads:" + targetBoard.name, c.thread.number, JSON.stringify(c.thread));
    }).then(function() {
        return db.hset("threadUpdateTimes:" + targetBoard.name, c.thread.number, Tools.now().toISOString());
    }).then(function() {
        return db.sadd("threadPostNumbers:" + targetBoard.name + ":" + c.thread.number,
            Tools.toArray(c.postNumberMap));
    }).then(function() {
        return Tools.series(c.posts, function(post) {
            return markup(post.boardName, post.rawText, {
                markupModes: post.markup,
                referencedPosts: {},
                accessLevel: post.user.level
            }).then(function(text) {
                post.text = text;
                return db.hset("posts", post.boardName + ":" + post.postNumber, JSON.stringify(post));
            });
        });
    }).then(function() {
        return Tools.series(c.toRerender, function(o) {
            return getPost(o.boardName, o.postNumber).then(function(p) {
                if (!p.rawText)
                    return Promise.resolve();
                Tools.forIn(c.postNumberMap, function(newPostNumber, previousPostNumber) {
                    var rx = new RegExp(`>>/${sourceBoard.name}/${previousPostNumber}`, "g");
                    p.rawText = p.rawText.replace(rx, `>>/${targetBoard.name}/${newPostNumber}`);
                    if (o.boardName == sourceBoard.name) {
                        rx = new RegExp(`>>${previousPostNumber}`, "g");
                        p.rawText = p.rawText.replace(rx, `>>/${targetBoard.name}/${newPostNumber}`);
                    }
                });
                return markup(p.boardName, p.rawText, {
                    markupModes: p.markup,
                    referencedPosts: {},
                    accessLevel: p.user.level
                }).then(function(text) {
                    p.text = text;
                    return db.hset("posts", p.boardName + ":" + p.number, JSON.stringify(p));
                });
            });
        });
    }).then(function() {
        return Tools.series(c.toUpdate, function(o) {
            return Global.generate(o.boardName, o.threadNumber, o.threadNumber, "create");
        });
    }).then(function() {
        return removeThread(sourceBoard.name, threadNumber, {
            leaveFileInfos: true,
            leaveReferences: true
        });
    }).then(function() {
        Global.generate(sourceBoard.name, threadNumber, threadNumber, "delete")
        return Global.generate(targetBoard.name, c.thread.number, c.thread.number, "create");
    }).then(function() {
        return {
            boardName: targetBoard.name,
            threadNumber: c.thread.number
        };
    });
};

module.exports.deleteFile = function(req, res, fields) {
    var fileName = fields.fileName;
    if (!fileName)
        return Promise.reject(Tools.translate("Invalid file name"));
    var c = {};
    return db.hget("fileInfos", fileName).then(function(fileInfo) {
        if (!fileInfo)
            return Promise.reject(Tools.translate("No such file"));
        c.fileInfo = JSON.parse(fileInfo);
        return getPost(c.fileInfo.boardName, c.fileInfo.postNumber);
    }).then(function(post) {
        c.post = post;
        var board = Board.board(c.fileInfo.boardName);
        if (!board)
            return Promise.reject(Tools.translate("Invalid board"));
        return checkPermissions(req, board, post, "deleteFile", Tools.sha1(fields.password));
    }).then(function(result) {
        if (!result)
            return Promise.reject(Tools.translate("Not enough rights"));
        return controller.checkBan(req, res, c.post.boardName, true);
    }).then(function() {
        return postFileInfoNames(c.post.boardName, c.post.number);
    }).then(function(numbers) {
        if (!c.post.rawText && numbers.length < 2)
            return Promise.reject(Tools.translate("Both file and comment are missing"));
        return db.srem("postFileInfoNames:" + c.post.boardName + ":" + c.post.number, fileName);
    }).then(function() {
        return db.hdel("fileInfos", fileName);
    }).then(function() {
        return removeFileHashes(c.fileInfo);
    }).then(function() {
        paths = [];
        paths.push(__dirname + "/../public/" + c.post.boardName + "/src/" + c.fileInfo.name);
        paths.push(__dirname + "/../public/" + c.post.boardName + "/thumb/" + c.fileInfo.thumb.name);
        paths.forEach(function(path) {
            FS.remove(path).catch(function(err) {
                Global.error(err);
            });
        });
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return {
            boardName: c.post.boardName,
            postNumber: c.post.number,
            threadNumber: c.post.threadNumber
        };
    });
};

module.exports.editFileRating = function(req, res, fields) {
    var c = {};
    var password = Tools.sha1(fields.password);
    return getFileInfo({ fileName: fields.fileName }).then(function(fileInfo) {
        c.fileInfo = fileInfo;
        return controller.checkBan(req, res, c.fileInfo.boardName, true);
    }).then(function() {
        return getPost(c.fileInfo.boardName, c.fileInfo.postNumber);
    }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("Invalid post"));
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && !req.isSuperuser()
            && (compareRegisteredUserLevels(req.level(c.fileInfo.boardName), post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        c.fileInfo.rating = "SFW";
        if (["R-15", "R-18", "R-18G"].indexOf(fields.rating) >= 0)
            c.fileInfo.rating = fields.rating;
        return db.hset("fileInfos", c.fileInfo.name, JSON.stringify(c.fileInfo));
    }).then(function() {
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return {
            boardName: c.post.boardName,
            threadNumber: c.post.threadNumber,
            postNumber: c.post.number
        };
    });
};

module.exports.editAudioTags = function(req, res, fields) {
    var c = {};
    var password = Tools.sha1(fields.password);
    return getFileInfo({ fileName: fields.fileName }).then(function(fileInfo) {
        if (!Tools.isAudioType(fileInfo.mimeType))
            return Promise.reject(Tools.translate("Not an audio file"));
        c.fileInfo = fileInfo;
        return controller.checkBan(req, res, c.fileInfo.boardName, true);
    }).then(function() {
        return getPost(c.fileInfo.boardName, c.fileInfo.postNumber);
    }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("Invalid post"));
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && !req.isSuperuser()
            && (compareRegisteredUserLevels(req.level(c.fileInfo.boardName), post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        ["album", "artist", "title", "year"].forEach(function(tag) {
            if (fields[tag]) {
                c.fileInfo.extraData[tag] = fields[tag];
            } else if (c.fileInfo.extraData[tag]) {
                delete c.fileInfo.extraData[tag];
            }
        });
        return db.hset("fileInfos", c.fileInfo.name, JSON.stringify(c.fileInfo));
    }).then(function() {
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return {
            boardName: c.post.boardName,
            threadNumber: c.post.threadNumber,
            postNumber: c.post.number
        };
    });
};

var userBans = function(ip, boardNames) {
    if (!ip) {
        return db.smembers("bannedUserIps").then(function(ips) {
            return Tools.series(ips, function(ip) {
                return userBans(ip, boardNames);
            }, {});
        });
    }
    ip = Tools.correctAddress(ip);
    if (!boardNames)
        boardNames = Board.boardNames();
    else if (!Util.isArray(boardNames))
        boardNames = [boardNames];
    return Tools.series(boardNames, function(boardName) {
        return db.get(`userBans:${ip}:${boardName}`).then(function(ban) {
            if (!ban)
                return Promise.resolve();
            return Promise.resolve(JSON.parse(ban));
        });
    }, {}).then(function(bans) {
        return Tools.filterIn(bans, function(ban) {
            return ban;
        });
    });
};

module.exports.userBans = userBans;

var updatePostBanInfo = function(boardName, postNumber) {
    if (!Board.board(boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    postNumber = +postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.resolve();
    return db.hget("posts", boardName + ":" + postNumber).then(function(post) {
        if (!post)
            return Promise.resolve();
        if (Global.generate)
            return Global.generate(boardName, JSON.parse(post).threadNumber, postNumber, "edit");
        else
            return BoardModel.scheduleGenerate(boardName, JSON.parse(post).threadNumber, postNumber, "edit");
    });
};

var updateBan = function(ip, boardName, postNumber) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return Promise.reject(Tools.translate("Invalid IP address"));
    if (!Board.board(boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    return db.keys(`userBans:${ip}:*`).then(function(keys) {
        if (keys && keys.length > 0)
            return Promise.resolve();
        return db.srem("bannedUserIps", ip);
    }).then(function() {
        return updatePostBanInfo(boardName, postNumber);
    });
};

module.exports.banUser = function(req, ip, bans) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return Promise.reject(Tools.translate("Invalid IP address"));
    if (ip == req.ip)
        return Promise.reject(Tools.translate("Not enough rights"));
    var err;
    var banLevels = Tools.toArray(BanLevels).reduce(function(acc, level) {
        acc[level] = {};
        return acc;
    }, {});
    bans.some(function(ban) {
        if (!Board.board(ban.boardName)) {
            err = Tools.translate("Invalid board");
            return true;
        }
        if (!banLevels.hasOwnProperty(ban.level)) {
            err = Tools.translate("Invalid ban level");
            return true;
        }
    });
    if (err)
        return Promise.reject(err);
    if (!req.isModer())
        return Promise.reject(Tools.translate("Not enough rights"));
    bans = bans.reduce(function(acc, ban) {
        acc[ban.boardName] = ban;
        return acc;
    }, {});
    var modified = [];
    var newBans;
    var c = {};
    return userBans(ip).then(function(oldBans) {
        c.oldBans = oldBans;
        var date = Tools.now();
        newBans = Board.boardNames().reduce(function(acc, boardName) {
            if (req.isModer(boardName)) {
                if (bans.hasOwnProperty(boardName)) {
                    var ban = bans[boardName];
                    ban.createdAt = date;
                    acc[boardName] = ban;
                    modified.push(boardName);
                } else if (oldBans.hasOwnProperty(boardName)) {
                    modified.push(boardName);
                }
            } else {
                if (oldBans.hasOwnProperty(boardName))
                    acc[boardName] = oldBans[boardName];
            }
            return acc;
        }, {});
        return registeredUserLevelsByIp(ip);
    }).then(function(levels) {
        modified.some(function(boardName) {
            var level = req.level(boardName);
            if (!req.isSuperuser(boardName) && compareRegisteredUserLevels(level, levels[boardName]) <= 0) {
                err = Promise.reject(Tools.translate("Not enough rights"));
                return true;
            }
        });
        if (err)
            return Promise.reject(err);
        return Tools.series(Board.boardNames(), function(boardName) {
            var key = `userBans:${ip}:${boardName}`;
            var ban = newBans[boardName];
            if (!ban) {
                ban = c.oldBans[boardName];
                if (!ban)
                    return Promise.resolve();
                return db.del(key).then(function() {
                    if (!ban.postNumber)
                        return Promise.resolve();
                    return db.hdel("userBanPostNumbers", key, ban.postNumber);
                }).then(function() {
                    return updatePostBanInfo(boardName, ban.postNumber);
                });
            }
            return db.set(key, JSON.stringify(ban)).then(function() {
                if (!ban.expiresAt)
                    return Promise.resolve();
                return db.expire(key, Math.ceil((+ban.expiresAt - +Tools.now()) / 1000));
            }).then(function() {
                if (!ban.postNumber)
                    return Promise.resolve();
                return db.hset("userBanPostNumbers", key, ban.postNumber);
            }).then(function() {
                if (!ban.postNumber)
                    return Promise.resolve();
                return updatePostBanInfo(boardName, ban.postNumber);
            });
        });
    }).then(function() {
        return db[Tools.hasOwnProperties(newBans) ? "sadd" : "srem"]("bannedUserIps", ip);
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.delall = function(req, ip, boardNames) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return Promise.reject(Tools.translate("Invalid IP address"));
    if (ip == req.ip)
        return Promise.reject(Tools.translate("Not enough rights"));
    if (!boardNames || boardNames.length < 1)
        return Promise.reject(Tools.translate("No board specified"));
    var err = boardNames.some(function(boardName) {
        if (!Board.board(boardName))
            return true;
    }, false);
    if (err)
        return Promise.reject(Tools.translate("Invalid board"));
    err = boardNames.some(function(boardName) {
        if (!req.isModer(boardName))
            return true;
    });
    if (err)
        return Promise.reject(Tools.translate("Not enough rights"));
    var deletedThreads = {};
    var updatedThreads = {};
    var deletedPosts = {};
    return registeredUserLevelsByIp(ip).then(function(levels) {
        err = boardNames.some(function(boardName) {
            var level = req.level(boardName);
            if (!req.isSuperuser(boardName) && compareRegisteredUserLevels(level, levels[boardName]) <= 0)
                return true;
        });
        if (err)
            return Promise.reject(Tools.translate("Not enough rights"));
        return Tools.series(boardNames, function(boardName) {
            return db.smembers(`userPostNumbers:${ip}:${boardName}`).then(function(postNumbers) {
                return Tools.series(postNumbers, function(postNumber) {
                    return getPost(boardName, postNumber);
                }, true).then(function(posts) {
                    posts.forEach(function(post) {
                        if (post.threadNumber == post.number) {
                            deletedThreads[post.boardName + ":" + post.threadNumber] = {
                                boardName: post.boardName,
                                number: post.threadNumber
                            };
                        }
                    });
                    posts.forEach(function(post) {
                        var key = `${post.boardName}:${post.threadNumber}`;
                        if (deletedThreads.hasOwnProperty(key))
                            return;
                        updatedThreads[key] = {
                            boardName: post.boardName,
                            number: post.threadNumber
                        };
                        deletedPosts[`${post.boardName}:${post.number}`] = {
                            boardName: post.boardName,
                            number: post.number
                        };
                    });
                    return Promise.resolve();
                });
            });
        });
    }).then(function() {
        return Tools.series(deletedPosts, function(post) {
            return removePost(post.boardName, post.number);
        });
    }).then(function() {
        return Tools.series(deletedThreads, function(thread) {
            return removeThread(thread.boardName, thread.number);
        });
    }).then(function() {
        return Tools.series(updatedThreads, function(thread) {
            return Global.generate(thread.boardName, thread.number, thread.postNumber, "edit");
        });
    }).then(function() {
        return Tools.series(deletedThreads, function(thread) {
            return Global.generate(thread.boardName, thread.number, thread.number, "delete");
        });
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.initialize = function() {
    //NOTE: Enabling "key expired" notifications
    var CHANNEL = `__keyevent@${config("system.redis.db", 0)}__:expired`;
    var dbs = createRedisClient();
    var initialized = false;
    var query = [];
    var updateBanOnMessage = function(message) {
        var ip = message.split(":").slice(1, -1).join(":");
        var boardName = message.split(":").pop();
        var postNumber = 0;
        db.hget("userBanPostNumbers", message).then(function(pn) {
            if (!pn)
                return Promise.resolve();
            postNumber = +pn;
            return db.hdel("userBanPostNumbers", message);
        }).then(function() {
            updateBan(ip, boardName, postNumber).catch(function(err) {
                Global.error(err.stack || err);
            });
        });
    };
    dbs.on("message", function(channel, message) {
        if (CHANNEL != channel)
            return;
        if (!initialized) {
            query.push(message);
            return;
        }
        updateBanOnMessage(message);
    });
    return db.config("SET", "notify-keyspace-events", "Ex").then(function() {
        dbs.subscribe(CHANNEL).catch(function(err) {
            Global.error(err);
        });
        return Promise.resolve(function() {
            initialized = true;
            query.forEach(updateBanOnMessage);
        });
    });
};
