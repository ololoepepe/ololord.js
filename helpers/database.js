var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var bigInt = require("big-integer");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Redis = require("then-redis");
var SQLite3 = require("sqlite3");
var Util = require("util");

var mkpath = promisify("mkpath");

var Board = require("../boards");
var BoardModel = require("../models/board");
var Captcha = require("../captchas");
var config = require("./config");
var controller = require("./controller");
var Global = require("./global");
var markup = require("./markup");
var Tools = require("./tools");

var Ratings = {};
var RegisteredUserLevels = {};

var db = Redis.createClient();
var dbGeo = new SQLite3.Database(__dirname + "/../geolocation/ip2location.sqlite");

module.exports.db = db;

db.tmp_hmget = db.hmget;
db.hmget = function(key, hashes) {
    if (!hashes || (Util.isArray(hashes) && hashes.length <= 0))
        return Promise.resolve([]);
    return db.tmp_hmget.apply(db, [key].concat(hashes));
};

db.tmp_sadd = db.sadd;
db.sadd = function(key, members) {
    return db.tmp_sadd.apply(db, [key].concat(members));
};

db.tmp_srem = db.srem;
db.srem = function(key, members) {
    return db.tmp_srem.apply(db, [key].concat(members));
};

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

var addPostToIndex = function(post) {
    var p = Promise.resolve();
    Tools.forIn(Tools.indexPost(post), function(index, word) {
        p = p.then(function() {
            return db.sadd("postSearchIndex:" + word, index.map(function(item) {
                return JSON.stringify(item);
            }));
        });
    });
    return p;
};

var removePostFromIndex = function(post) {
    var p = Promise.resolve();
    Tools.forIn(Tools.indexPost(post), function(index, word) {
        p = p.then(function() {
            return db.srem("postSearchIndex:" + word, index.map(function(item) {
                return JSON.stringify(item);
            }));
        });
    });
    return p;
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
    });;
    if (!opts || (!options.withFileInfos && !options.withReferences && !options.withExtraData))
        return p;
    return p.then(function() {
        return threadPostNumbers(c.post.boardName, c.post.threadNumber);
    }).then(function(postNumbers) {
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
            var address = Tools.correctAddress(ip);
            if (!address)
                return Promise.reject(Tools.translate("Invalid IP address"));
            return db.hset("registeredUserHashes", address, hashpass);
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
        return Promise.reject(Tools.translate("Invalid board"));
    return db.hget("postCounters", boardName).then(function(number) {
        if (!number)
            return 0;
        return +number;
    });
};

module.exports.lastPostNumber = lastPostNumber;

var nextPostNumber = function(boardName, incrby) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return Promise.reject(Tools.translate("Invalid board"));
    incrby = +incrby;
    if (isNaN(incrby) || incrby < 1)
        incrby = 1;
    return db.hincrby("postCounters", boardName, incrby).then(function(number) {
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
    var p = Promise.resolve();
    var fileInfos = [];
    hashes.forEach(function(hash) {
        p = p.then(function() {
            return db.srandmember("fileHashes:" + hash);
        }).then(function(fileInfo) {
            fileInfo = JSON.parse(fileInfo);
            fileInfo.hash = hash;
            fileInfos.push(fileInfo);
            return Promise.resolve();
        });
    });
    return p.then(function() {
        return Promise.resolve(fileInfos);
    });
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
                return FS.exists(targetThumbPath);
            }).then(function(exists) {
                if (!exists)
                    return Promise.reject(Tools.translate("Failed to copy file"));
                return getFileInfo({ fileName: file.name });
            }).then(function(fileInfo) {
                return {
                    dimensions: fileInfo.dimensions,
                    extraData: fileInfo.extraData,
                    hash: fileInfo.hash,
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
                return FS.exists(targetThumbPath);
            }).then(function(exists) {
                if (!exists)
                    return Promise.reject(Tools.translate("Failed to copy file"));
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
};

var processFiles = function(req, fields, files, transaction) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (files.length < 1)
        return Promise.resolve([]);
    var c = {};
    return mkpath(__dirname + "/../public/" + board.name + "/src").then(function() {
        return mkpath(__dirname + "/../public/" + board.name + "/thumb");
    }).then(function() {
        c.list = [];
        var p = processFile(board, files[0], transaction).then(function(file) {
            c.list.push(file);
            return Promise.resolve();
        });
        for (var i = 1; i < files.length; ++i) {
            (function(file) {
                p = p.then(function() {
                    return processFile(board, file, transaction);
                }).then(function(file) {
                    c.list.push(file);
                    return Promise.resolve();
                });
            })(files[i]);
        }
        return p;
    }).then(function() {
        return Promise.resolve(c.list);
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
    var password = Tools.password(fields.password);
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
        c.level = req.level || null;
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
            email: (fields.email || null),
            geolocation: c.geo,
            markup: markupModes,
            name: (fields.name || null),
            number: c.postNumber,
            options: {
                showTripcode: !!req.hashpass && !!fields.tripcode,
                signAsOp: ("true" == fields.signAsOp)
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
        return addPostToIndex({
            boardName: board.name,
            number: c.postNumber,
            rawText: rawText,
            subject: (fields.subject || null)
        });
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
            if (isSupported("google-recaptcha"))
                ceid = "google-recaptcha";
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

var rerenderReferringPosts = function(boardName, postNumber) {
    return db.hgetall("referringPosts:" + boardName + ":" + postNumber).then(function(referringPosts) {
        var p = Promise.resolve();
        Tools.forIn(referringPosts, function(ref) {
            ref = JSON.parse(ref);
            p = p.then(function() {
                return rerenderPost(ref.boardName, ref.postNumber, true);
            });
        });
        return p;
    });
};

var removeReferencedPosts = function(boardName, postNumber, nogenerate) {
    var key = boardName + ":" + postNumber;
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

var removePost = function(boardName, postNumber, leaveFileInfos) {
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
        return rerenderReferringPosts(boardName, postNumber);
    }).catch(function(err) {
        Global.error(err);
    }).then(function() {
        return removeReferencedPosts(boardName, postNumber);
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
        if (leaveFileInfos)
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
        if (leaveFileInfos)
            return Promise.resolve();
        return Promise.all(c.fileInfoNames.map(function(name) {
            return db.hdel("fileInfos", name);
        }));
    }).then(function() {
        if (leaveFileInfos)
            return Promise.resolve();
        return removeFileHashes(c.fileInfos);
    }).then(function() {
        return board.removeExtraData(postNumber);
    }).then(function() {
        return removePostFromIndex({
            boardName: boardName,
            number: postNumber,
            rawText: c.post.rawText,
            subject: c.post.subject
        });
    }).then(function() {
        if (!leaveFileInfos) {
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

var removeThread = function(boardName, threadNumber, archived, leaveFileInfos) {
    var key = (archived ? "archivedThreads:" : "threads:") + boardName;
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
                var p = Promise.resolve();
                c.postNumbers.forEach(function(postNumber) {
                    p = p.then(function() {
                        return removePost(boardName, postNumber, leaveFileInfos);
                    });
                });
                return p;
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
            if (c.archivedThreads.length <= 0 || c.archivedThreads.length < board.archiveLimit)
                return Promise.resolve();
            return removeThread(board.name, c.archivedThreads.pop().number, true);
        }).then(function() {
            c.thread = c.threads.pop();
            if (board.archiveLimit <= 0)
                return removeThread(board.name, c.thread.number);
            return db.hdel("threads:" + board.name, c.thread.number).then(function() {
                c.thread.archived = true;
                return db.hset("archivedThreads:" + board.name, c.thread.number, JSON.stringify(c.thread));
            }).then(function() {
                c.sourcePath = BoardModel.cachePath("thread", board.name, c.thread.number);
                return Tools.readFile(c.sourcePath);
            }).then(function(data) {
                c.data = data.data;
                return mkpath(`${__dirname}/../public/${board.name}/arch`);
            }).then(function() {
                return Tools.writeFile(`${__dirname}/../public/${board.name}/arch/${c.thread.number}.json`, c.data);
            }).then(function() {
                return Tools.removeFile(c.sourcePath);
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
    }).then(function(post) {
        return Global.generate(post.boardName, post.threadNumber, post.number, "create");
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

var findPhrase = function(phrase, boardName) {
    var results = [];
    var p = Promise.resolve();
    Tools.getWords(phrase).forEach(function(word) {
        p = p.then(function() {
            return db.smembers("postSearchIndex:" + word.word);
        }).then(function(result) {
            results.push(result.map(function(post) {
                return JSON.parse(post);
            }).filter(function(post) {
                return !boardName || (post.boardName == boardName);
            }));
            return Promise.resolve();
        });
    });
    var f = function(chain, ind) {
        if (!Util.isArray(chain))
            chain = [chain];
        ind = ind || 0;
        var lastPost = chain[chain.length - 1];
        if (ind > 0) {
            var nextChain = [];
            for (var i = 0; i < results[ind].length; ++i) {
                var post = results[ind][i];
                if (post.boardName != lastPost.boardName || post.number != lastPost.number
                    || post.source != lastPost.source || post.position != (lastPost.position + 1)) {
                    continue;
                }
                if (ind < (results.length - 1))
                    nextChain = f(chain.concat(post), ind + 1);
                else
                    nextChain = chain.concat(post);
                if (nextChain.length > 0)
                    break;
            }
            return nextChain;
        } else {
            if (1 == results.length)
                return [lastPost];
            return f(chain, ind + 1);
        }
    };
    return p.then(function() {
        if (results.length < 1)
            return {};
        return results[0].map(function(result) {
            return f(result);
        }).filter(function(chain) {
            return chain.length > 0;
        }).reduce(function(map, chain) {
            var post = chain[0];
            map[post.boardName + ":" + post.postNumber] = post;
            return map;
        }, {});
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
        var keys = Tools.toArray(c.map).slice(0, config("system.searchLimit", 100)).sort(function(p1, p2) {
            if (p1.boardName < p2.boardName)
                return -1;
            else if (p1.boardName > p2.boardName)
                return 1;
            if (p1.postNumber < p2.postNumber)
                return -1;
            else if (p1.postNumber > p2.postNumber)
                return 1;
            else
                return 0;
        }).map(function(post) {
            return post.boardName + ":" + post.postNumber;
        });
        if (keys.length < 1)
            return Promise.resolve([]);
        return db.hmget("posts", keys);
    }).then(function(posts) {
        return posts.filter(function(post, i) {
            return post;
        }).map(function(post) {
            return JSON.parse(post);
        });
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
        return removeReferencedPosts(boardName, postNumber, !silent);
    }).then(function() {
        return addReferencedPosts(c.post, referencedPosts, !silent);
    }).then(function() {
        if (silent)
            Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
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

var rebuildPostSearchIndex = function(boardName, postNumber) {
    var key = boardName + ":" + postNumber;
    console.log(`Rebuilding post search index: [${boardName}] ${postNumber}`);
    return getPost(boardName, postNumber).then(function(post) {
        return addPostToIndex({
            boardName: boardName,
            number: postNumber,
            rawText: post.rawText,
            subject: (post.subject || null)
        });
    });
};

var rebuildBoardSearchIndex = function(boardName, posts) {
    if (posts.length < 1)
        return Promise.resolve();
    var p = rebuildPostSearchIndex(boardName, posts[0]);
    for (var i = 1; i < posts.length; ++i) {
        (function(i) {
            p = p.then(function() {
                return rebuildPostSearchIndex(boardName, posts[i]);
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

module.exports.rebuildSearchIndex = function() {
    var posts = {};
    return db.keys("postSearchIndex:*").then(function(keys) {
        var p = (keys.length > 0) ? db.del(keys[0]) : Promise.resolve();
        keys.slice(1).forEach(function(key) {
            p = p.then(function() {
                return db.del(key);
            });
        });
        return p;
    }).then(function() {
        return db.hkeys("posts");
    }).then(function(keys) {
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
        if (postList.length < 1)
            return Promise.resolve();
        var p = rebuildBoardSearchIndex(postList[0].boardName, postList[0].posts);
        for (var i = 1; i < postList.length; ++i) {
            (function(i) {
                p = p.then(function() {
                    return rebuildBoardSearchIndex(postList[i].boardName, postList[i].posts);
                });
            })(i);
        }
        return p;
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
        if ((!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        c.post = post;
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
        if ((!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        c.post = post;
        return postFileInfoNames(post.boardName, post.number);
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
            accessLevel: req.level
        });
    }).then(function(text) {
        c.text = text;
        return board.postExtraData(req, fields, null, c.post)
    }).then(function(extraData) {
        c.extraData = extraData;
        return removePostFromIndex({
            boardName: c.post.boardName,
            number: c.post.number,
            rawText: c.post.rawText,
            subject: c.post.subject
        });
    }).then(function() {
        c.post.email = email || null;
        c.post.markup = markupModes;
        c.post.name = name || null;
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
        return addReferencedPosts(c.post, referencedPosts);
    }).then(function() {
        return addPostToIndex({
            boardName: board.name,
            number: c.post.number,
            rawText: rawText,
            subject: subject
        });
    }).then(function() {
        Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "edit");
        return Promise.resolve();
    });
};

module.exports.setThreadFixed = function(req, fields) {
    if (compareRegisteredUserLevels(req.level, "MODER") < 0)
        return Promise.reject(Tools.translate("Not enough rights"));
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
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
    if (compareRegisteredUserLevels(req.level, "MODER") < 0)
        return Promise.reject(Tools.translate("Not enough rights"));
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
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
    if (compareRegisteredUserLevels(req.level, "MODER") < 0)
        return Promise.reject(Tools.translate("Not enough rights"));
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
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
    var password = Tools.password(fields.password);
    var c = {};
    return controller.checkBan(req, res, board.name, true).then(function() {
        return getPost(board.name, postNumber);
    }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("Invalid post"));
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
        c.isThread = post.threadNumber == post.number;
        c.archived = ("true" == fields.archived);
        return (c.isThread) ? removeThread(board.name, postNumber, c.archived) : removePost(board.name, postNumber);
    }).then(function() {
        var p;
        if (c.archived) {
            p = Tools.removeFile(`${__dirname}/../public/${board.name}/arch/${postNumber}.json`);
        } else {
            p = c.isThread ? Global.generate(c.post.boardName, c.post.threadNumber, c.post.number, "delete")
                : Promise.resolve();
        }
        if (c.isThread) {
            if (c.archived)
                Global.removeFromCached([c.post.boardName, c.post.threadNumber, "archived"]);
            else
                Global.removeFromCached([c.post.boardName, c.post.threadNumber]);
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
    if (fields.boardName == fields.targetBoardName)
        return Promise.reject(Tools.translate("Source and target boards are the same"));
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    if (compareRegisteredUserLevels(req.level, RegisteredUserLevels.Moder) < 0)
        return Promise.reject(Tools.translate("Not enough rights"));
    var password = Tools.password(fields.password);
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
            && (compareRegisteredUserLevels(req.level, c.thread.user.level) <= 0)) {
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
        var promises = c.posts.map(function(post) {
            post.number = c.postNumberMap[post.number];
            post.threadNumber = c.thread.number;
            post.boardName = targetBoard.name;
            var referencedPosts = post.referencedPosts;
            referencedPosts.forEach(function(ref) {
                if (ref.boardName != sourceBoard.name)
                    return;
                var newPostNumber = c.postNumberMap[ref.postNumber];
                if (!newPostNumber)
                    return;
                ref.postNumber = newPostNumber;
                ref.threadNumber = c.thread.number;
            });
            delete post.referencedPosts;
            var extraData = post.extraData;
            delete post.extraData;
            delete post.referringPosts;
            var fileInfos = post.fileInfos;
            fileInfos.forEach(function(fileInfo) {
                fileInfo.boardName = targetBoard.name;
                fileInfo.postNumber = post.number;
            });
            delete post.fileInfos;
            if (post.rawText) {
                Tools.forIn(c.postNumberMap, function(newPostNumber, previousPostNumber) {
                    var rx = new RegExp(`>>/${sourceBoard.name}/${previousPostNumber}`, "g");
                    post.rawText = post.rawText.replace(rx, `>>/${targetBoard.name}/${newPostNumber}`);
                    rx = new RegExp(`>>${previousPostNumber}`, "g");
                    post.rawText = post.rawText.replace(rx, `>>${newPostNumber}`);
                });
            }
            return db.hset("posts", targetBoard.name + ":" + post.number, JSON.stringify(post)).then(function() {
                return targetBoard.storeExtraData(post.number, extraData);
            }).then(function() {
                return addReferencedPosts(post, referencedPosts);
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
                return addPostToIndex({
                    boardName: targetBoard.name,
                    number: post.number,
                    rawText: post.rawText,
                    subject: (post.subject || null)
                });
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.posts.map(function(post) {
            return rerenderPost(targetBoard.name, post.number, true);
        });
        return Promise.all(promises);
    }).then(function() {
        return db.hset("threads:" + targetBoard.name, c.thread.number, JSON.stringify(c.thread));
    }).then(function() {
        return db.hset("threadUpdateTimes:" + targetBoard.name, c.thread.number, Tools.now().toISOString());
    }).then(function() {
        return db.sadd("threadPostNumbers:" + targetBoard.name + ":" + c.thread.number, Tools.toArray(c.postNumberMap));
    }).then(function() {
        return removeThread(sourceBoard.name, threadNumber, false, true);
    }).then(function() {
        Global.generate(sourceBoard.name, threadNumber, threadNumber, "delete");
        Global.removeFromCached([sourceBoard.name, threadNumber]);
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
    var password = Tools.password(fields.password);
    var c = {};
    return db.hget("fileInfos", fileName).then(function(fileInfo) {
        if (!fileInfo)
            return Promise.reject(Tools.translate("No such file"));
        c.fileInfo = JSON.parse(fileInfo);
        return getPost(c.fileInfo.boardName, c.fileInfo.postNumber);
    }).then(function(post) {
        c.post = post;
        if ((!password || password != post.user.password)
            && (!req.hashpass || req.hashpass != post.user.hashpass)
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
            return Promise.reject(Tools.translate("Not enough rights"));
        }
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

module.exports.editAudioTags = function(req, res, fields) {
    var c = {};
    var password = Tools.password(fields.password);
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
            && (compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
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

module.exports.userBans = function(ip, boardNames) {
    if (!ip) {
        var users = {};
        return db.keys("userBans:*").then(function(keys) {
            var ips = {};
            keys.forEach(function(key) {
                var sl = key.split(":");
                var boardName = sl.pop();
                var ip = sl.slice(1, sl.length).join(":");
                if (!ips.hasOwnProperty(ip))
                    ips[ip] = {};
            });
            ips = Tools.mapIn(ips, function(_, key) {
                return key;
            });
            var p = Promise.resolve();
            ips.forEach(function(ip) {
                p = p.then(function() {
                    return module.exports.userBans(ip, boardNames);
                }).then(function(bans) {
                    users[ip] = bans;
                });
            });
            return p;
        }).then(function() {
            return Promise.resolve(users);
        });
    }
    var p = Promise.resolve();
    var bans = {};
    var address = Tools.correctAddress(ip);
    if (!boardNames)
        boardNames = Board.boardNames();
    else if (!Util.isArray(boardNames))
        boardNames = [boardNames];
    boardNames.forEach(function(boardName) {
        p = p.then(function() {
            return db.get("userBans:" + address + ":" + boardName);
        }).then(function(ban) {
            if (!ban)
                return Promise.resolve();
            bans[boardName] = JSON.parse(ban);
            return Promise.resolve();
        });
    });
    return p.then(function() {
        return Promise.resolve(bans);
    });
};

var updatePostBanInfo = function(boardName, ban) {
    return db.hget("posts", boardName + ":" + ban.postNumber).then(function(post) {
        if (!post)
            return Promise.resolve();
        if (Global.Generate)
            return Global.generate(boardName, JSON.parse(post).threadNumber, ban.postNumber, "edit");
        else
            return BoardModel.scheduleGenerate(boardName, JSON.parse(post).threadNumber, ban.postNumber, "edit");
    });
};

module.exports.banUser = function(req, ip, bans) {
    var address = Tools.correctAddress(ip);
    if (!address)
        return Promise.reject(Tools.translate("Invalid IP address"));
    if (address == req.ip)
        return Promise.reject(Tools.translate("Not enough rights"));
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
    return db.hget("registeredUserHashes", address).then(function(hash) {
        if (!hash)
            return Promise.resolve();
        return db.hget("registeredUsers", hash);
    }).then(function(user) {
        user = user ? JSON.parse(user) : null;
        if (user && compareRegisteredUserLevels(req.level, user.level) <= 0)
            return Promise.reject(Tools.translate("Not enough rights"));
        var date = Tools.now();
        bans = bans.reduce(function(acc, ban) {
            ban.createdAt = date;
            acc[ban.boardName] = ban;
            return acc;
        }, {});
        var p = Promise.resolve();
        Board.boardNames().forEach(function(boardName) {
            p = p.then(function() {
                var key = "userBans:" + address + ":" + boardName;
                var ban = bans[boardName];
                if (!ban) {
                    return db.get(key).then(function(banString) {
                        if (banString)
                            ban = JSON.parse(banString);
                        return db.del(key);
                    }).then(function() {
                        if (!ban || !ban.postNumber)
                            return Promise.resolve();
                        return updatePostBanInfo(boardName, ban);
                    });
                }
                return db.set(key, JSON.stringify(ban)).then(function() {
                    if (!ban.expiresAt)
                        return Promise.resolve();
                    var ttl = Math.ceil((+ban.expiresAt - +Tools.now()) / 1000);
                    if (ban.postNumber) {
                        setTimeout(function() {
                            updatePostBanInfo(boardName, ban).catch(function(err) {
                                Global.error(err.stack || err);
                            });
                        }, Math.ceil(ttl * Tools.Second * 1.002)); //NOTE: Adding extra delay
                    }
                    return db.expire(key, ttl);
                }).then(function() {
                    if (!ban.postNumber)
                        return Promise.resolve();
                    return updatePostBanInfo(boardName, ban);
                });
            });
        });
        return p;
    });
};

module.exports.delall = function(req, fields) {
    var address = Tools.correctAddress(fields.userIp);
    var boards = ("*" == fields.boardName) ? Board.boardNames().map(function(boardName) {
        return Board.board(boardName);
    }) : [Board.board(fields.boardName)];
    var err = boards.reduce(function(err, board) {
        if (err)
            return err;
        return !board;
    }, false);
    if (err)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!address)
        return Promise.reject(Tools.translate("Invalid IP address"));
    if (address == req.ip)
        return Promise.reject(Tools.translate("Not enough rights"));
    var posts = [];
    return db.hget("registeredUserHashes", address).then(function(hash) {
        if (!hash)
            return Promise.resolve();
        return db.hget("registeredUsers", hash);
    }).then(function(user) {
        user = user ? JSON.parse(user) : null;
        if (user && compareRegisteredUserLevels(req.level, user.level) <= 0)
            return Promise.reject(Tools.translate("Not enough rights"));
        var promises = boards.map(function(board) {
            return db.smembers("userPostNumbers:" + address + ":" + board.name).then(function(numbers) {
                return Promise.all(numbers.map(function(postNumber) {
                    return getPost(board.name, postNumber).then(function(post) {
                        posts.push(post);
                        return Promise.resolve();
                    });
                }));
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = posts.map(function(post) {
            return (post.threadNumber == post.number) ? removeThread(post.boardName, post.number)
                : removePost(post.boardName, post.number);
        });
    });
};

module.exports.initialize = function() {
    return module.exports.userBans().then(function(users) {
        var p = Promise.resolve();
        Tools.forIn(users, function(bans, ip) {
            Tools.forIn(bans, function(ban, boardName) {
                if (!ban.postNumber)
                    return;
                p = p.then(function() {
                    return db.ttl("userBans:" + ip + ":" + boardName);
                }).then(function(ttl) {
                    if (ttl <= 0)
                        return Promise.resolve();
                    setTimeout(function() {
                        updatePostBanInfo(boardName, ban).catch(function(err) {
                            Global.error(err.stack || err);
                        });
                    }, Math.ceil(ttl * Tools.Second * 1.002)); //NOTE: Adding extra delay
                    return Promise.resolve();
                });
            });
        });
    });
};
