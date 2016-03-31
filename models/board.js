var cluster = require("cluster");
var FS = require("q-io/fs");
var FSSync = require("fs-ext");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var promisify = require("promisify-node");
var Util = require("util");
var XML2JS = require("xml2js");

var Board = require("../boards");
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var scheduledGeneratePages = {};
var scheduledGenerateThread = {};
var scheduledGenerateCatalog = {};
var scheduledGenerateArchive = {};
var pageCounts = {};
var workerLoads = {};

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/cache-json");
mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/cache-rss");

var postSubject = function(post, maxLength) {
    var title = "";
    if (post.subject)
        title = post.subject;
    else if (post.text)
        title = Tools.plainText(post.text);
    title = title.replace(/\r*\n+/gi, "");
    maxLength = +maxLength;
    if (!isNaN(maxLength) && maxLength > 3 && title.length > maxLength)
        title = title.substr(0, maxLength - 3) + "...";
    return title;
};

module.exports.getLastPostNumbers = function(boardNames) {
    if (!Util.isArray(boardNames))
        return Promise.resolve([]);
    var promises = boardNames.map(function(boardName) {
        return Database.lastPostNumber(boardName);
    });
    return Promise.all(promises);
};

module.exports.getPosts = function(posts) {
    if (!posts || posts.length < 1)
        return Promise.resolve([]);
    var c = { posts: [] };
    return Tools.series(posts, function(post) {
        return Database.getPost(post.boardName, post.postNumber, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true
        }).then(function(post) {
            c.posts.push(post);
            return Promise.resolve();
        });
    }).then(function() {
        return Promise.resolve(c.posts);
    });
};

module.exports.getFileInfos = function(list, hashpass) {
    var promises = list.map(function(file) {
        return Database.getFileInfo(file);
    });
    return Promise.all(promises);
};

module.exports.getBoardPage = function(board, page, json, ifModifiedSince) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    page = +(page || 0);
    if (isNaN(page) || page < 0 || page >= pageCounts[board.name])
        return Promise.reject(Tools.translate("Invalid page number"));
    var model = {
        pageCount: pageCounts[board.name],
        currentPage: page,
        threads: []
    };
    return Database.lastPostNumber(board.name).then(function(lastPostNumber) {
        model.lastPostNumber = lastPostNumber;
        return Promise.resolve(model);
    });
};

var getPage = function(board, page) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    page = +(page || 0);
    if (isNaN(page) || page < 0 || page >= pageCounts[board.name])
        return Promise.reject(Tools.translate("Invalid page number"));
    var c = {};
    return Database.getThreads(board.name).then(function(threads) {
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        c.pageCount = pageCounts[board.name];
        if (page >= c.pageCount)
            return Promise.reject(Tools.translate("Invalid page number"));
        var start = page * board.threadsPerPage;
        c.threads = c.threads.slice(start, start + board.threadsPerPage);
        var promises = c.threads.map(function(thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: 1,
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            }).then(function(posts) {
                thread.opPost = posts[0];
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.threads.map(function(thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: board.maxLastPosts,
                reverse: true,
                withFileInfos: true,
                withReferences: true,
                withExtraData: true,
                filterFunction: function(post) {
                    return post.number != thread.number;
                }
            }).then(function(posts) {
                thread.lastPosts = posts;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.threads.map(function(thread) {
            return Database.threadPostCount(board.name, thread.number).then(function(postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var model = {
            pageCount: c.pageCount,
            currentPage: page
        };
        model.threads = c.threads.map(function(thread) {
            return {
                opPost: thread.opPost,
                lastPosts: thread.lastPosts.reverse(),
                postCount: thread.postCount,
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: (thread.postCount >= board.bumpLimit),
                postLimitReached: (thread.postCount >= board.postLimit),
                closed: thread.closed,
                fixed: thread.fixed,
                unbumpable: thread.unbumpable,
                postingEnabled: (board.postingEnabled && !thread.closed),
                omittedPosts: ((thread.postCount > (board.maxLastPosts + 1))
                    ? (thread.postCount - board.maxLastPosts - 1) : 0)
            };
        });
        return Promise.resolve(model);
    });
};

var getThreadPage = function(archived, board, number, json, ifModifiedSince) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThread(board.name, number, archived).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = thread;
        return Database.getPost(board.name, c.thread.number);
    }).then(function(post) {
        c.opPost = post;
        c.model = {};
        var postCount = c.thread.postNumbers.length;
        var threadModel = {
            title: postSubject(c.opPost, 50) || null,
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (postCount >= board.bumpLimit),
            postLimitReached: (postCount >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed)
        };
        c.model.thread = threadModel;
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

var getThread = function(board, number) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThreads(board.name, {
        limit: 1,
        withPostNumbers: 1,
        filterFunction: function(thread) {
            return thread.number == number;
        }
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = threads[0];
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true
        });
    }).then(function(posts) {
        c.opPost = posts.splice(0, 1)[0];
        c.posts = posts;
        return Database.threadPostCount(board.name, c.thread.number);
    }).then(function(postCount) {
        c.model = {};
        var threadModel = {
            title: postSubject(c.opPost, 50) || null,
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (postCount >= board.bumpLimit),
            postLimitReached: (postCount >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed),
            opPost: c.opPost,
            lastPosts: c.posts
        };
        c.model.thread = threadModel;
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getThreadLastPostNumber = function(boardName, threadNumber) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.resolve(0);
    threadNumber = +(threadNumber || 0);
    if (isNaN(threadNumber) || threadNumber < 1)
        return Promise.resolve(0);
    var c = {};
    return Database.db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function(numbers) {
        numbers = (numbers || []).map(function(pn) {
            return +pn;
        }).sort(function(pn1, pn2) {
            if (pn1 < pn2)
                return -1;
            else if (pn1 > pn2)
                return 1;
            else
                return 0;
        });
        return (numbers.length > 0) ? numbers[numbers.length - 1] : 0;
    });
};

module.exports.getThreadInfo = function(board, hashpass, number) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThreads(board.name, {
        limit: 1,
        filterFunction: function(thread) {
            return thread.number == number;
        }
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = threads[0];
        return Database.threadPostCount(board.name, c.thread.number);
    }).then(function(postCount) {
        var threadModel = {
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (postCount >= board.bumpLimit),
            postLimitReached: (postCount >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed)
        };
        return Promise.resolve(threadModel);
    });
};

module.exports.getCatalogPage = function(board, sortMode, json, ifModifiedSince) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    return Database.lastPostNumber(board.name).then(function(lastPostNumber) {
        return Promise.resolve({ lastPostNumber: lastPostNumber });
    });
};

var getCatalog = function(board, sortMode) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(board.name).then(function(threads) {
        c.threads = threads;
        var promises = c.threads.map(function(thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: 1,
                withFileInfos: true,
                withReferences: true
            }).then(function(posts) {
                thread.opPost = posts[0];
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var promises = c.threads.map(function(thread) {
            return Database.threadPostCount(board.name, thread.number).then(function(postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        var model = {};
        var sortFunction = Board.sortThreadsByCreationDate;
        switch ((sortMode || "date").toLowerCase()) {
        case "recent":
            sortFunction = Board.sortThreadsByDate;
            break;
        case "bumps":
            sortFunction = Board.sortThreadsByPostCount;
            break;
        default:
            break;
        }
        model.threads = c.threads.sort(sortFunction).map(function(thread) {
            return {
                opPost: thread.opPost,
                postCount: thread.postCount,
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: (thread.postCount >= board.bumpLimit),
                postLimitReached: (thread.postCount >= board.postLimit),
                closed: thread.closed,
                fixed: thread.fixed,
                unbumpable: thread.unbumpable,
                postingEnabled: (board.postingEnabled && !thread.closed)
            };
        });
        return Promise.resolve(model);
    });
};

module.exports.pageCount = function(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(boardName).then(function(threads) {
        return Promise.resolve(Math.ceil(threads.length / board.threadsPerPage) || 1);
    });
};

var renderThread = function(board, thread) {
    var p = board.renderPost(thread.opPost, null, thread.opPost);
    if (!thread.lastPosts)
        return p;
    return p.then(function() {
        return Tools.series(thread.lastPosts, function(post) {
            return board.renderPost(post, null, thread.opPost);
        });
    });
};

var generateThreadHTML = function(board, threadNumber, model, nowrite) {
    model.title = model.thread.title || (board.title + " — " + model.thread.number);
    model.isBoardPage = true;
    model.isThreadPage = true;
    model.board = controller.boardModel(board).board;
    model.extraScripts = board.extraScripts();
    model.extraStylesheets = board.extraStylesheets();
    model.tr = controller.translationsModel();
    model.threadNumber = model.thread.number;
    return board.postformRules().then(function(rules) {
        model.postformRules = rules;
        model.customPostHeaderPart = board.customPostHeaderPart() || {};
        model.customPostBodyPart = board.customPostBodyPart() || {};
        return controller("threadPage", model);
    }).then(function(data) {
        if (nowrite)
            return Promise.resolve(data);
        return Cache.setHTML(`thread-${board.name}-${threadNumber}`, data);
    });
};

module.exports.generateThreadHTML = generateThreadHTML;

var generateThread = function(boardName, threadNumber) {
    var board = Board.board(boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return getThread(board, threadNumber).then(function(model) {
        c.model = model;
        return renderThread(board, c.model.thread);
    }).then(function() {
        return Cache.setJSON(`thread-${boardName}-${threadNumber}`, JSON.stringify(c.model));
    }).then(function() {
        return generateThreadHTML(board, threadNumber, c.model);
    });
};

var generateThreads = function(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(boardName).then(function(threads) {
        return Tools.series(threads, function(thread) {
            return generateThread(boardName, thread.number);
        });
    });
};

var generatePage = function(boardName, pageNumber) {
    var board = Board.board(boardName);
    var c = {};
    return getPage(board, pageNumber).then(function(model) {
        c.model = model;
        return Tools.series(model.threads, function(thread) {
            return renderThread(board, thread);
        });
    }).then(function() {
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        c.model.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
        return Cache.setJSON(`page-${board.name}-${pageNumber}`, JSON.stringify(c.model));
    }).then(function() {
        c.model.title = board.title;
        c.model.isBoardPage = true;
        c.model.board = controller.boardModel(board).board;
        c.model.extraScripts = board.extraScripts();
        c.model.extraStylesheets = board.extraStylesheets();
        c.model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
        c.model.postformRules = rules;
        c.model.customPostHeaderPart = board.customPostHeaderPart() || {};
        c.model.customPostBodyPart = board.customPostBodyPart() || {};
        return controller("boardPage", c.model);
    }).then(function(data) {
        return Cache.setHTML(`page-${board.name}-${pageNumber}`, data);
    });
};

var generatePages = function(boardName) {
    return module.exports.pageCount(boardName).then(function(pageCount) {
        pageCounts[boardName] = pageCount;
        var pageNumbers = [];
        for (var i = 0; i < pageCount; ++i)
            pageNumbers.push(i);
        return Tools.series(pageNumbers, function(pageNumber) {
            return generatePage(boardName, pageNumber);
        });
    });
};

var generateCatalog = function(boardName) {
    var board = Board.board(boardName);
    return Tools.series(["date", "recent", "bumps"], function(sortMode) {
        var c = {};
        return getCatalog(board, sortMode).then(function(model) {
            c.model = model;
            return Tools.series(c.model.threads, function(thread) {
                return renderThread(board, thread);
            });
        }).then(function() {
            return Database.lastPostNumber(board.name);
        }).then(function(lastPostNumber) {
            c.model.lastPostNumber = lastPostNumber;
            c.model.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
            return Cache.setJSON(`catalog-${sortMode}-${board.name}`, JSON.stringify(c.model));
        }).then(function() {
            c.model.title = board.title;
            c.model.isBoardPage = true;
            c.model.board = controller.boardModel(board).board;
            c.model.sortMode = sortMode;
            c.model.tr = controller.translationsModel();
            return controller("catalogPage", c.model);
        }).then(function(data) {
            return Cache.setHTML(`catalog-${sortMode}-${board.name}`, data);
        });
    });
};

var generateArchive = function(boardName) {
    var board = Board.board(boardName);
    var model = {};
    var path = `${__dirname}/../public/${board.name}/arch`;
    return FS.exists(path).then(function(exists) {
        if (!exists)
            return Promise.resolve([]);
        return FS.list(path);
    }).then(function(fileNames) {
        var fileNames = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "json";
        });
        model.threads = [];
        return Tools.series(fileNames, function(fileName) {
            return FS.stat(path + "/" + fileName).then(function(stats) {
                model.threads.push({
                    boardName: board.name,
                    number: +fileName.split(".").shift(),
                    birthtime: stats.node.birthtime
                });
            });
        });
    }).then(function() {
        model.threads = model.threads.sort(function(t1, t2) {
            if (t1.birthtime > t2.birthtime)
                return -1;
            else if (t1.birthtime < t2.birthtime)
                return 1;
            else
                return 0;
        });
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        model.lastPostNumber = lastPostNumber;
        model.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
        return Cache.setJSON(`archive-${board.name}`, JSON.stringify(model));
    }).then(function() {
        model.title = board.title;
        model.board = controller.boardModel(board).board;
        model.tr = controller.translationsModel();
        return controller("archivePage", model);
    }).then(function(data) {
        return Cache.setHTML(`archive-${board.name}`, data);
    });
};

var generateBoard = function(boardName) {
    return generatePages(boardName).then(function() {
        return generateThreads(boardName);
    }).then(function() {
        return generateCatalog(boardName);
    }).then(function() {
        return generateArchive(boardName);
    });
};

var performTask = function(funcName, key, data) {
    var workerId = Object.keys(cluster.workers).map(function(id) {
        return {
            id: id,
            load: workerLoads[id] || 0
        };
    }).sort(function(w1, w2) {
        if (w1.load < w2.load)
            return -1;
        else if (w1.load > w2.load)
            return 1;
        else
            return 0;
    }).shift().id;
    if (!workerLoads.hasOwnProperty(workerId))
        workerLoads[workerId] = 1;
    else
        ++workerLoads[workerId];
    return Global.IPC.send("doGenerate", {
        funcName: funcName,
        key: key,
        data: data
    }, false, workerId).then(function(result) {
        --workerLoads[workerId];
        return Promise.resolve(result);
    }).catch(function(err) {
        --workerLoads[workerId];
        return Promise.reject(err);
    });
};

var addTask = function(map, key, funcName, data) {
    var scheduled = map[key];
    if (scheduled) {
        return new Promise(function(resolve, reject) {
            if (!scheduled.next)
                scheduled.next = [];
            scheduled.next.push({
                resolve: resolve,
                data: data
            });
        });
    } else {
        map[key] = {};
        return performTask(funcName, key, data).catch(function(err) {
            Global.error(err.stack || err);
        }).then(function() {
            var g = function() {
                var scheduled = map[key];
                var next = scheduled.next;
                if (!next || next.length < 1) {
                    delete map[key];
                    return Promise.resolve();
                }
                delete scheduled.next;
                var data = next.map(function(n) {
                    return n.data;
                });
                performTask(funcName, key, data).catch(function(err) {
                    Global.error(err.stack || err);
                }).then(function() {
                    g();
                    next.forEach(function(n) {
                        n.resolve();
                    });
                });
                return Promise.resolve();
            };
            return g();
        });
    };
};

module.exports.do_generateThread = function(key, data) {
    if (!Util.isArray(data))
        data = [data];
    var cre = false;
    var del = false;
    for (var i = 0; i < data.length; ++i) {
        if ("create" == data[i].action)
            cre = true;
        if ("delete" == data[i].action)
            del = true;
        if (cre && del)
            return Promise.resolve(); //NOTE: This should actually never happen
    }
    data = data.reduce(function(acc, d) {
        if (!acc)
            return d;
        if (d.action < acc.action)
            return d;
        return acc;
    });
    var boardName = data.boardName;
    var threadNumber = data.threadNumber;
    switch (data.action) {
    case "create": {
        return generateThread(boardName, threadNumber);
    }
    case "edit": {
        var c = {};
        var threadId = `thread-${boardName}-${threadNumber}`;
        var board = Board.board(boardName);
        if (!board)
            return Promise.reject(Tools.translate("Invalid board"));
        return Cache.getJSON(threadId).then(function(data) {
            c.thread = JSON.parse(data.data);
            c.lastPosts = c.thread.thread.lastPosts.reduce(function(acc, post) {
                acc[post.number] = post;
                return acc;
            }, {});
            return Database.threadPosts(boardName, threadNumber, {
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            });
        }).then(function(posts) {
            var opPost = posts[0];
            posts = posts.slice(1).reduce(function(acc, post) {
                acc[post.number] = post;
                return acc;
            }, {});
            var p = Promise.resolve();
            Tools.forIn(c.lastPosts, function(post, postNumber) {
                if (!posts.hasOwnProperty(postNumber))
                    return delete c.lastPosts[postNumber];
            });
            Tools.forIn(posts, function(post, postNumber) {
                var oldPost = c.lastPosts[postNumber];
                if (oldPost && oldPost.updatedAt >= post.updatedAt) {
                    var oldRefs = oldPost.referringPosts.reduce(function(acc, ref) {
                        return acc + ";" + ref.boardName + ":" + ref.postNumber;
                    }, "");
                    var newRefs = post.referringPosts.reduce(function(acc, ref) {
                        return acc + ";" + ref.boardName + ":" + ref.postNumber;
                    }, "");
                    var oldFileInfos = oldPost.fileInfos.reduce(function(acc, fileInfo) {
                        return acc + ";" + fileInfo.fileName + ":" + JSON.stringify(fileInfo.extraData);
                    }, "");
                    var newFileInfos = post.fileInfos.reduce(function(acc, fileInfo) {
                        return acc + ";" + fileInfo.fileName + ":" + JSON.stringify(fileInfo.extraData);
                    }, "");
                    if (oldPost.bannedFor === post.bannedFor && oldPost.text === post.text
                        && oldRefs == newRefs && oldFileInfos == newFileInfos) {
                        return;
                    }
                }
                p = p.then(function() {
                    return board.renderPost(post, null, opPost);
                }).then(function(renderedPost) {
                    c.lastPosts[postNumber] = renderedPost;
                    return Promise.resolve();
                });
            });
            return p;
        }).then(function() {
            c.thread.thread.lastPosts = Tools.toArray(c.lastPosts);
            return Cache.setJSON(threadId, JSON.stringify(c.thread));
        }).then(function() {
            return generateThreadHTML(board, threadNumber, c.thread);
        });
    }
    case "delete": {
        return Database.db.sadd("deletedThreads", data.boardName + ":" + data.threadNumber).then(function() {
            return Cache.removeJSON(`thread-${boardName}-${threadNumber}`);
        }).then(function() {
            return Cache.removeHTML(`thread-${boardName}-${threadNumber}`);
        });
    }
    default:
        break;
    }
    return Promise.reject("Invalid action");
};

module.exports.do_generatePages = function(boardName) {
    return generatePages(boardName);
};

module.exports.do_generateCatalog = function(boardName) {
    return generateCatalog(boardName);
};

module.exports.do_generateArchive = function(boardName) {
    return generateArchive(boardName);
};

module.exports.scheduleGenerateThread = function(boardName, threadNumber, postNumber, action) {
    return Database.db.sismember("deletedThreads", boardName + ":" + threadNumber).then(function(result) {
        if (result)
            return Promise.resolve();
        if (threadNumber == postNumber) {
            if ("edit" == action)
                action = "create";
        } else {
            action = "edit";
        }
        return addTask(scheduledGenerateThread, boardName + ":" + threadNumber, "generateThread", {
            boardName: boardName,
            threadNumber: threadNumber,
            action: action
        });
    });
};

module.exports.scheduleGeneratePages = function(boardName) {
    return addTask(scheduledGeneratePages, boardName, "generatePages");
};

module.exports.scheduleGenerateCatalog = function(boardName) {
    return addTask(scheduledGenerateCatalog, boardName, "generateCatalog");
};

module.exports.scheduleGenerateArchive = function(boardName) {
    return addTask(scheduledGenerateArchive, boardName, "generateArchive");
};

module.exports.scheduleGenerate = function(boardName, threadNumber, postNumber, action) {
    var p = Promise.resolve();
    switch (action) {
    case "create":
        p = p.then(function() {
            return module.exports.scheduleGenerateThread(boardName, threadNumber, postNumber, action);
        }).then(function() {
            module.exports.scheduleGeneratePages(boardName).then(function() {
                module.exports.scheduleGenerateCatalog(boardName);
            }).then(function() {
                module.exports.scheduleGenerateArchive(boardName);
            });
            return Promise.resolve();
        });
        break;
    case "edit":
    case "delete":
        if (threadNumber == postNumber) {
            p = p.then(function() {
                return module.exports.scheduleGenerateThread(boardName, threadNumber, postNumber, action);
            }).then(function() {
                return module.exports.scheduleGeneratePages(boardName);
            }).then(function() {
                module.exports.scheduleGenerateCatalog(boardName).then(function() {
                    module.exports.scheduleGenerateArchive(boardName);
                });
                return Promise.resolve();
            });
        } else {
            p = p.then(function() {
                module.exports.scheduleGenerateThread(boardName, threadNumber, postNumber, action).then(function() {
                    return module.exports.scheduleGeneratePages(boardName);
                }).then(function() {
                    module.exports.scheduleGenerateCatalog(boardName).then(function() {
                        module.exports.scheduleGenerateArchive(boardName);
                    });
                });
                return Promise.resolve();
            });
        }
        break;
    default:
        p = p.then(function() {
            module.exports.scheduleGenerateThread(boardName, threadNumber, postNumber, action).then(function() {
                return module.exports.scheduleGeneratePages(boardName);
            }).then(function() {
                module.exports.scheduleGenerateCatalog(boardName).then(function() {
                    module.exports.scheduleGenerateArchive(boardName);
                });
            });
            return Promise.resolve();
        });
        break;
    }
    return p;
};

module.exports.initialize = function() {
    return Tools.series(Board.boardNames(), function(boardName) {
        return module.exports.pageCount(boardName).then(function(pageCount) {
            pageCounts[boardName] = pageCount;
            return Promise.resolve();
        });
    }).then(function() {
        return Database.db.del("deletedThreads");
    });
};

module.exports.generateJSON = function() {
    var boardNames = Board.boardNames();
    return Tools.series(boardNames, generateBoard);
};

module.exports.generateRSS = function(currentProcess) {
    var site = {
        protocol: config("site.protocol", "http"),
        domain: config("site.domain", "localhost:8080"),
        pathPrefix: config("site.pathPrefix", ""),
        locale: config("site.locale", "en")
    };
    var rssPostCount = config("server.rss.postCount", 500);
    var postNumbers = {};
    Board.boardNames().forEach(function(boardName) {
        postNumbers[boardName] = [];
    });
    var feedTranslated = Tools.translate("Feed", "channelTitle");
    return Database.db.hkeys("posts").then(function(keys) {
        keys.forEach(function(key) {
            postNumbers[key.split(":").shift()].push(+key.split(":").pop());
        });
        return Tools.series(Board.boardNames(), function(boardName) {
            var board = Board.board(boardName);
            var title = feedTranslated + " " + site.domain + "/" + site.pathPrefix + boardName;
            var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName;
            var description = Tools.translate("Last posts from board", "channelDescription") + " /" + boardName + "/";
            var atomLink = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/rss.xml";
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
                    pubDate: moment(Tools.now()).utc().locale("en").format("ddd, DD MMM YYYY HH:mm:ss +0000"),
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
            var posts = [];
            return Tools.series(postNumbers[boardName].sort(function(pn1, pn2) {
                if (pn1 < pn2)
                    return 1;
                else if (pn1 > pn2)
                    return -1;
                else
                    return 0;
            }).slice(0, rssPostCount).reverse(), function(postNumber) {
                return Database.getPost(boardName, postNumber, { withFileInfos: true }).then(function(post) {
                    posts.push(post);
                    return Promise.resolve();
                });
            }).then(function() {
                doc.channel.item = posts.map(function(post) {
                    var title;
                    var isOp = post.number == post.threadNumber;
                    if (isOp)
                        title = "[" + Tools.translate("New thread", "itemTitle") + "]";
                    else
                        title = Tools.translate("Reply to thread", "itemTitle");
                    title += " ";
                    if (!isOp)
                        title += "\"";
                    title += postSubject(post, 150) || post.number;
                    if (!isOp)
                        title += "\"";
                    var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/res/"
                        + post.threadNumber + ".html";
                    var description = "\n" + post.fileInfos.map(function(fileInfo) {
                        if (!fileInfo)
                            return ""; //NOTE: Normally that should not happen
                        return "<img src=\"" + site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName
                            + "/thumb/" + fileInfo.thumb.name + "\"><br />";
                    }).join("\n") + (post.text || "") + "\n";
                    return {
                        title: title,
                        link: link,
                        description: description,
                        pubDate: moment(post.createdAt).utc().locale("en").format("ddd, DD MMM YYYY HH:mm:ss +0000"),
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
                return Cache.setRSS(boardName, builder.buildObject(doc));
            });
        });
    });
};
