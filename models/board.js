var merge = require("merge");
var Promise = require("promise");

var Board = require("../boards/board");
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var threadOrPostQuery = function(hashpass, level, extra) {
    var q = {
        $or: [
            {
                "options.draft": false
            }, {
                "user.hashpass": null
            }, {
                "user.hashpass": hashpass
            }, {
                "user.level": {
                    $lte: level
                }
            }
        ]
    };
    if (extra)
        q = merge.recursive(q, extra);
    return q;
};

module.exports.getPage = function(board, hashpass, page) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    page = +(page || 0);
    if (isNaN(page) || page < 0)
        return Promise.reject("Invalid page number");
    if (!Database.hasDrafts(board.name, hashpass)) {
        var cached = Cache.get("model/board/page/" + board.name + "/" + page);
        if (cached)
            return Promise.resolve(cached);
    }
    var c = {};
    return Database.moderOnBoard(hashpass, board.name).then(function(moderOnBoard) {
        c.moderOnBoard = moderOnBoard;
        return Database.registeredUserLevel(hashpass);
    }).then(function(level) {
        c.level = level;
        console.time("threads");
        var query = threadOrPostQuery(hashpass, level, {
            boardName: board.name,
            archived: false
        });
        return Database.threads.find(query);
    }).then(function(threads) {
        console.timeEnd("threads");
        console.log("threads length = " + threads.length);
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        c.pageCount = (c.threads.length / board.threadsPerPage)
            + ((c.threads.length % board.threadsPerPage) ? 1 : 0);
        if (!c.pageCount)
            c.pageCount = 1;
        if (page >= c.pageCount)
            return Promise.reject("Not found");
        c.threads = c.threads.slice(page * board.threadsPerPage, board.threadsPerPage);
        console.time("opPosts");
        var promises = c.threads.map(function(thread) {
            var collection = Database.db.collection("thread/" + thread.boardName + "/" + thread.number);
            return collection.findOne({ number: thread.number });
        });
        return Promise.all(promises);
    }).then(function(opPosts) {
        console.timeEnd("opPosts");
        console.log("opPosts length = " + opPosts.length);
        c.opPosts = opPosts;
        console.time("lastPosts");
        var promises = c.threads.map(function(thread, i) {
            var collection = Database.db.collection("thread/" + thread.boardName + "/" + thread.number);
            var query = threadOrPostQuery(hashpass, c.level, { number: { $ne: thread.number } });
            return collection.find(query).sort({ number: -1 }).limit(board.maxLastPosts).sort({ draft: -1 });
        });
        return Promise.all(promises);
    }).then(function(lastPosts) {
        console.timeEnd("lastPosts");
        console.log("lastPosts length = " + lastPosts.length);
        c.lastPosts = lastPosts;
        var promises = c.threads.map(function(thread) {
            return Database.db.collection("thread/" + thread.boardName + "/" + thread.number).count({});
        });
        return Promise.all(promises);
    }).then(function(counts) {
        c.model = {
            omittedPostsText: "Posts omitted:",
            threads: []
        };
        c.threads.forEach(function(thread, i) {
            var opPost = c.opPosts[i];
            opPost.threadNumber = thread.number;
            var lastPosts = c.lastPosts[i];
            var count = counts[i];
            var threadModel = {
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: (count >= board.bumpLimit),
                postLimitReached: (count >= board.postLimit),
                closed: thread.closed,
                fixed: thread.fixed,
                postCount: count,
                postingEnabled: (board.postingEnabled && !thread.closed),
                opPost: opPost,
                lastPosts: [],
                omittedPosts: ((count > board.maxLastPosts) ? (count - board.maxLastPosts) : 0)
            };
            if (lastPosts && lastPosts.length > 0)
                threadModel.lastPosts = lastPosts.reverse();
            c.model.threads.push(threadModel);
        });
        console.time("lastPostNumber");
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        console.timeEnd("lastPostNumber");
        console.log("last post number = " + lastPostNumber);
        c.model.lastPostNumber = lastPostNumber;
        if (!Database.hasDrafts(board.name, hashpass))
            Cache.set("model/board/page/" + board.name + "/" + page, c.model);
        return Promise.resolve(c.model);
    });
};

module.exports.getThread = function(board, hashpass, number) {
    if (!(board instanceof Board))
        return Promise.reject("Invalid board instance");
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject("Invalid thread number");
    if (!Database.hasDrafts(board.name, hashpass)) {
        var cached = Cache.get("model/board/thread/" + board.name + "/" + number);
        if (cached)
            return Promise.resolve(cached);
    }
    var c = {};
    return Database.moderOnBoard(hashpass, board.name).then(function(moderOnBoard) {
        c.moderOnBoard = moderOnBoard;
        return Database.registeredUserLevel(hashpass);
    }).then(function(level) {
        c.level = level;
        console.time("thread");
        var query = threadOrPostQuery(hashpass, level, {
            boardName: board.name,
            archived: false,
            number: number
        });
        return Database.threads.findOne(query);
    }).then(function(thread) {
        console.timeEnd("thread");
        c.thread = thread;
        console.time("posts");
        var collection = Database.db.collection("thread/" + c.thread.boardName + "/" + c.thread.number);
        var query = threadOrPostQuery(hashpass, c.level);
        return collection.find(query);
    }).then(function(posts) {
        console.timeEnd("posts");
        console.log("posts length = " + posts.length);
        c.opPost = posts.splice(0, 1)[0];
        c.posts = posts;
        return Database.db.collection("thread/" + c.thread.boardName + "/" + c.thread.number).count({});
    }).then(function(count) {
        c.model = {
            thread: c.thread
        };
        c.opPost.threadNumber = c.thread.number;
        c.opPost.sequenceNumber = 1;
        var posts = c.posts;
        var threadModel = {
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: (count >= board.bumpLimit),
            postLimitReached: (count >= board.postLimit),
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            postCount: count,
            postingEnabled: (board.postingEnabled && !c.thread.closed),
            opPost: c.opPost,
            posts: posts
        };
        c.model.thread = threadModel;
        console.time("lastPostNumber");
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        console.timeEnd("lastPostNumber");
        console.log("last post number = " + lastPostNumber);
        c.model.lastPostNumber = lastPostNumber;
        if (!Database.hasDrafts(board.name, hashpass))
            Cache.set("model/board/thread/" + board.name + "/" + number, c.model);
        return Promise.resolve(c.model);
    });
};
