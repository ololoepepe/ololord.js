var merge = require("merge");

var Board = require("../boards/board");
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var FS = require("q-io/fs");
var Tools = require("../helpers/tools");

module.exports.getPage = function(board, hashpass, page) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    page = +(page || 0);
    if (isNaN(page) || page < 0)
        return Promise.reject("Invalid page number");
    var c = {};
    console.time("registeredUserLevel");
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        console.timeEnd("registeredUserLevel");
        console.time("threads");
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
        console.timeEnd("threads");
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        c.pageCount = Math.ceil(c.threads.length / board.threadsPerPage);
        if (!c.pageCount)
            c.pageCount = 1;
        if (page >= c.pageCount)
            return Promise.reject("Not found");
        var start = page * board.threadsPerPage;
        c.threads = c.threads.slice(start, start + board.threadsPerPage);
        console.time("threadOpPosts");
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
        console.timeEnd("threadOpPosts");
        console.time("threadLastPosts");
        var promises = c.threads.map(function(thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: board.maxLastPosts,
                reverse: true,
                withFileInfos: true,
                withReferences: true,
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
        console.timeEnd("threadLastPosts");
        console.time("threadPostCounts");
        var promises = c.threads.map(function(thread) {
            return Database.threadPostCount(board.name, thread.number).then(function(postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        console.timeEnd("threadPostCounts");
        c.model = {
            threads: [],
            pageCount: c.pageCount
        };
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
        console.time("lastPostNumber");
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        console.timeEnd("lastPostNumber");
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getThread = function(board, hashpass, number) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject("Invalid thread number");
    var c = {};
    console.time("registeredUserLevel");
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        console.timeEnd("registeredUserLevel");
        console.time("thread");
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
        console.timeEnd("thread");
        if (threads.length != 1)
            return Promise.reject("No such thread");
        c.thread = threads[0];
        console.time("posts");
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
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
        console.timeEnd("posts");
        c.opPost = posts.splice(0, 1)[0];
        c.posts = posts;
        console.time("threadPostCount");
        return Database.threadPostCount(board.name, c.thread.number);
    }).then(function(postCount) {
        console.time("threadPostCount");
        c.model = {};
        var threadModel = {
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (postCount >= board.bumpLimit),
            postLimitReached: (postCount >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed),
            opPost: c.opPost,
            posts: c.posts
        };
        c.model.thread = threadModel;
        console.time("lastPostNumber");
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        console.timeEnd("lastPostNumber");
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getCatalog = function(board, hashpass, sortMode) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    var c = {};
    console.time("registeredUserLevel");
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        console.timeEnd("registeredUserLevel");
        console.time("threads");
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
        console.timeEnd("threads");
        c.threads = threads;
        console.time("threadOpPosts");
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
        console.timeEnd("threadOpPosts");
        console.time("threadPostCounts");
        var promises = c.threads.map(function(thread) {
            return Database.threadPostCount(board.name, thread.number).then(function(postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        console.timeEnd("threadPostCounts");
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
        console.time("lastPostNumber");
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        console.timeEnd("lastPostNumber");
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });;
};
