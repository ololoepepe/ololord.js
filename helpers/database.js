"use strict";

var _board = require("../boards/board");

var _board2 = _interopRequireDefault(_board);

var _boards = require("../models/boards");

var BoardsModel = _interopRequireWildcard(_boards);

var _posts = require("../models/posts");

var PostsModel = _interopRequireWildcard(_posts);

var _users = require("../models/users");

var UsersModel = _interopRequireWildcard(_users);

var _ipc = require("../helpers/ipc");

var IPC = _interopRequireWildcard(_ipc);

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

var _clientFactory = require("../storage/client-factory");

var _clientFactory2 = _interopRequireDefault(_clientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var bigInt = require("big-integer");
var cluster = require("cluster");
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

var Cache = require("./cache");
var Captcha = require("../captchas/captcha");
var config = require("./config");
//var markup = require("./markup");
var Permissions = require("./permissions");
var Tools = require("./tools");

var Ratings = {};

var db = (0, _clientFactory2.default)();
var es = new Elasticsearch.Client({ host: config("system.elasticsearch.host", "localhost:9200") });

module.exports.db = db;
module.exports.es = es;

var hasNewPosts = new Set();

if (!cluster.isMaster) {
    setInterval(function () {
        var o = {};
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = hasNewPosts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var key = _step.value;

                o[key] = 1;
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        hasNewPosts.clear();
        if (!Tools.hasOwnProperties(o)) return;
        return IPC.send('notifyAboutNewPosts', o).then(function () {
            //Do nothing
        }).catch(function (err) {
            _logger2.default.error(err.stack || err);
        });
    }, Tools.Second);
}

db.tmp_hmget = db.hmget;
db.hmget = function (key, hashes) {
    if (!hashes || Util.isArray(hashes) && hashes.length <= 0) return Promise.resolve([]);
    return db.tmp_hmget.apply(db, arguments);
};

db.tmp_sadd = db.sadd;
db.sadd = function (key, members) {
    if (!members || Util.isArray(members) && members.length <= 0) return Promise.resolve(0);
    return db.tmp_sadd.apply(db, arguments);
};

db.tmp_srem = db.srem;
db.srem = function (key, members) {
    if (!members || Util.isArray(members) && members.length <= 0) return Promise.resolve(0);
    return db.tmp_srem.apply(db, arguments);
};

Ratings["SafeForWork"] = "SFW";
Ratings["Rating15"] = "R-15";
Ratings["Rating18"] = "R-18";
Ratings["Rating18G"] = "R-18G";

Object.defineProperty(module.exports, "Ratings", { value: Ratings });

var postFileInfoNames = function postFileInfoNames(boardName, postNumber) {
    return db.smembers("postFileInfoNames:" + boardName + ":" + postNumber).then(function (list) {
        if (!list) return Promise.resolve([]);
        return Promise.resolve(list.sort(function (a, b) {
            a = +a.split(".").shift();
            b = +b.split(".").shift();
            if (a < b) return -1;else if (a > b) return 1;else return 0;
        }));
    });
};

var createFileHash = function createFileHash(fileInfo) {
    return {
        name: fileInfo.name,
        thumb: { name: fileInfo.thumb.name },
        size: fileInfo.size,
        boardName: fileInfo.boardName,
        mimeType: fileInfo.mimeType,
        rating: fileInfo.rating
    };
};

var addFileHashes = function addFileHashes(fileInfos) {
    if (!fileInfos) return Promise.resolve();
    if (!Util.isArray(fileInfos)) fileInfos = [fileInfos];
    if (fileInfos.length < 1) return Promise.resolve();
    return Tools.series(fileInfos, function (fileInfo) {
        return db.sadd("fileHashes:" + fileInfo.hash, JSON.stringify(createFileHash(fileInfo)));
    });
};

var removeFileHashes = function removeFileHashes(fileInfos) {
    if (!fileInfos) return Promise.resolve();
    if (!Util.isArray(fileInfos)) fileInfos = [fileInfos];
    if (fileInfos.length < 1) return Promise.resolve();
    return Tools.series(fileInfos, function (fileInfo) {
        return db.srem("fileHashes:" + fileInfo.hash, JSON.stringify(createFileHash(fileInfo))).then(function () {
            return db.scard("fileHashes:" + fileInfo.hash);
        }).then(function (size) {
            if (size > 0) return Promise.resolve();
            return db.del("fileHashes:" + fileInfo.hash);
        });
    });
};

var rerenderReferringPosts = function rerenderReferringPosts(post, options) {
    return db.hgetall("referringPosts:" + post.boardName + ":" + post.number).then(function (referringPosts) {
        return Tools.series(referringPosts, function (ref) {
            ref = JSON.parse(ref);
            if (options && options.removingThread && ref.boardName == post.boardName && ref.threadNumber == post.threadNumber) {
                return Promise.resolve();
            }
            return rerenderPost(ref.boardName, ref.postNumber, true);
        });
    });
};

var removeReferencedPosts = function removeReferencedPosts(post, nogenerate) {
    var key = post.boardName + ":" + post.number;
    var c = {};
    return db.hgetall("referencedPosts:" + key).then(function (referencedPosts) {
        c.referencedPosts = {};
        var promises = [];
        Tools.forIn(referencedPosts, function (ref, refKey) {
            promises.push(db.hdel("referringPosts:" + refKey, key));
            ref = JSON.parse(ref);
            c.referencedPosts[refKey] = ref;
        });
        return Promise.all(promises);
    }).then(function () {
        if (!nogenerate) {
            Tools.forIn(c.referencedPosts, function (ref, refKey) {
                if (ref.boardName != post.boardName || ref.threadNumber != post.threadNumber) IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
            });
        }
        return db.del("referencedPosts:" + key);
    });
};

var addReferencedPosts = function addReferencedPosts(post, referencedPosts, nogenerate) {
    var key = post.boardName + ":" + post.number;
    var promises = [];
    Tools.forIn(referencedPosts, function (ref, refKey) {
        promises.push(db.hset("referencedPosts:" + key, refKey, JSON.stringify(ref)));
    });
    return Promise.all(promises).then(function () {
        if (!nogenerate) {
            Tools.forIn(referencedPosts, function (ref, refKey) {
                if (ref.boardName != post.boardName || ref.threadNumber != post.threadNumber) IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
            });
        }
        var promises = [];
        Tools.forIn(referencedPosts, function (ref, refKey) {
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

var removePost = function removePost(boardName, postNumber, options) {
    var board = _board2.default.board(boardName);
    if (!board) return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return db.sadd("postsPlannedForDeletion", boardName + ":" + postNumber).then(function () {
        return PostsModel.getPost(boardName, postNumber, { withReferences: true });
    }).then(function (post) {
        c.post = post;
        return db.srem("threadPostNumbers:" + boardName + ":" + post.threadNumber, postNumber);
    }).then(function () {
        return db.hdel("posts", boardName + ":" + postNumber);
    }).then(function () {
        if (options && options.leaveReferences) return Promise.resolve();
        return rerenderReferringPosts(c.post, { removingThread: options && options.removingThread });
    }).catch(function (err) {
        _logger2.default.error(err.stack || err);
    }).then(function () {
        if (options && options.leaveReferences) return Promise.resolve();
        return removeReferencedPosts(c.post);
    }).catch(function (err) {
        _logger2.default.error(err.stack || err);
    }).then(function () {
        return db.srem("userPostNumbers:" + c.post.user.ip + ":" + board.name, postNumber);
    }).then(function () {
        return postFileInfoNames(boardName, postNumber);
    }).then(function (names) {
        c.fileInfoNames = names;
        return Promise.all(names.map(function (name) {
            return db.hget("fileInfos", name);
        }));
    }).then(function (fileInfos) {
        if (options && options.leaveFileInfos) return Promise.resolve();
        c.fileInfos = [];
        c.paths = [];
        fileInfos.forEach(function (fileInfo) {
            if (!fileInfo) return;
            fileInfo = JSON.parse(fileInfo);
            c.fileInfos.push(fileInfo);
            c.paths.push(__dirname + "/../public/" + boardName + "/src/" + fileInfo.name);
            c.paths.push(__dirname + "/../public/" + boardName + "/thumb/" + fileInfo.thumb.name);
        });
        return db.del("postFileInfoNames:" + boardName + ":" + postNumber);
    }).then(function () {
        if (options && options.leaveFileInfos) return Promise.resolve();
        return Promise.all(c.fileInfoNames.map(function (name) {
            return db.hdel("fileInfos", name);
        }));
    }).then(function () {
        if (options && options.leaveFileInfos) return Promise.resolve();
        return removeFileHashes(c.fileInfos);
    }).then(function () {
        return board.removeExtraData(postNumber);
    }).then(function () {
        return es.delete({
            index: "ololord.js",
            type: "posts",
            id: boardName + ":" + postNumber
        });
    }).then(function () {
        if (!options || !options.leaveFileInfos) {
            c.paths.forEach(function (path) {
                return FS.remove(path).catch(function (err) {
                    _logger2.default.error(err.stack || err);
                });
            });
        }
        return db.srem("postsPlannedForDeletion", boardName + ":" + postNumber);
    });
};

module.exports.removePost = removePost;

var removeThread = function removeThread(boardName, threadNumber, options) {
    var key = (options && options.archived ? "archivedThreads:" : "threads:") + boardName;
    return db.sadd("threadsPlannedForDeletion", boardName + ":" + threadNumber).then(function () {
        return db.hdel(key, threadNumber);
    }).then(function () {
        return db.hdel("threadUpdateTimes:" + boardName, threadNumber);
    }).then(function () {
        setTimeout(function () {
            var c = {};
            db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function (result) {
                c.postNumbers = result;
                return db.del("threadPostNumbers:" + boardName + ":" + threadNumber);
            }).then(function () {
                return Tools.series(c.postNumbers, function (postNumber) {
                    return removePost(boardName, postNumber, {
                        leaveFileInfos: options && options.leaveFileInfos,
                        leaveReferences: options && options.leaveReferences,
                        removingThread: true
                    });
                });
            }).then(function () {
                return db.srem("threadsPlannedForDeletion", boardName + ":" + threadNumber);
            }).catch(function (err) {
                _logger2.default.error(err.stack || err);
            });
        }, 5000);
        return Promise.resolve();
    });
};

module.exports.removeThread = removeThread;

var rerenderPost = function rerenderPost(boardName, postNumber, silent) {
    var key = boardName + ":" + postNumber;
    var c = {};
    if (!silent) console.log("Rendering post: [" + boardName + "] " + postNumber);
    var referencedPosts = {};
    return PostsModel.getPost(boardName, postNumber).then(function (post) {
        c.post = post;
        return markup(c.post.boardName, c.post.rawText, {
            markupModes: c.post.markup,
            referencedPosts: referencedPosts,
            accessLevel: c.post.user.level
        });
    }).then(function (text) {
        c.post.text = text;
        return db.hset("posts", key, JSON.stringify(c.post));
    }).then(function () {
        return removeReferencedPosts(c.post, !silent);
    }).then(function () {
        return addReferencedPosts(c.post, referencedPosts, !silent);
    }).then(function () {
        if (silent) IPC.render(c.post.boardName, c.post.threadNumber, c.post.number, 'edit');
        return Promise.resolve();
    });
};

module.exports.setThreadFixed = function (req, fields) {
    var board = _board2.default.board(fields.boardName);
    if (!board) return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name)) return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0) return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function (thread) {
        if (!thread) return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var fixed = "true" == fields.fixed;
        if (thread.fixed == fixed) return Promise.resolve();
        thread.fixed = fixed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function () {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function () {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadClosed = function (req, fields) {
    var board = _board2.default.board(fields.boardName);
    if (!board) return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name)) return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0) return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function (thread) {
        if (!thread) return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var closed = "true" == fields.closed;
        if (thread.closed == closed) return Promise.resolve();
        thread.closed = closed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function () {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function () {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadUnbumpable = function (req, fields) {
    var board = _board2.default.board(fields.boardName);
    if (!board) return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name)) return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0) return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function (thread) {
        if (!thread) return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var unbumpable = "true" == fields.unbumpable;
        if (!!thread.unbumpable == unbumpable) return Promise.resolve();
        thread.unbumpable = unbumpable;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function () {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function () {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.delall = function (req, ip, boardNames) {
    ip = Tools.correctAddress(ip);
    if (!ip) return Promise.reject(Tools.translate("Invalid IP address"));
    if (ip == req.ip) return Promise.reject(Tools.translate("Not enough rights"));
    if (!boardNames || boardNames.length < 1) return Promise.reject(Tools.translate("No board specified"));
    var err = boardNames.some(function (boardName) {
        if (!_board2.default.board(boardName)) return true;
    }, false);
    if (err) return Promise.reject(Tools.translate("Invalid board"));
    err = boardNames.some(function (boardName) {
        if (!req.isModer(boardName)) return true;
    });
    if (err) return Promise.reject(Tools.translate("Not enough rights"));
    var deletedThreads = {};
    var updatedThreads = {};
    var deletedPosts = {};
    return UsersModel.getRegisteredUserLevelsByIp(ip).then(function (levels) {
        err = boardNames.some(function (boardName) {
            var level = req.level(boardName);
            if (!req.isSuperuser(boardName) && Tools.compareRegisteredUserLevels(level, levels[boardName]) <= 0) return true;
        });
        if (err) return Promise.reject(Tools.translate("Not enough rights"));
        return Tools.series(boardNames, function (boardName) {
            return db.smembers("userPostNumbers:" + ip + ":" + boardName).then(function (postNumbers) {
                return Tools.series(postNumbers, function (postNumber) {
                    return PostsModel.getPost(boardName, postNumber);
                }, true).then(function (posts) {
                    posts.forEach(function (post) {
                        if (post.threadNumber == post.number) {
                            deletedThreads[post.boardName + ":" + post.threadNumber] = {
                                boardName: post.boardName,
                                number: post.threadNumber
                            };
                        }
                    });
                    posts.forEach(function (post) {
                        var key = post.boardName + ":" + post.threadNumber;
                        if (deletedThreads.hasOwnProperty(key)) return;
                        updatedThreads[key] = {
                            boardName: post.boardName,
                            number: post.threadNumber
                        };
                        deletedPosts[post.boardName + ":" + post.number] = {
                            boardName: post.boardName,
                            number: post.number
                        };
                    });
                    return Promise.resolve();
                });
            });
        });
    }).then(function () {
        return Tools.series(deletedPosts, function (post) {
            return removePost(post.boardName, post.number);
        });
    }).then(function () {
        return Tools.series(deletedThreads, function (thread) {
            return removeThread(thread.boardName, thread.number);
        });
    }).then(function () {
        return Tools.series(updatedThreads, function (thread) {
            return IPC.render(thread.boardName, thread.number, thread.postNumber, 'edit');
        });
    }).then(function () {
        return Tools.series(deletedThreads, function (thread) {
            return IPC.render(thread.boardName, thread.number, thread.number, 'delete');
        });
    }).then(function () {
        return Promise.resolve();
    });
};
//# sourceMappingURL=database.js.map
