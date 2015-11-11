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

var Board = require("../boards");
var Cache = require("./cache");
var Captcha = require("../captchas");
var config = require("./config");
var markup = require("./markup");
var Tools = require("./tools");

var Ratings = {};
var RegisteredUserLevels = {};

var db = Redis.createClient();
var dbGeo = new SQLite3.Database(__dirname + "/../geolocation/ip2location.sqlite");

module.exports.db = db;

db.tmp_hmget = db.hmget;
db.hmget = function(key, hashes) {
    return db.tmp_hmget.apply(db, [key].concat(hashes));
};

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
        return Promise.reject("Invalid board");
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

var bannedFor = function(boardName, postNumber, userIp) {
    return db.hget("bannedUsers", userIp).then(function(result) {
        if (!result)
            return Promise.resolve(false);
        var ban = JSON.parse(result).bans[boardName];
        if (!ban)
            return Promise.resolve(false);
        return Promise.resolve(ban.postNumber == postNumber);
    });
};

var threadPosts = function(boardName, threadNumber, options) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject("Invalid board");
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread");
    var opts = (typeof options == "object");
    var filter = opts && (typeof options.filterFunction == "function");
    var limit = (opts && !isNaN(options.limit) && options.limit > 0) ? options.limit : 0; //NOTE: 0 means no limit
    var reverse = opts && options.reverse;
    var c = { posts: [] };
    var p = threadPostNumbers(boardName, threadNumber).then(function(result) {
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
                    post = JSON.parse(post);
                    post.sequenceNumber = result.indexOf(post.number) + 1;
                    return post;
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
        return Promise.reject("Invalid board");
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject("Invalid post");
    var opts = (typeof options == "object");
    var c = {};
    var key = boardName + ":" + postNumber;
    var p = db.hget("posts", key).then(function(post) {
        c.post = post ? JSON.parse(post) : null;
        return c.post;
    }).then(function(post) {
        if (!post)
            return Promise.resolve(post);
        return bannedFor(boardName, post.number, post.user.ip).then(function(banned) {
            post.bannedFor = banned;
            return Promise.resolve(c.post);
        });
    });
    if (!opts || (!options.withFileInfos && !options.withReferences && !options.withExtraData))
        return p;
    return p.then(function() {
        if (!c.post)
            return Promise.resolve();
        return threadPostNumbers(c.post.boardName, c.post.threadNumber);
    }).then(function(postNumbers) {
        if (!c.post)
            return Promise.resolve();
        c.post.sequenceNumber = postNumbers.indexOf(c.post.number) + 1;
        var promises = [];
        if (options.withFileInfos) {
            promises.push(postFileInfoNames(boardName, postNumber).then(function(names) {
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

var getFileInfo = function(fileName) {
    return db.hget("fileInfos", fileName).then(function(fileInfo) {
        return Promise.resolve(fileInfo ? JSON.parse(fileInfo) : null);
    });
};

module.exports.getFileInfo = getFileInfo;

module.exports.threadPostCount = function(boardName, threadNumber) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board");
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread");
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

module.exports.registerUser = function(hashpass, level, boardNames, ips) {
    return db.hset("registeredUsers", hashpass, JSON.stringify({
        hashpass: hashpass,
        level: level,
        boardNames: boardNames,
        createdAt: Tools.now().toISOString()
    })).then(function() {
        var promises = ips.map(function(ip) {
            return db.hset("registeredUserHashes", ip, hashpass);
        });
        return Promise.resolve(promises);
    });
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
        return Promise.reject("Invalid board");
    return db.hget("postCounters", boardName).then(function(number) {
        if (!number)
            return 0;
        return +number;
    });
};

module.exports.lastPostNumber = lastPostNumber;

var nextPostNumber = function(boardName) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject("Invalid board");
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

var processFile = function(board, file, transaction) {
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
};

var processFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    if (files.length < 1)
        return Promise.resolve([]);
    var list = [];
    var p = processFile(board, files[0], transaction).then(function(file) {
        list.push(file);
        return Promise.resolve();
    });
    for (var i = 1; i < files.length; ++i) {
        (function(file) {
            p = p.then(function() {
                return processFile(board, file, transaction);
            }).then(function(file) {
                list.push(file);
                return Promise.resolve();
            });
        })(files[i]);
    }
    return mkpath(__dirname + "/../public/" + board.name + "/src").then(function() {
        return mkpath(__dirname + "/../public/" + board.name + "/thumb");
    }).then(function() {
        return p;
    }).then(function() {
        return Promise.resolve(list);
    });
};

var createPost = function(req, fields, files, transaction, threadNumber, date) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    date = date || Tools.now();
    var c = {};
    if (threadNumber)
        c.postNumber = threadNumber;
    else
        threadNumber = +fields.threadNumber;
    var rawText = (fields.text || null);
    var markupModes = [];
    var referencedPosts = {};
    var password = Tools.password(fields.password);
    var hashpass = (req.hashpass || null);
    var ip = (req.trueIp || null);
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
            email: (fields.email || null),
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
        return db.hset("posts", board.name + ":" + c.postNumber, JSON.stringify(c.post));
    }).then(function() {
        return board.storeExtraData(c.postNumber, c.extraData);
    }).then(function() {
        return addReferencedPosts(board.name, c.postNumber, threadNumber, referencedPosts);
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
            promises.push(db.sadd("postSearchIndex:" + word, JSON.stringify(index[0])));
        });
        return Promise.all(promises);
    }).then(function() {
        return db.sadd("threadPostNumbers:" + board.name + ":" + threadNumber, c.postNumber);
    }).then(function() {
        return db.hset("threadUpdateTimes:" + board.name, c.thread.number, date.toISOString());
    }).then(function() {
        c.post.referencedPosts = c.refs;
        c.fileInfos = files;
        return c.post;
    });
};

var checkCaptcha = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    if (!board.captchaEnabled)
        return Promise.resolve();
    var ip = req.trueIp;
    return getUserCaptchaQuota(board.name, ip).then(function(quota) {
        if (board.captchaQuota > 0 && +quota > 0)
            return captchaUsed(board.name, ip);
        var supportedCaptchaEngines = board.supportedCaptchaEngines;
        if (supportedCaptchaEngines.length < 1)
            return Promise.reject("Internal error");
        var ceid = fields.captchaEngine;
        var isSupported = function(id) {
            for (var i = 0; i < supportedCaptchaEngines.length; ++i) {
                if (supportedCaptchaEngines[i].id == id)
                    return true;
            }
            return false;
        };
        if (!ceid || !isSupported(ceid)) {
            if (isSupported("google-recaptcha"))
                ceid = "google-recaptcha";
            else
                ceid = supportedCaptchaEngines[0].id;
        }
        var captcha = Captcha.captcha(ceid);
        if (!captcha)
            return Promise.reject("Invalid captcha engine");
        return captcha.checkCaptcha(req, fields).then(function() {
            return captchaSolved(board.name, ip);
        });
    });
};

module.exports.createPost = function(req, fields, files, transaction) {
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread");
    return checkCaptcha(req, fields).then(function() {
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        return createPost(req, fields, files, transaction);
    });
};

var removeReferencedPosts = function(boardName, postNumber) {
    var key = boardName + ":" + postNumber;
    return db.hgetall("referencedPosts:" + key).then(function(referencedPosts) {
        var promises = [];
        Tools.forIn(referencedPosts, function(_, refKey) {
            promises.push(db.hdel("referringPosts:" + refKey, key));
        });
        return Promise.all(promises);
    }).then(function() {
        return db.del("referencedPosts:" + key);
    });
};

var addReferencedPosts = function(boardName, postNumber, threadNumber, referencedPosts) {
    var key = boardName + ":" + postNumber;
    var promises = [];
    Tools.forIn(referencedPosts, function(ref, refKey) {
        promises.push(db.hset("referencedPosts:" + key, refKey, JSON.stringify(ref)));
    });
    return Promise.all(promises).then(function() {
        var promises = [];
        Tools.forIn(referencedPosts, function(ref, refKey) {
            promises.push(db.hset("referringPosts:" + refKey, key, JSON.stringify({
                boardName: boardName,
                postNumber: postNumber,
                threadNumber: threadNumber,
                createdAt: refKey.createdAt
            })));
        });
        return Promise.all(promises);
    });
};

var removePost = function(boardName, postNumber) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var c = {};
    return db.sadd("postsPlannedForDeletion", boardName + ":" + postNumber).then(function() {
        return getPost(boardName, postNumber, { withReferences: true });
    }).then(function(post) {
        c.post = post;
        return db.srem("threadPostNumbers:" + boardName + ":" + post.threadNumber, postNumber);
    }).then(function() {
        return db.hdel("posts", boardName + ":" + postNumber);
    }).then(function() {
        return removeReferencedPosts(boardName, postNumber, c.post.threadNumber, c.post.referencedPosts);
    }).then(function() {
        return postFileInfoNames(boardName, postNumber);
    }).then(function(names) {
        c.fileInfoNames = names;
        return Promise.all(names.map(function(name) {
            return db.hget("fileInfos", name);
        }));
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
        return db.del("postFileInfoNames:" + boardName + ":" + postNumber);
    }).then(function() {
        return Promise.all(c.fileInfoNames.map(function(name) {
            return db.hdel("fileInfos", name);
        }));
    }).then(function() {
        var promises = c.hashes.map(function(hash) {
            return db.srem("fileHashesExtra:" + hash, JSON.stringify({
                boardName: boardName,
                postNumber: postNumber
            })).then(function() {
                return db.hdel("fileHashes", hash);
            }).then(function() {
                return db.smembers("fileHashesExtra:" + hash);
            }).then(function(list) {
                if (list && list.length > 0)
                    return Promise.resolve();
                return db.del("fileHashesExtra:" + hash);
            });
        });
        return Promise.all(promises);
    }).then(function() {
        return board.removeExtraData(postNumber);
    }).then(function() {
        var promises = [];
        Tools.forIn(Tools.indexPost({
            boardName: boardName,
            number: postNumber,
            rawText: c.post.rawText,
            subject: c.post.subject
        }), function(index, word) {
            promises.push(db.srem("postSearchIndex:" + word, JSON.stringify(index[0])));
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.paths.map(function(path) {
            return FS.remove(path);
        });
        return Promise.all(promises);
    }).then(function() {
        return db.srem("postsPlannedForDeletion", boardName + ":" + postNumber);
    });
};

module.exports.removePost = removePost;

var removeThread = function(boardName, threadNumber, archived) {
    var key = (archived ? "archivedThreads:" : "threads:") + boardName;
    return db.sadd("threadsPlannedForDeletion", boardName + ":" + threadNumber).then(function() {
        return db.hdel(key, threadNumber);
    }).then(function() {
        return db.hdel("threadUpdateTimes:" + boardName, threadNumber);
    }).then(function() {

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
            }).then(function() {
                return db.srem("threadsPlannedForDeletion", boardName + ":" + threadNumber);
            });
        }, 10000);
        return Promise.resolve();
    });
};

module.exports.removeThread = removeThread;

module.exports.createThread = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var c = {};
    var date = Tools.now();
    var hashpass = req.hashpass || null;
    var password = Tools.password(fields.password);
    return checkCaptcha(req, fields).then(function() {
        return registeredUserLevel(hashpass);
    }).then(function(level) {
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
                    return !post.options.draft;
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

var getUserCaptchaQuota = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject("Invalid board");
    return db.hget("captchaQuotas", boardName + ":" + userIp).then(function(quota) {
        return Promise.resolve((+quota > 0) ? +quota : 0);
    });
};

module.exports.getUserCaptchaQuota = getUserCaptchaQuota;

var captchaSolved = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var quota = board.captchaQuota;
    if (quota < 1)
        return Promise.resolve(0);
    return db.hincrby("captchaQuotas", boardName + ":" + userIp, quota);
};

module.exports.captchaSolved = captchaSolved;

var captchaUsed = function(boardName, userIp) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject("Invalid board");
    if (board.captchaQuota < 1)
        return Promise.resolve(0);
    return db.hincrby("captchaQuotas", boardName + ":" + userIp, -1).then(function(quota) {
        if (+quota < 0)
            return db.hset("captchaQuotas", boardName + ":" + userIp, 0);
        return (quota < 0) ? 0 : quota;
    });
};

module.exports.captchaUsed = captchaUsed;

var rerenderPost = function(boardName, postNumber) {
    var key = boardName + ":" + postNumber;
    var c = {};
    console.log(`Rendering post: [${boardName}] ${postNumber}`);
    var referencedPosts = {};
    return getPost(boardName, postNumber).then(function(post) {
        c.post = post;
        return markup(c.post.boardName, c.post.rawText, {
            markupModes: c.post.markup,
            referencedPosts: referencedPosts
        });
    }).then(function(text) {
        if (!c.post.options.rawHtml)
            c.post.text = text;
        return db.hset("posts", key, JSON.stringify(c.post));
    }).then(function() {
        return removeReferencedPosts(boardName, postNumber);
    }).then(function() {
        return addReferencedPosts(boardName, postNumber, c.post.threadNumber, referencedPosts);
    }).then(function() {
        return Promise.resolve();
    });
};

var rerenderBoardPosts = function(boardName, posts) {
    if (posts.length < 1)
        return Promise.resolve();
    var p = rerenderPost(boardName, posts[0]);
    for (var i = 1; i < posts.length; ++i) {
        (function(i) {
            p = p.then(function() {
                return rerenderPost(boardName, posts[i]);
            });
        })(i);
    }
    return p;
};

module.exports.rerenderPosts = function(boardNames) {
    var posts = {};
    return db.hkeys("posts").then(function(keys) {
        keys.forEach(function(key) {
            var boardName = key.split(":").shift();
            var postNumber = +key.split(":").pop();
            if (!posts.hasOwnProperty(boardName))
                posts[boardName] = [];
            posts[boardName].push(postNumber);
        });
        var postList = boardNames.map(function(boardName) {
            return {
                boardName: boardName,
                posts: (posts.hasOwnProperty(boardName) ? posts[boardName] : [])
            };
        });
        if (postList.length < 1)
            return Promise.resolve();
        var p = rerenderBoardPosts(postList[0].boardName, postList[0].posts);
        for (var i = 1; i < postList.length; ++i) {
            (function(i) {
                p = p.then(function() {
                    return rerenderBoardPosts(postList[i].boardName, postList[i].posts);
                });
            })(i);
        }
        return p;
    });
};

module.exports.addFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var c = {};
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject("Invalid post number");
    return getPost(board.name, postNumber, { withExtraData: true }).then(function(post) {
        if (!post.options.draft && compareRegisteredUserLevels(req.level, "MODER") < 0)
            return Promise.reject("Not enough rights");
        if ((!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        c.post = post;
        return postFileInfoNames(board.name, c.post.number);
    }).then(function(names) {
        var fileHashes = fields.fileHashes ? fields.fileHashes.split(",") : [];
        if (names.length + files.length + fileHashes.length > board.maxFileCount)
            return Promise.reject("Too many files");
        return processFiles(req, fields, files, transaction);
    }).then(function(files) {
        c.files = files;
        return Promise.all(c.files.map(function(fileInfo) {
            fileInfo.boardName = board.name;
            fileInfo.postNumber = c.post.number;
            return db.hset("fileInfos", fileInfo.name, JSON.stringify(fileInfo)).then(function() {
                return db.sadd("postFileInfoNames:" + board.name + ":" + c.post.number, fileInfo.name);
            });
        }));
    }).then(function() {
        c.hashes = c.files.reduce(function(acc, fileInfo) {
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
                postNumber: c.post.number
            })));
        });
        return Promise.all(promises);
    }).then(function() {
        return Promise.resolve(c.post);
    });
};

module.exports.editPost = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var date = Tools.now();
    var c = {};
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject("Invalid post number");
    var rawText = fields.text || null;
    var email = fields.email || null;
    var name = fields.name || null;
    var subject = fields.subject || null;
    var isRaw = fields.raw && compareRegisteredUserLevels(req.level, RegisteredUserLevels.Admin) >= 0;
    var markupModes = [];
    var referencedPosts = {};
    Tools.forIn(markup.MarkupModes, function(val) {
        if (fields.markupMode && fields.markupMode.indexOf(val) >= 0)
            markupModes.push(val);
    });
    return getPost(board.name, postNumber, { withExtraData: true }).then(function(post) {
        if (!post.options.draft && compareRegisteredUserLevels(req.level, "MODER") < 0)
            return Promise.reject("Not enough rights");
        if ((!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        c.post = post;
        c.draft = post.options.draft && fields.draft;
        return postFileInfoNames(post.boardName, post.number);
    }).then(function(numbers) {
        if (!rawText && numbers.length < 1)
            return Promise.reject("Both file and comment are missing");
        if (rawText && rawText.length > board.maxTextLength)
            return Promise.reject("Text is too long");
        if (email && email.length > board.maxEmailLength)
            return Promise.reject("E-mail is too long");
        if (name && name.length > board.maxNameLength)
            return Promise.reject("Name is too long");
        if (subject && subject.length > board.maxSubjectLength)
            return Promise.reject("Subject is too long");
        if (isRaw)
            return Promise.resolve(rawText);
        return markup(board.name, rawText, {
            markupModes: markupModes,
            referencedPosts: referencedPosts
        });
    }).then(function(text) {
        c.text = text;
        return board.postExtraData(req, fields, null, c.post)
    }).then(function(extraData) {
        c.extraData = extraData;
        var promises = [];
        Tools.forIn(Tools.indexPost({
            boardName: c.post.boardName,
            number: c.post.number,
            rawText: c.post.rawText,
            subject: c.post.subject
        }), function(index, word) {
            promises.push(db.srem("postSearchIndex:" + word, JSON.stringify(index[0])));
        });
        return Promise.all(promises);
    }).then(function() {
        c.post.email = email || null;
        c.post.markup = markupModes;
        c.post.name = name || null;
        c.post.options.rawHtml = isRaw;
        c.post.options.draft = c.draft;
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
        return removeReferencedPosts(board.name, c.post.number);
    }).then(function() {
        return addReferencedPosts(board.name, c.post.number, c.post.threadNumber, referencedPosts);
    }).then(function() {
        var promises = [];
        Tools.forIn(Tools.indexPost({
            boardName: board.name,
            number: c.post.number,
            rawText: rawText,
            subject: subject
        }), function(index, word) {
            promises.push(db.sadd("postSearchIndex:" + word, JSON.stringify(index[0])));
        });
        return Promise.all(promises);
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.setThreadFixed = function(req, fields) {
    if (compareRegisteredUserLevels(req.level, "MODER") < 0)
        return Promise.reject("Not enough rights");
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread number");
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject("No such thread");
        thread = JSON.parse(thread);
        if ((!req.hashpass || req.hashpass != thread.user.hashpass)
            && (compareRegisteredUserLevels(req.level, thread.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        var fixed = (fields.fixed == "true");
        if (thread.fixed == fixed)
            return Promise.resolve();
        thread.fixed = fixed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.setThreadClosed = function(req, fields) {
    if (compareRegisteredUserLevels(req.level, "MODER") < 0)
        return Promise.reject("Not enough rights");
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject("Invalid thread number");
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject("No such thread");
        thread = JSON.parse(thread);
        if ((!req.hashpass || req.hashpass != thread.user.hashpass)
            && (compareRegisteredUserLevels(req.level, thread.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        var closed = (fields.closed == "true");
        if (thread.closed == closed)
            return Promise.resolve();
        thread.closed = closed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return Promise.resolve();
    });
};

module.exports.deletePost = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject("Invalid board");
    var postNumber = +fields.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return Promise.reject("Invalid post number");
    var password = Tools.password(fields.password);
    var c = {};
    return getPost(board.name, postNumber).then(function(post) {
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        return (post.threadNumber == post.number) ? removeThread(board.name, postNumber)
            : removePost(board.name, postNumber);
    }).then(function() {
        return {
            boardName: board.name,
            threadNumber: ((c.post.threadNumber != c.post.number) ? c.post.threadNumber : 0)
        };
    });
};

module.exports.deleteFile = function(req, fields) {
    var fileName = fields.fileName;
    if (!fileName)
        return Promise.reject("Invalid file name");
    var password = Tools.password(fields.password);
    var c = {};
    return db.hget("fileInfos", fileName).then(function(fileInfo) {
        if (!fileInfo)
            return Promise.reject("No such file");
        c.fileInfo = JSON.parse(fileInfo);
        return getPost(c.fileInfo.boardName, c.fileInfo.postNumber);
    }).then(function(post) {
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        return postFileInfoNames(c.post.boardName, c.post.number);
    }).then(function(numbers) {
        if (!c.post.rawText && numbers.length < 2)
            return Promise.reject("Both file and comment are missing");
        return db.srem("postFileInfoNames:" + c.post.boardName + ":" + c.post.number, fileName);
    }).then(function() {
        return db.hdel("fileInfos", fileName);
    }).then(function() {
        return db.srem("fileHashesExtra:" + c.fileInfo.hash, JSON.stringify({
            boardName: c.post.boardName,
            postNumber: c.post.number
        }));
    }).then(function() {
        return db.smembers("fileHashesExtra:" + c.fileInfo.hash);
    }).then(function(list) {
        if (list && list.length > 0)
            return Promise.resolve();
        return db.del("fileHashesExtra:" + c.fileInfo.hash);
    }).then(function() {
        return db.hdel("fileHashes", c.fileInfo.hash);
    }).then(function() {
        paths = [];
        paths.push(__dirname + "/../public/" + c.post.boardName + "/src/" + c.fileInfo.name);
        paths.push(__dirname + "/../public/" + c.post.boardName + "/thumb/" + c.fileInfo.thumb.name);
        var promises = paths.map(function(path) {
            return FS.remove(path);
        });
        return Promise.all(promises);
    }).then(function() {
        return {
            boardName: c.post.boardName,
            postNumber: c.post.number,
            threadNumber: c.post.threadNumber
        };
    });
};

module.exports.editAudioTags = function(req, fields) {
    var c = {};
    var password = Tools.password(fields.password);
    return getFileInfo(fields.fileName).then(function(fileInfo) {
        if (!fileInfo)
            return Promise.reject("No such file info");
        if (fileInfo.mimeType.substr(0, 6) != "audio/")
            return Promise.reject("Invalid file type");
        c.fileInfo = fileInfo;
        return getPost(fileInfo.boardName, fileInfo.postNumber);
    }).then(function(post) {
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject("Not enough rights");
        }
        ["album", "artist", "title", "year"].forEach(function(tag) {
            if (fields[tag]) {
                c.fileInfo.extraData[tag] = fields[tag];
            } else if (c.fileInfo.extraData[tag]) {
                delete c.fileInfo.extraData[tag];
            }
        });
        return db.hset("fileInfos", c.fileInfo.name, JSON.stringify(c.fileInfo));
    });
};

module.exports.bannedUser = function(ip) {
    return db.hget("bannedUsers", ip).then(function(user) {
        if (!user)
            return Promise.resolve(null);
        return Promise.resolve(JSON.parse(user));
    });
};

module.exports.bannedUsers = function() {
    return db.hgetall("bannedUsers").then(function(result) {
        var users = [];
        Tools.forIn(result, function(user, ip) {
            users.push(JSON.parse(user));
        });
        return Promise.resolve(users);
    });
};

module.exports.banUser = function(req, ip, bans) {
    if (!ip)
        return Promise.reject("Invalid IP");
    if (ip == req.trueIp)
        return Promise.reject("Not enough rights");
    var err = bans.reduce(function(err, ban) {
        if (err)
            return err;
        if (!ban.boardName || !Board.board(ban.boardName))
            return "Invalid board";
        if (["NO_ACCESS", "READ_ONLY"].indexOf(ban.level) < 0)
            return "Invalid level";
        return null;
    }, null);
    if (err)
        return Promise.reject(err);
    return db.hget("registeredUserHashes", ip).then(function(hash) {
        if (!hash)
            return Promise.resolve();
        return db.hget("registeredUsers", hash);
    }).then(function(user) {
        user = user ? JSON.parse(user) : null;
        if (user && compareRegisteredUserLevels(req.level, user.level) <= 0)
            return Promise.reject("Not enough rights");
        if (bans.length < 1)
            return db.hdel("bannedUsers", ip);
        var date = Tools.now();
        bans = bans.reduce(function(acc, ban) {
            ban.createdAt = date;
            acc[ban.boardName] = ban;
            return acc;
        }, {});
        return db.hset("bannedUsers", ip, JSON.stringify({
            ip: ip,
            bans: bans
        }));
    });
};
