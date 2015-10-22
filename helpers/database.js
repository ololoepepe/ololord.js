var Crypto = require("crypto");
var FS = require("fs");
var Promise = require("promise");
var promisify = require("promisify-node");
var redis = require("then-redis");
var SQLite3 = require("sqlite3");

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

module.exports.getThreads = function(boardName, options) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board name");
    var opts = (typeof options == "object");
    var c = {};
    var p = db.hgetall("threads:" + boardName).then(function(result) {
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
    return db.hget("registeredUsers", reqOrHashpass);
};

module.exports.registeredUser = registeredUser;

module.exports.registeredUserLevel = function(reqOrHashpass) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        if (!user)
            return null;
        return user.level;
    });
};

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

var createPost = function(req, fields, files, options) {
    var board = Board.board(fields.board);
    if (!board)
        return Promise.reject("Invalid board");
    var date = (options && (options.date instanceof Date)) ? options.date : Tools.now();
    var threadNumber = (options && !isNaN(+options.threadNumber) && (+options.threadNumber > 0))
        ? +options.threadNumber : +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread number");
    var c = {};
    var rawText = (fields.text || null);
    var markupModes = [];
    var referencedPosts = {};
    var password = null;
    var hashpass = (req.settings.hashpass || null);
    var ip = (req.ip || null);
    if (fields.password) {
        var sha256 = Crypto.createHash("sha256");
        sha256.update(fields.password);
        password = sha256.digest("hex");
    }
    Tools.forIn(markup.MarkupModes, function(val) {
        //if (fields.markupMode && fields.markupMode.indexOf(val))
            markupModes.push(val);
    });
    return registeredUser(hashpass).then(function(user) {
        c.user = user;
        c.isRaw = compareRegisteredUserLevels(c.user ? c.user.level : null, RegisteredUserLevels.Admin) >= 0;
        if (c.isRaw)
            return rawText;
        return markup(board.name, rawText, {
            markupModes: markupModes,
            referencedPosts: referencedPosts
        });
    }).then(function(text) {
        c.text = text;
        return board.postExtraData(fields, files)
    }).then(function(extraData) {
        c.extraData = extraData;
        return getGeolocationInfo(ip);
    }).then(function(geo) {
        c.geo = geo;
        return db.scard("threadPostNumbers:" + board.name + ":" + threadNumber);
    }).then(function(postCount) {
        c.postCount = postCount;
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
                level: (c.user ? c.user.level : null),
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
        c.post.referencedPosts = c.refs;
        return c.post;
    });
};

module.exports.createPost = function(req, fields, files) {
    return createPost(req, fields, files);
};

module.exports.createThread = function(req, fields, files) {
    return createPost(req, fields, files, {threadNumber: 12089}); //TODO
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
