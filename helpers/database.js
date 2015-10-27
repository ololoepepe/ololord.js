var Crypto = require("crypto");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var Promise = require("promise");
var promisify = require("promisify-node");
var redis = require("then-redis");
var SQLite3 = require("sqlite3");
var Util = require("util");

var mkpath = promisify("mkpath");

var Board = require("../boards/board");
var Cache = require("./cache");
var markup = require("./markup");
var Tools = require("./tools");

var Ratings = {};
var RegisteredUserLevels = {};

var db = redis.createClient();
var dbGeo = new SQLite3.Database(__dirname + "/../geolocation/ip2location.sqlite");

db.tmp_hmget = db.hmget;
db.hmget = function(key, hashes) {
    return db.tmp_hmget.apply(db, [key].concat(hashes));
};

var Lock = require("./then-redis-lock")(db);

module.exports.Lock = Lock;

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

module.exports.threadPosts = function(boardName, threadNumber, options) {
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
        var bound = reverse ? (limit ? (result.length - limit - 1) : -1) : (limit ? limit : result.length);
        if (bound < 0)
            bound = -1;
        if (bound > result.length)
            boudn = result.length;
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
                posts = posts.map(JSON.parse);
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

var createPost = function(req, fields, files, threadNumber, date) {
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
    var ip = (req.ip || null);
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
        if (files.length < 1)
            return Promise.resolve();
        return db.hmset("fileHashes", files.reduce(function(acc, fileInfo) {
            acc[fileInfo.hash] = JSON.stringify({
                name: fileInfo.name,
                thumb: { name: fileInfo.thumb.name },
                size: fileInfo.size,
                boardName: fileInfo.boardName,
                mimeType: fileInfo.mimeType,
                rating: fileInfo.rating
            });
        }), {});
    }).then(function() {
        var promises = [];
        for (var word in Tools.indexPost({
            boardName: board.name,
            number: c.postNumber,
            rawText: rawText,
            subject: (fields.subject || null)
        }), function(index, word) {
            promises.push(db.sadd("postSearchIndex:" + word, index));
        });
        return Promise.all(promises);
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
        return createPost(req, fields, files);
    });
};

var removeThread = function(boardName, threadNumber, archived) {
    //
};

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
            setTimeout(function() {
                removeThread(board.name, thread.number, true);
            }, 10000);
            return db.hdel("archivedThreads:" + board.name, thread.number);
        }).then(function() {
            c.thread = c.threads.pop();
            if (board.archiveLimit <= 0) {
                setTimeout(function() {
                    removeThread(board.name, c.thread.number);
                }, 10000);
            }
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
        var thread = {
            archived: false,
            boardName: board.name,
            closed: false,
            createdAt: date.toISOString(),
            fixed: false,
            number: c.threadNumber,
            options: {
                draft: (hashpass && board.draftsEnabled && fields.draft)
            },
            updatedAt: date.toISOString(),
            user: {
                hashpass: hashpass,
                ip: (req.ip || null),
                level: c.level,
                password: password
            }
        };
        return db.hset("threads:" + board.name, c.threadNumber, JSON.stringify(thread));
    }).then(function() {
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        c.files = files;
        return createPost(req, fields, files, c.threadNumber, date);
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
    var q = "SELECT FROM ip2location(ipFrom, countryCode, countryName, cityName) WHERE ipTo >= ? LIMIT 1";
    var stmt = db.prepare(q);
    stmt.prun = promisify(stmt.run);
    return stmt.prun(n).then(function(result) {
        stmt.finalize();
        if (!result)
            return info;
        var ipFrom = +result.ipFrom;
        if (isNaN(ipFrom) || ipFrom < n)
            return info;
        info.cityName = result.cityName;
        info.countryCode = result.countryCode;
        info.countryName = result.countryName;
    });
};

module.exports.initialize = function() {
    return Lock.drop();
};

var Transaction = function(boardName) {
    this.filePaths = [];
    this.boardName = boardName;
    this.postNumber = 0;
    this.threadNumber = 0;
    this.referencedPosts = [];
    this.referringPosts = [];
};

Transaction.prototype.rollback = function() {
    this.filePaths.forEach(function(path) {
        try {
            FSSync.unlink(path);
        } catch (err) {
            //
        }
    });
};

module.exports.Transaction = Transaction;
