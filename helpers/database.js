var Crypto = require("crypto");
var FS = require("q-io/fs");
var FSSync = require("fs");
var moment = require("moment");
var Path = require("path");
var promisify = require("promisify-node");
var Redis = require("then-redis");
var SQLite3 = require("sqlite3");
var Util = require("util");
XML2JS = require("xml2js");

var mkpath = promisify("mkpath");

var Board = require("../boards/board");
var Cache = require("./cache");
var config = require("./config");
var markup = require("./markup");
var Tools = require("./tools");

var Ratings = {};
var RegisteredUserLevels = {};

var db = Redis.createClient();
var dbGeo = new SQLite3.Database(__dirname + "/../geolocation/ip2location.sqlite");

db.tmp_hmget = db.hmget;
db.hmget = function(key, hashes) {
    return db.tmp_hmget.apply(db, [key].concat(hashes));
};

//var Lock = require("./then-redis-lock")(db);

//module.exports.Lock = Lock;

var rss = {};

Object.defineProperty(module.exports, "rss", {
    get: function() {
        return rss;
    }
});

Ratings["SafeForWork"] = "SFW";
Ratings["Rating15"] = "R-15";
Ratings["Rating18"] = "R-18";
Ratings["Rating18G"] = "R-18G";

RegisteredUserLevels["Admin"] = "ADMIN";
RegisteredUserLevels["Moder"] = "MODER";
RegisteredUserLevels["User"] = "USER";

Object.defineProperty(module.exports, "Ratings", { value: Ratings });
Object.defineProperty(module.exports, "RegisteredUserLevels", { value: RegisteredUserLevels });

var getThreads = function(boardName, options) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
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
            return db.smembers("threadPostNumbers:" + boardName + ":" + thread.number);
        });
        return Promise.all(promises);
    }).then(function(results) {
        results.forEach(function(result, i) {
            if (!result)
                return;
            c.threads[i].postNumbers = result;
        });
        return c.threads;
    });
};

module.exports.getThreads = getThreads;

var threadPosts = function(boardName, threadNumber, options) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread number");
    var opts = (typeof options == "object");
    var filter = opts && (typeof options.filterFunction == "function");
    var limit = (opts && !isNaN(options.limit) && options.limit > 0) ? options.limit : 0; //NOTE: 0 means no limit
    var reverse = opts && options.reverse;
    var c = { posts: [] };
    var p = db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function(result) {
        if (!result)
            result = [];
        var i = reverse ? (result.length - 1) : 0;
        var bound;
        var bound = reverse ? (limit ? (result.length - limit - 1) : -1) : (limit ? limit : result.length);
        if (bound < 0)
            bound = -1;
        if (bound > result.length)
            bound = result.length;
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
            return db.hmget("posts", getKeys()).then(function(posts) {
                posts = posts.map(function(post) {
                    return JSON.parse(post);
                });
                c.posts = c.posts.concat(filter? posts.filter(options.filterFunction) : posts);
                if (!pred() || (limit && c.posts.length >= limit)) {
                    if (limit && c.posts.length > limit)
                        return c.posts.slice(0, limit);
                    else
                        return c.posts;
                }
                return getNext();
            });
        };
        return getNext();
    });
    if (!opts || (!options.withFileInfos && !options.withReferences))
        return p;
    return p.then(function() {
        var promises = [];
        if (options.withFileInfos) {
            promises = c.posts.map(function(post) {
                return db.smembers("fileInfos:" + boardName + ":" + post.number).then(function(fileInfos) {
                    post.fileInfos = fileInfos ? fileInfos.map(JSON.parse) : [];
                    return Promise.resolve();
                });
            });
        }
        if (options.withReferences) {
            promises = promises.concat(c.posts.map(function(post) {
                return db.smembers("referencedPosts:" + boardName + ":" + post.number).then(function(referencedPosts) {
                    post.referencedPosts = referencedPosts ? referencedPosts.map(JSON.parse) : [];
                    return db.smembers("referringPosts:" + boardName + ":" + post.number);
                }).then(function(referringPosts) {
                    post.referringPosts = referringPosts ? referringPosts.map(JSON.parse) : [];
                    return Promise.resolve();
                });
            }));
        }
        return Promise.all(promises);
    }).then(function() {
        return c.posts;
    });
};

module.exports.threadPosts = threadPosts;

module.exports.getPost = function(boardName, postNumber, options) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject("Invalid post number");
    var opts = (typeof options == "object");
    var c = {};
    var key = boardName + ":" + postNumber;
    var p = db.hget("posts", key).then(function(post) {
        c.post = post ? JSON.parse(post) : null;
        return c.post;
    });
    if (!opts || (!options.withFileInfos && !options.withReferences))
        return p;
    return p.then(function() {
        var promises = [];
        if (options.withFileInfos) {
            promises.push(db.smembers("fileInfos:" + key).then(function(fileInfos) {
                c.post.fileInfos = fileInfos ? fileInfos.map(JSON.parse) : [];
                return Promise.resolve();
            }));
        }
        if (options.withReferences) {
            promises.push(db.smembers("referencedPosts:" + key).then(function(referencedPosts) {
                c.post.referencedPosts = referencedPosts ? referencedPosts.map(JSON.parse) : [];
                return db.smembers("referringPosts:" + key);
            }).then(function(referringPosts) {
                c.post.referringPosts = referringPosts ? referringPosts.map(JSON.parse) : [];
                return Promise.resolve();
            }));
        }
        return Promise.all(promises);
    }).then(function() {
        return c.post;
    });
};

module.exports.threadPostCount = function(boardName, threadNumber) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid threadNumber");
    return db.scard("threadPostNumbers:" + boardName + ":" + threadNumber);
};

var registeredUser = function(reqOrHashpass) {
    if (reqOrHashpass && typeof reqOrHashpass == "object" && reqOrHashpass.cookies)
        reqOrHashpass = Tools.hashpass(reqOrHashpass);
    if (!reqOrHashpass)
        return Promise.resolve(null);
    return db.hget("registeredUsers", reqOrHashpass).then(function(user) {
        return Promise.resolve(user ? JSON.parse(user) : null);
    });
};

module.exports.registeredUser = registeredUser;

module.exports.registerUser = function(hashpass, level, boardNames) {
    return db.hset("registeredUsers", hashpass, JSON.stringify({
        hashpass: hashpass,
        level: level,
        boardNames: boardNames,
        createdAt: Tools.now().toISOString()
    }));
};

var registeredUserLevel = function(reqOrHashpass) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        if (!user)
            return null;
        return user.level;
    });
};

module.exports.registeredUserLevel = registeredUserLevel;

module.exports.registeredUserBoards = function(reqOrHashpass) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        if (!user)
            return null;
        return user.boardNames;
    });
};

module.exports.moderOnBoard = function(reqOrHashpass, boardName1, boardName2) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        if (!user)
            return false;
        if (user.level < RegisteredUserLevels.Moder)
            return false;
        if (user.level >= RegisteredUserLevels.Admin)
            return true;
        var boardNames = user.boardNames;
        if (Tools.contains(boardNames, "*"))
            return true;
        if (Tools.contains(boardNames, boardName1))
            return true;
        if (boardName2 && Tools.contains(boardNames, boardName2))
            return true;
        return false;
    });
};

var lastPostNumber = function(boardName) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    return db.hget("postCounters", boardName).then(function(number) {
        if (!number)
            return 0;
        return number;
    });
};

module.exports.lastPostNumber = lastPostNumber;

var nextPostNumber = function(boardName) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    return db.hincrby("postCounters", boardName, 1).then(function(number) {
        if (!number)
            return 0;
        return number;
    });
};

module.exports.nextPostNumber = nextPostNumber;

module.exports.getFileInfosByHashes = function(hashes) {
    if (!hashes)
        return Promise.resolve([]);
    if (!Util.isArray(hashes))
        hashes = [hashes];
    if (hashes.length < 1)
        return Promise.resolve([]);
    return db.hmget("fileHashes", hashes).then(function(fileInfios) {
        return fileInfos.map(function(fileInfo, i) {
            fileInfo = JSON.parse(fileInfo);
            fileInfo.hash = hashes[i];
            return fileInfo;
        });
    });
};

var processFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.board);
    if (!board)
        return Promise.reject("Invalid board");
    var promises = files.map(function(file) {
        var fn = board.generateFileName(file);
        var targetFilePath = __dirname + "/../public/" + board.name + "/src/" + fn.name;
        var targetThumbPath = __dirname + "/../public/" + board.name + "/thumb/" + fn.thumbName;
        transaction.filePaths.push(targetFilePath);
        transaction.filePaths.push(targetThumbPath);
        if (file.copy) {
            var sourceFilePath = __dirname + "/../public/" + file.boardName + "/src/" + file.name;
            var sourceThumbPath = __dirname + "/../public/" + file.boardName + "/thumb/" + file.thumbName;
            return FS.copy(sourceFilePath, targetFilePath).then(function() {
                return FS.copy(sourceThumbPath, targetThumbPath)
            }).then(function() {
                return file;
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
                return {
                    dimensions: file.dimensions,
                    extraData: file.extraData,
                    hash: file.hash,
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
    return mkpath(__dirname + "/../public/" + board.name + "/src").then(function() {
        return mkpath(__dirname + "/../public/" + board.name + "/thumb");
    }).then(function() {
        return Promise.all(promises);
    });
};

var createPost = function(req, fields, files, transaction, threadNumber, date) {
    var board = Board.board(fields.board);
    if (!board)
        return Promise.reject("Invalid board");
    date = date || Tools.now();
    var c = {};
    if (threadNumber)
        c.postNumber = threadNumber;
    else
        threadNumber = +fields.thread;
    var rawText = (fields.text || null);
    var markupModes = [];
    var referencedPosts = {};
    var password = null;
    var hashpass = (req.hashpass || null);
    var ip = (req.trueIp || null);
    if (fields.password) {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(fields.password);
        password = sha1.digest("hex");
    }
    Tools.forIn(markup.MarkupModes, function(val) {
        if (fields.markupMode && fields.markupMode.indexOf(val) >= 0)
            markupModes.push(val);
    });
    return registeredUser(hashpass).then(function(user) {
        c.user = user;
        c.level = c.user ? c.user.level : null;
        c.isRaw = fields.raw && compareRegisteredUserLevels(c.level, RegisteredUserLevels.Admin) >= 0;
        if (c.isRaw)
            return rawText;
        return getThreads(board.name, {
            limit: 1,
            filterFunction: function(thread) {
                if (thread.number != threadNumber)
                    return false;
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return compareRegisteredUserLevels(thread.user.level, c.level) <= 0;
            }
        }).then(function(threads) {
            if (!threads || threads.length != 1)
                return Promise.reject("No such thread or no access to thread");
            c.thread = threads[0];
            return markup(board.name, rawText, {
                markupModes: markupModes,
                referencedPosts: referencedPosts
            });
        });
    }).then(function(text) {
        c.text = text;
        return board.postExtraData(req, fields, files)
    }).then(function(extraData) {
        c.extraData = extraData;
        return getGeolocationInfo(ip);
    }).then(function(geo) {
        c.geo = geo;
        return db.scard("threadPostNumbers:" + board.name + ":" + threadNumber);
    }).then(function(postCount) {
        c.postCount = postCount;
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
            email: (fields.email || null),
            extraData: c.extraData,
            geolocation: c.geo,
            markup: markupModes,
            name: (fields.name || null),
            number: c.postNumber,
            options: {
                draft: (hashpass && board.draftsEnabled && fields.draft),
                rawHtml: c.isRaw,
                showTripcode: !!fields.showTripcode,
                signAsOp: !!fields.signAsOp
            },
            rawText: rawText,
            sequenceNumber: (c.postCount + 1),
            subject: (fields.subject || null),
            text: (c.text || null),
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
        return db.hset("posts", board.name + ":" + postNumber, JSON.stringify(c.post));
    }).then(function() {
        return db.sadd("threadPostNumbers:" + board.name + ":" + threadNumber, c.postNumber);
    }).then(function() {
        var refs = [];
        c.refs = [];
        Tools.forIn(referencedPosts, function(ref) {
            refs.push(JSON.stringify(ref));
            c.refs.push(ref);
        });
        if (refs.length < 1)
            return Promise.resolve();
        return db.sadd("referencedPosts:" + board.name + ":" + c.postNumber, refs);
    }).then(function() {
        var promises = [];
        Tools.forIn(referencedPosts, function(ref) {
            promises.push(db.sadd("referringPosts:" + ref.boardName + ":" + ref.postNumber, JSON.stringify({
                boardName: board.name,
                threadNumber: threadNumber,
                postNumber: c.postNumber,
            })));
        });
        return Promise.all(promises);
    }).then(function() {
        if (files.length < 1)
            return Promise.resolve();
        return db.sadd("fileInfos:" + board.name + ":" + c.postNumber, files.map(function(fileInfo) {
            return JSON.stringify(fileInfo);
        }));
    }).then(function() {
        c.hashes = [];
        if (files.length < 1)
            return Promise.resolve();
        c.hashes = files.reduce(function(acc, fileInfo) {
            acc[fileInfo.hash] = JSON.stringify({
                name: fileInfo.name,
                thumb: { name: fileInfo.thumb.name },
                size: fileInfo.size,
                boardName: fileInfo.boardName,
                mimeType: fileInfo.mimeType,
                rating: fileInfo.rating
            });
            return acc;
        }, {});
        return db.hmset("fileHashes", c.hashes);
    }).then(function() {
        var promises = [];
        Tools.forIn(c.hashes, function(_, hash) {
            promises.push(db.sadd("fileHashesExtra:" + hash, JSON.stringify({
                boardName: board.name,
                postNumber: c.postNumber
            })));
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = [];
        Tools.forIn(Tools.indexPost({
            boardName: board.name,
            number: c.postNumber,
            rawText: rawText,
            subject: (fields.subject || null)
        }), function(index, word) {
            promises.push(db.sadd("postSearchIndex:" + word, index[0]));
        });
        return Promise.all(promises);
    }).then(function() {
        return db.hset("threadUpdateTimes:" + board.name, c.thread.number, date.toISOString());
    }).then(function() {
        c.post.referencedPosts = c.refs;
        c.fileInfos = files;
        return c.post;
    });
};

module.exports.createPost = function(req, fields, files, transaction) {
    var threadNumber = +fields.thread;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread number");
    return processFiles(req, fields, files, transaction).then(function(files) {
        return createPost(req, fields, files, transaction);
    });
};

var removePost = function(boardName, postNumber) {
    var c = {};
    return db.hdel("posts", boardName + ":" + postNumber).then(function() {
        return db.del("referencedPosts:" + boardName + ":" + postNumber);
    }).then(function() {
        return db.del("referringPosts:" + boardName + ":" + postNumber);
    }).then(function() {
        return db.smembers("fileInfos:" + boardName + ":" + postNumber);
    }).then(function(fileInfos) {
        c.hashes = [];
        c.paths = [];
        fileInfos.forEach(function(fileInfo) {
            if (!fileInfo)
                return;
            fileInfo = JSON.parse(fileInfo);
            c.hashes.push(fileInfo.hash);
            c.paths.push(__dirname + "/../public/" + boardName + "/src/" + fileInfo.name);
            c.paths.push(__dirname + "/../public/" + boardName + "/thumb/" + fileInfo.thumb.name);
        });
        return db.del("fileInfos:" + boardName + ":" + postNumber);
    }).then(function() {
        var promises = c.hashes.map(function(hash) {
            return db.srem("fileHashesExtra:" + hash, JSON.stringify({
                boardName: boardName,
                postNumber: postNumber
            })).then(function() {
                return db.smembers("fileHashesExtra:" + hash);
            }).then(function(list) {
                if (list && list.length > 0)
                    return Promise.resolve();
                return db.hdel("fileHashes", hash).then(function() {
                    return db.del("fileHashesExtra:" + hash);
                });
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = [];
        Tools.forIn(Tools.indexPost({
            boardName: boardName,
            number: postNumber,
            rawText: rawText,
            subject: (fields.subject || null)
        }), function(index, word) {
            promises.push(db.srem("postSearchIndex:" + word, JSON.parse(index[0])));
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.paths.map(function(path) {
            return FS.remove(path);
        });
        return Promise.all(promises);
    });
};

module.exports.removePost = removePost;

var removeThread = function(boardName, threadNumber, archived) {
    var key = (archived ? "archivedThreads:" : "threads:") + boardName;
    return db.hdel(key, threadNumber).then(function() {
        return db.hdel("threadUpdateTimes:" + boardName, threadNumber);
    }).then(function() {
        return db.hset("threadsPlannedForDeletion:" + boardName + ":" + threadNumber, JSON.stringify({
            boardName: boardName,
            threadNumber: threadNumber
        }));
    }).then(function() {
        setTimeout(function() {
            var c = {};
            db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function(result) {
                c.postNumbers = result;
                return db.del("threadPostNumbers:" + boardName + ":" + threadNumber);
            }).then(function() {
                var promises = c.postNumbers.map(function(postNumber) {
                    return removePost(boardName, postNumber);
                });
                return Promise.all(promises);
            });
        }, 10000);
        return Promise.resolve();
    });
};

module.exports.removeThread = removeThread;

module.exports.createThread = function(req, fields, files, transaction) {
    var board = Board.board(fields.board);
    if (!board)
        return Promise.reject("Invalid board");
    var c = {};
    var date = Tools.now();
    var hashpass = req.hashpass || null;
    var password = null;
    if (fields.password) {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(fields.password);
        password = sha1.digest("hex");
    }
    return registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return getThreads(board.name);
    }).then(function(threads) {
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        if (c.threads.length < board.threadLimit)
            return Promise.resolve();
        return getThreads(board.name, { archived: true }).then(function(threads) {
            c.archivedThreads = threads;
            c.archivedThreads.sort(Board.sortThreadsByDate);
            if (c.archivedThreads.length < board.archiveLimit)
                return Promise.resolve();
            var thread = c.archivedThreads.pop();
            return removeThread(board.name, thread.number, true);
        }).then(function() {
            c.thread = c.threads.pop();
            if (board.archiveLimit <= 0)
                return removeThread(board.name, c.thread.number);
            return db.hdel("threads:" + board.name, thread.number);
        }).then(function() {
            if (board.archiveLimit <= 0)
                return Promise.resolve();
            c.thread.archived = true;
            return db.hset("archivedThreads:" + board.name, c.thread.number, JSON.stringify(c.thread));
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
            number: c.threadNumber,
            options: {
                draft: (hashpass && board.draftsEnabled && fields.draft)
            },
            user: {
                hashpass: hashpass,
                ip: (req.trueIp || null),
                level: c.level,
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
    }).then(function() {
        return c.thread;
    });
};

module.exports.compareRatings = function(r1, r2) {
    if (["SFW", "R-15", "R-18", "R-18G"].indexOf(r2) < 0)
        throw "Invalid rating r2: " + r2;
    switch (r1) {
    case "SFW":
        return (r1 == r2) ? 0 : -1;
    case "R-15":
        if (r1 == r2)
            return 0;
        return ("SFW" == r2) ? 1 : -1;
    case "R-18":
        if (r1 == r2)
            return 0;
        return ("R-18G" == r2) ? -1 : 1;
    case "R-18G":
        return (r1 == r2) ? 0 : 1;
    default:
        throw "Invalid rating r1: " + r1;
    }
};

var compareRegisteredUserLevels = function(l1, l2) {
    if (!l1)
        l1 = null;
    if (!l2)
        l2 = null;
    if (["ADMIN", "MODER", "USER", null].indexOf(l2) < 0)
        throw "Invalid registered user level l2: " + l2;
    switch (l1) {
    case "ADMIN":
        return (l1 == l2) ? 0 : 1;
    case "MODER":
        if (l1 == l2)
            return 0;
        return ("ADMIN" == l2) ? -1 : 1;
    case "USER":
        if (l1 == l2)
            return 0;
        return (null == l2) ? 1 : -1;
    case null:
        return (l1 == l2) ? 0 : -1;
    default:
        throw "Invalid reistered user level l1: " + l1;
    }
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
    var n = Tools.ipNum(ip);
    if (!n)
        return Promise.resolve(info);
    var q = "SELECT ipFrom, countryCode, countryName, cityName FROM ip2location WHERE ipTo >= ? LIMIT 1";
    var stmt = dbGeo.prepare(q);
    stmt.pget = promisify(stmt.get);
    return stmt.pget(n).then(function(result) {
        stmt.finalize();
        if (!result)
            return info;
        var ipFrom = +result.ipFrom;
        if (isNaN(ipFrom) || ipFrom > n)
            return info;
        info.cityName = result.cityName;
        info.countryCode = result.countryCode;
        info.countryName = result.countryName;
        return info;
    });
};

module.exports.initialize = function() {
    return Promise.resolve();
    //return Lock.drop();
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
            FS.remove(path);
        });
    });
    if (this.threadNumber > 0)
        removeThread(this.board.name, this.threadNumber);
    if (this.postNumber > 0)
        removePost(this.board.name, this.postNumber);
};

module.exports.Transaction = Transaction;

module.exports.generateRss = function() {
    var site = {
        protocol: config("site.protocol", "http"),
        domain: config("site.domain", "localhost:8080"),
        pathPrefix: config("site.pathPrefix", ""),
        locale: config("site.locale", "en"),
        dateFormat: config("site.dateFormat", "MM/DD/YYYY hh:mm:ss")
    };
    var rssPostCount = config("server.rss.postCount", 500);
    Board.boardNames().forEach(function(boardName) {
        var board = Board.board(boardName);
        var title = Tools.translate("Feed", "channelTitle") + " " + site.domain + "/" + site.pathPrefix + boardName;
        var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName;
        var description = Tools.translate("Last posts from board", "channelDescription") + " /" + boardName + "/";
        var atomLink = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/rss.xml";
        var posts = [];
        var c = {};
        var f = function() {
            if (posts.length >= rssPostCount || c.threads.length < 1)
                return Promise.resolve();
            return threadPosts(boardName, c.threads.shift().number, {
                filterFunction: function(post) {
                    return !post.draft;
                },
                limit: (rssPostCount - posts.length),
                withFileInfos: true
            }).then(function(result) {
                posts = posts.concat(result);
                return f();
            });
        };
        var doc = {
            $: {
                version: "2.0",
                "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                "xmlns:atom": "http://www.w3.org/2005/Atom"
            },
            channel: {
                title: title,
                link: link,
                description: description,
                language: site.locale,
                pubDate: moment(Tools.now()).utc().locale("en").format("ddd, DD MMM YYYY hh:mm:ss +0000"),
                ttl: ("" + config("server.rss.ttl", 60)),
                "atom:link": {
                    $: {
                        href: atomLink,
                        rel: "self",
                        type: "application/rss+xml"
                    }
                }
            }
        };
        getThreads(boardName, {
            filterFunction: function(thread) {
                return !thread.draft;
            }
        }).then(function(threads) {
            threads.sort(Board.sortThreadsByDate);
            c.threads = threads;
            return f();
        }).then(function() {
            doc.channel.item = posts.map(function(post) {
                var title;
                var isOp = post.number == post.threadNumber;
                if (isOp)
                    title = "[" + Tools.translate("New thread", "itemTitle") + "]";
                else
                    title = Tools.translate("Reply to thread", "itemTitle");
                title += " ";
                if (!post.subject && post.rawText)
                    post.subject = post.rawText.substr(0, 150);
                if (post.subject) {
                    if (!isOp)
                        title += "\"";
                    title += post.subject;
                    if (!isOp)
                        title += "\"";
                } else {
                    title += post.number;
                }
                var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/res/"
                    + post.threadNumber + ".html";
                var description = "\n" + post.fileInfos.map(function(fileInfo) {
                    return"<img src=\"" + site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName
                        + "/thumb/" + fileInfo.thumb.name + "\"><br />";
                }) + (post.text || "") + "\n";
                return {
                    title: title,
                    link: link,
                    description: description,
                    pubDate: moment(post.createdAt).utc().locale("en").format("ddd, DD MMM YYYY hh:mm:ss +0000"),
                    guid: {
                        _: link + "#" + post.number,
                        $: { isPermalink: true }
                    },
                    "dc:creator": (post.name || board.defaultUserName)
                };
            });
        }).then(function() {
            var builder = new XML2JS.Builder({
                rootName: "rss",
                renderOpts: {
                    pretty: true,
                    indent: "    ",
                    newline: "\n"
                },
                cdata: true
            });
            rss[boardName] = builder.buildObject(doc);
        });
    });
};

var toMap = function(index, boardName) {
    if (!index || index.length < 1)
        return {};
    var map = {};
    index.forEach(function(post) {
        post = JSON.parse(post);
        if (boardName && post.boardName != boardName)
            return;
        map[post.boardName + ":" + post.postNumber + ":" + post.source] = post;
    });
    return map;
};

var findPhrase = function(phrase, boardName) {
    var promises = Tools.getWords(phrase).map(function(word) {
        return db.smembers("postSearchIndex:" + word.word);
    });
    return Promise.all(promises).then(function(results) {
        if (results.length < 1)
            return {};
        var first = toMap(results[0], boardName);
        for (var i = 1; i < results.length; ++i) {
            var next = toMap(results[i]);
            for (var key in first) {
                if (!first.hasOwnProperty(key))
                    continue;
                if (!next.hasOwnProperty(key)) {
                    delete first[key];
                    continue;
                }
                var firstPost = first[key];
                var nextPost = next[key];
                ++firstPost.position;
                if (nextPost.position != firstPost.position)
                    delete first[key];
            }
        }
        return first;
    });
};

module.exports.findPosts = function(query, boardName) {
    var c = {};
    var promises = query.possiblePhrases.map(function(phrase) {
        return findPhrase(phrase, boardName).then(function(m) {
            c.map = Tools.sum(c.map || {}, m);
        });
    });
    return Promise.all(promises).then(function() {
        var promises = query.requiredPhrases.map(function(phrase) {
            return findPhrase(phrase, boardName).then(function(m) {
                c.map = Tools.intersection(c.map, m);
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = query.excludedPhrases.map(function(phrase) {
            return findPhrase(phrase, boardName).then(function(m) {
                c.map = Tools.complement(c.map, m);
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var keys = [];
        Tools.forIn(c.map, function(post) {
            keys.push(post.boardName + ":" + post.postNumber);
        });
        if (keys.length < 1)
            return Promise.resolve([]);
        return db.hmget("posts", keys);
    }).then(function(posts) {
        return posts.map(function(post) {
            return JSON.parse(post);
        });
    });
};
