var FS = require("q-io/fs");
var merge = require("merge");
var Util = require("util");

var Board = require("../boards");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var scheduledGeneratePages = {};
var lockedPages = {};
var readPages = {};
var pageCounts = {};
var lockedThreads = {};
var readThreads = {};

module.exports.getLastPostNumbers = function(boardNames) {
    if (!Util.isArray(boardNames))
        return Promise.resolve([]);
    var promises = boardNames.map(function(boardName) {
        return Database.lastPostNumber(boardName);
    });
    return Promise.all(promises);
};

module.exports.getPosts = function(posts, hashpass) {
    var c = {};
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        var promises = posts.map(function(post) {
            if (!post)
                return Promise.resolve(null);
            return Database.getPost(post.boardName, post.postNumber, {
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            });
        });
        return Promise.all(promises);
    }).then(function(posts) {
        return posts.filter(function(post) {
            if (!post)
                return true;
            if (!post.options.draft)
                return true;
            if (!post.user.hashpass)
                return true;
            if (post.user.hashpass == hashpass)
                return true;
            return Database.compareRegisteredUserLevels(post.user.level, c.level) < 0;
        });
    });
};

module.exports.getFileInfos = function(list, hashpass) {
    var promises = list.map(function(file) {
        return Database.getFileInfo(file).then(function(fileInfo) {
            var p;
            if (fileInfo) {
                p = Database.getPost(fileInfo.boardName, fileInfo.postNumber).then(function(post) {
                    if (!post.draft || !post.user.hashpass || post.user.hashpass == hashpass)
                        return Promise.resolve(fileInfo);
                    else
                        return Promise.resolve(null);
                });
            } else {
                p = Promise.resolve(null);
            }
            return p;
        });
    });
    return Promise.all(promises);
};

module.exports.getPage = function(board, hashpass, page, json, internal) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    page = +(page || 0);
    if (isNaN(page) || page < 0)
        return Promise.reject(404);
    if (json && !internal) {
        var list = lockedPages[board.name];
        var p;
        if (list) {
            p = new Promise(function(resolve, reject) {
                list.push(resolve);
            });
        } else {
            p = Promise.resolve();
        }
        var c = {};
        return p.then(function() {
            if (!readPages[board.name])
                readPages[board.name] = [];
            c.promise = new Promise(function(resolve, reject) {
                c.resolve = resolve;
            });
            readPages[board.name].push(c.promise);
            return FS.read(__dirname + "/../tmp/cache/page-" + board.name + "-" + page + ".json");
        }).then(function(data) {
            readPages[board.name].splice(readPages[board.name].indexOf(c.promise), 1);
            if (readPages[board.name].length < 1)
                delete readPages[board.name];
            c.resolve();
            return data;
        });
    }
    if (!json && !internal) {
        var model = { threads: [] };
        /*return module.exports.pageCount(board.name).then(function(pageCount) {
            model.pageCount = pageCount;*/
            return Database.lastPostNumber(board.name)
        /*})*/.then(function(lastPostNumber) {
            model.lastPostNumber = lastPostNumber;
            return Promise.resolve(model);
        });
    }
    var c = {};
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            filterFunction: function(thread) {
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(thread.user.level, c.level) < 0;
            }
        });
    }).then(function(threads) {
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        c.pageCount = Math.ceil(c.threads.length / board.threadsPerPage);
        if (!c.pageCount)
            c.pageCount = 1;
        if (page >= c.pageCount)
            return Promise.reject(404);
        if (!json)
            return Promise.resolve();
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
        if (!json)
            return Promise.resolve();
        var promises = c.threads.map(function(thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: board.maxLastPosts,
                reverse: true,
                withFileInfos: true,
                withReferences: true,
                withExtraData: true,
                filterFunction: function(post) {
                    if (post.number == thread.number)
                        return false;
                    if (!post.options.draft)
                        return true;
                    if (!post.user.hashpass)
                        return true;
                    if (post.user.hashpass == hashpass)
                        return true;
                    return Database.compareRegisteredUserLevels(post.user.level, c.level) < 0;
                }
            }).then(function(posts) {
                thread.lastPosts = posts;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        if (!json)
            return Promise.resolve();
        var promises = c.threads.map(function(thread) {
            return Database.threadPostCount(board.name, thread.number).then(function(postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        c.model = {
            threads: [],
            pageCount: c.pageCount
        };
        if (json) {
            c.threads.forEach(function(thread) {
                var threadModel = {
                    opPost: thread.opPost,
                    lastPosts: thread.lastPosts.reverse(),
                    postCount: thread.postCount,
                    bumpLimit: board.bumpLimit,
                    postLimit: board.postLimit,
                    bumpLimitReached: (thread.postCount >= board.bumpLimit),
                    postLimitReached: (thread.postCount >= board.postLimit),
                    closed: thread.closed,
                    fixed: thread.fixed,
                    postingEnabled: (board.postingEnabled && !thread.closed),
                    omittedPosts: ((thread.postCount > (board.maxLastPosts + 1))
                        ? (thread.postCount - board.maxLastPosts - 1) : 0)
                };
                c.model.threads.push(threadModel);
            });
        }
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getThread = function(board, hashpass, number, json) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject("Invalid thread");
    var c = {};
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            limit: 1,
            withPostNumbers: 1,
            filterFunction: function(thread) {
                if (thread.number != number)
                    return false;
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(thread.user.level, c.level) < 0;
            }
        });
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(404);
        c.thread = threads[0];
        if (!json)
            return Database.getPost(board.name, c.thread.number);
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true,
            filterFunction: function(post) {
                if (!post.options.draft)
                    return true;
                if (!post.user.hashpass)
                    return true;
                if (post.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(post.user.level, c.level) < 0;
            }
        });
    }).then(function(posts) {
        if (!json) {
            c.opPost = posts;
            return Database.threadPostCount(board.name, c.thread.number);
        }
        c.opPost = posts.splice(0, 1)[0];
        c.posts = posts;
        return Database.threadPostCount(board.name, c.thread.number);
    }).then(function(postCount) {
        c.model = {};
        var title = (c.opPost.subject || c.opPost.rawText || "").replace(/\r*\n+/gi, "");
        if (title.length > 50)
            title = title.substr(0, 47) + "...";
        var threadModel = {
            title: title || null,
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (postCount >= board.bumpLimit),
            postLimitReached: (postCount >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed),
            opPost: c.opPost
        };
        if (json)
            threadModel.lastPosts = c.posts;
        c.model.thread = threadModel;
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getLastPosts = function(board, hashpass, threadNumber, lastPostNumber) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    threadNumber = +(threadNumber || 0);
    if (isNaN(threadNumber) || threadNumber < 1)
        return Promise.reject("Invalid thread");
    lastPostNumber = +(lastPostNumber || 0);
    if (isNaN(lastPostNumber) || lastPostNumber < 0)
        lastPostNumber = 0;
    var c = {};
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            limit: 1,
            withPostNumbers: 1,
            filterFunction: function(thread) {
                if (thread.number != threadNumber)
                    return false;
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(thread.user.level, c.level) < 0;
            }
        });
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(404);
        c.thread = threads[0];
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true,
            filterFunction: function(post) {
                if (post.number <= lastPostNumber)
                    return false;
                if (!post.options.draft)
                    return true;
                if (!post.user.hashpass)
                    return true;
                if (post.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(post.user.level, c.level) < 0;
            }
        });
    });
};

module.exports.getThreadInfo = function(board, hashpass, number) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject("Invalid thread");
    var c = {};
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            limit: 1,
            filterFunction: function(thread) {
                if (thread.number != number)
                    return false;
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(thread.user.level, c.level) < 0;
            }
        });
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(404);
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
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed)
        };
        return Promise.resolve(threadModel);
    });
};

module.exports.getCatalog = function(board, hashpass, sortMode, json) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    var c = {};
    if (!json) {
        return Database.lastPostNumber(board.name).then(function(lastPostNumber) {
            return Promise.resolve({ lastPostNumber: lastPostNumber });
        });
    }
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            filterFunction: function(thread) {
                if (!thread.options.draft)
                    return true;
                if (!thread.user.hashpass)
                    return true;
                if (thread.user.hashpass == hashpass)
                    return true;
                return Database.compareRegisteredUserLevels(thread.user.level, c.level) < 0;
            }
        });
    }).then(function(threads) {
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
        c.model = { threads: [] };
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
        c.threads.sort(sortFunction);
        c.threads.forEach(function(thread) {
            var threadModel = {
                opPost: thread.opPost,
                postCount: thread.postCount,
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: (thread.postCount >= board.bumpLimit),
                postLimitReached: (thread.postCount >= board.postLimit),
                closed: thread.closed,
                fixed: thread.fixed,
                postingEnabled: (board.postingEnabled && !thread.closed)
            };
            c.model.threads.push(threadModel);
        });
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.pageCount = function(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    var c = {};
    return Database.getThreads(boardName, {
        filterFunction: function(thread) {
            return !thread.options.draft;
        }
    }).then(function(threads) {
        return Promise.resolve(Math.ceil(threads.length / board.threadsPerPage) || 1);
    });
};

var generateThread = function(boardName, threadNumber) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    var c = {};
    return module.exports.getThread(board, null, threadNumber, true).then(function(json) {
        c.posts = json.thread.lastPosts;
        delete json.thread.lastPosts;
        return FS.write(__dirname + "/../tmp/cache/thread-" + boardName + "-" + threadNumber + ".json",
            JSON.stringify(json));
    }).then(function() {
        return FS.write(__dirname + "/../tmp/cache/thread-posts-" + boardName + "-" + threadNumber + ".json",
            JSON.stringify(c.posts));
    });
};

var generateThreads = function(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    var c = {};
    return Database.getThreads(boardName, {
        filterFunction: function(thread) {
            return !thread.options.draft;
        }
    }).then(function(threads) {
        var p = (threads.length > 0) ? generateThread(boardName, threads[0].number) : Promise.resolve();
        threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return generateThread(boardName, thread.number);
            });
        });
        return p;
    });
};

var renderThread = function(board, thread) {
    var p = board.renderPost(thread.opPost, null, thread.opPost);
    thread.lastPosts.forEach(function(post) {
        p = p.then(function() {
            return board.renderPost(post, null, thread.opPost);
        });
    });
    return p;
};

var generatePage = function(boardName, page, accumulator) {
    var board = Board.board(boardName);
    return module.exports.getPage(board, null, page, true, true).then(function(json) {
        var path = __dirname + "/../tmp/cache/page-" + boardName + "-" + page + ".json";
        var p = (json.threads.length > 0) ? renderThread(board, json.threads[0]) : Promise.resolve();
        json.threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return renderThread(board, json.threads[0]);
            })
        });
        p.then(function() {
            var data = JSON.stringify(json);
            if (accumulator) {
                accumulator.push({
                    path: path,
                    data: data
                });
                return Promise.resolve();
            }
            return FS.write(path, data);
        });
    });
};

var generatePages = function(boardName, nowrite) {
    return module.exports.pageCount(boardName).then(function(pageCount) {
        pageCounts[boardName] = pageCount;
        var pageNumbers = [];
        for (var i = 0; i < pageCount; ++i)
            pageNumbers.push(i);
        var accumulator = nowrite ? [] : undefined;
        var p = (pageNumbers.length > 0) ? generatePage(boardName, pageNumbers[0], accumulator) : Promise.resolve();
        pageNumbers.slice(1).forEach(function(page) {
            p = p.then(function() {
                return generatePage(boardName, page, accumulator);
            });
        });
        return p.then(function() {
            return Promise.resolve(accumulator);
        });
    });
};

var generateBoard = function(boardName) {
    return generatePages(boardName).then(function() {
        return generateThreads(boardName);
    });
};

module.exports.scheduleGeneratePages = function(boardName) {
    if (scheduledGeneratePages[boardName])
        return Promise.resolve();
    scheduledGeneratePages[boardName] = setTimeout(function() {
        var c = {};
        generatePages(boardName, true).then(function(pages) {
            c.pages = pages;
            return Global.IPC.send("lockPages", boardName);
        }).then(function() {
            var p = (c.pages.length > 0) ? FS.write(c.pages[0].path, c.pages[0].data) : Promise.resolve();
            c.pages.slice(1).forEach(function(page) {
                p = p.then(function() {
                    return FS.write(page.path, page.data);
                });
            });
            return p;
        }).then(function() {
            return Global.IPC.send("unlockPages", boardName);
        }).then(function() {
            delete scheduledGeneratePages[boardName];
            return Promise.resolve();
        }).catch(function(err) {
            console.log(err.stack || err);
        });
    }, Tools.Second);
    return Promise.resolve();
};

module.exports.generate = function() {
    return module.exports.cleanup().then(function() {
        var boardNames = Board.boardNames();
        var p = (boardNames.length > 0) ? generateBoard(boardNames[0]) : Promise.resolve();
        boardNames.slice(1).forEach(function(boardName) {
            p = p.then(function(boarName) {
                return generateBoard(boardName);
            });
        });
        return p;
    });
};

module.exports.cleanup = function() {
    var path = __dirname + "/../tmp/cache";
    return FS.list(path).then(function(fileNames) {
        fileNames = fileNames.filter(function(fileName) {
            return ".gitignore" != fileName;
        }).map(function(fileName) {
            return path + "/" + fileName;
        });
        var p = (fileNames.length > 0) ? FS.remove(fileNames[0]) : Promise.resolve();
        fileNames.slice(1).forEach(function(fileName) {
            p = p.then(function() {
                return FS.remove(fileName);
            });
        });
        return p;
    });
};

module.exports.lockPages = function(boardName) {
    lockedPages[boardName] = [];
    return Promise.all(readPages[boardName] || []);
};

module.exports.unlockPages = function(boardName) {
    return Promise.all(lockedPages[boardName] || []).then(function() {
        delete lockedPages[boardName];
        return Promise.resolve();
    });
};

module.exports.lockThread = function(boardName, threadNumber) {
    var key = boardName + ":" + threadNumber;
    lockedThreads[key] = [];
    return Promise.all(readThreads[key] || []);
};

module.exports.unlockThread = function(boardName, threadNumber) {
    var key = boardName + ":" + threadNumber;
    return Promise.all(lockedThreads[key] || []).then(function() {
        delete lockedThreads[key];
        return Promise.resolve();
    });
};
