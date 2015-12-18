var FS = require("q-io/fs");
var FSSync = require("fs-ext");
var merge = require("merge");
var mkpath = require("mkpath");
var promisify = require("promisify-node");
var Util = require("util");

var Board = require("../boards");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var scheduledGeneratePages = {};
var scheduledGenerateThread = {};
var scheduledGenerateCatalog = {};
var pageCounts = {};
var deletedPosts = {};

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/cache-json");

var cachePath = function() {
    var args = [];
    Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
        args = args.concat(arg);
    });
    var path = args.join("-");
    return config("system.tmpPath", __dirname + "/../tmp") + "/cache-json" + (path ? ("/" + path + ".json") : "");
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
    var p = Database.getPost(posts[0].boardName, posts[0].postNumber, {
        withFileInfos: true,
        withReferences: true,
        withExtraData: true
    }).then(function(post) {
        c.posts.push(post);
    });
    posts.slice(1).forEach(function(post) {
        p = p.then(function() {
            return Database.getPost(post.boardName, post.postNumber, {
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            });
        }).then(function(post) {
            c.posts.push(post);
            return Promise.resolve();
        });
    });
    return p.then(function() {
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
    if (json)
        return Tools.readFile(cachePath("page", board.name, page), ifModifiedSince);
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
        c.model = {
            threads: [],
            pageCount: c.pageCount,
            currentPage: page
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
        return Database.lastPostNumber(board.name);
    }).then(function(lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        c.model.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
        return Promise.resolve(c.model);
    });
};

module.exports.getThreadPage = function(board, number, json, ifModifiedSince) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1)
        return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    if (json)
        return Tools.readFile(cachePath("thread", board.name, number), ifModifiedSince);
    return Database.getThread(board.name, number).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = thread;
        return Database.getPost(board.name, c.thread.number);
    }).then(function(post) {
        c.opPost = post;
        var postCount = c.thread.postNumbers.length;
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

module.exports.getLastPosts = function(board, hashpass, threadNumber, lastPostNumber) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    threadNumber = +(threadNumber || 0);
    if (isNaN(threadNumber) || threadNumber < 1)
        return Promise.reject(Tools.translate("Invalid thread"));
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
                return thread.number == threadNumber;
            }
        });
    }).then(function(threads) {
        if (threads.length != 1)
            return Promise.reject(Tools.translate("No such thread"));
        c.thread = threads[0];
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true,
            filterFunction: function(post) {
                return post.number > lastPostNumber;
            }
        });
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
    return Database.registeredUserLevel(hashpass).then(function(level) {
        c.level = level;
        return Database.getThreads(board.name, {
            limit: 1,
            filterFunction: function(thread) {
                return thread.number == number;
            }
        });
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
            postCount: postCount,
            postingEnabled: (board.postingEnabled && !c.thread.closed)
        };
        return Promise.resolve(threadModel);
    });
};

module.exports.getCatalogPage = function(board, sortMode, json, ifModifiedSince) {
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    if (json) {
        sortMode = (sortMode || "date").toLowerCase();
        if (["recent", "bumps"].indexOf(sortMode) < 0)
            sortMode = "date";
        return Tools.readFile(cachePath("catalog", sortMode, board.name), ifModifiedSince);
    }
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
        c.model.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
        return Promise.resolve(c.model);
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
    var p = Promise.resolve();
    if (thread.lastPosts) {
        thread.lastPosts.forEach(function(post) {
            p = p.then(function() {
                return board.renderPost(post, null, thread.opPost);
            });
        });
    }
    p = p.then(function() {
        return board.renderPost(thread.opPost, null, thread.opPost);
    });
    return p;
};

var generateThread = function(boardName, threadNumber, nowrite) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    var threadPath = cachePath("thread", boardName, threadNumber);
    return getThread(board, threadNumber).then(function(json) {
        c.json = json;
        return renderThread(board, c.json.thread);
    }).then(function() {
        if (nowrite)
            return Promise.resolve();
        return Tools.writeFile(threadPath, JSON.stringify(c.json));
    }).then(function() {
        if (nowrite) {
            return Promise.resolve({
                threadPath: threadPath,
                threadData: JSON.stringify(c.json),
            });
        }
        return Promise.resolve();
    });
};

var generateThreads = function(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board))
        return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(boardName).then(function(threads) {
        var p = (threads.length > 0) ? generateThread(boardName, threads[0].number) : Promise.resolve();
        threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return generateThread(boardName, thread.number);
            });
        });
        return p;
    });
};

var generatePage = function(boardName, page, accumulator) {
    var board = Board.board(boardName);
    return getPage(board, page).then(function(json) {
        var path = cachePath("page", boardName, page);
        var p = (json.threads.length > 0) ? renderThread(board, json.threads[0]) : Promise.resolve();
        json.threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return renderThread(board, thread);
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
            return Tools.writeFile(path, data);
        });
        return p;
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

var generateCatalog = function(boardName, nowrite) {
    var board = Board.board(boardName);
    var c = {};
    return getCatalog(board, "date").then(function(json) {
        var path = cachePath("catalog", "date", boardName);
        var p = (json.threads.length > 0) ? renderThread(board, json.threads[0]) : Promise.resolve();
        json.threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return renderThread(board, thread);
            })
        });
        p.then(function() {
            var data = JSON.stringify(json);
            if (nowrite) {
                c.datePath = path;
                c.dateData = data;
                return Promise.resolve();
            }
            return Tools.writeFile(path, data);
        });
        return p;
    }).then(function() {
        return getCatalog(board, "recent");
    }).then(function(json) {
        var path = cachePath("catalog", "recent", boardName);
        var p = (json.threads.length > 0) ? renderThread(board, json.threads[0]) : Promise.resolve();
        json.threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return renderThread(board, thread);
            })
        });
        p.then(function() {
            var data = JSON.stringify(json);
            if (nowrite) {
                c.recentPath = path;
                c.recentData = data;
                return Promise.resolve();
            }
            return Tools.writeFile(path, data);
        });
        return p;
    }).then(function() {
        return getCatalog(board, "bumps");
    }).then(function(json) {
        var path = cachePath("catalog", "bumps", boardName);
        var p = (json.threads.length > 0) ? renderThread(board, json.threads[0]) : Promise.resolve();
        json.threads.slice(1).forEach(function(thread) {
            p = p.then(function() {
                return renderThread(board, thread);
            })
        });
        return p.then(function() {
            var data = JSON.stringify(json);
            if (nowrite) {
                c.bumpsPath = path;
                c.bumpsData = data;
                return Promise.resolve(c);
            }
            return Tools.writeFile(path, data);
        });
    });
};

var generateBoard = function(boardName) {
    return generatePages(boardName).then(function() {
        return generateThreads(boardName);
    }).then(function() {
        return generateCatalog(boardName);
    });
};

var addTask = function(map, key, f, data) {
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
        return f(key, data).catch(function(err) {
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
                f(key, data).catch(function(err) {
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

module.exports.scheduleGenerateThread = function(boardName, threadNumber, postNumber, action) {
    var f = function(key, data) {
        if (!Util.isArray(data))
            data = [data];
        var boardName = data[0].boardName;
        var threadNumber = data[0].threadNumber;
        var scheduled = {};
        data.forEach(function(d) {
            if (!scheduled.hasOwnProperty(d.action))
                scheduled[d.action] = [];
            scheduled[d.action].push(d.postNumber);
        });
        var c = {};
        var creatingThread = false;
        var deletingThread = false;
        if (scheduled.create) {
            scheduled.create.forEach(function(postNumber) {
                if (postNumber == threadNumber)
                    creatingThread = true;
            });
        }
        if (scheduled.edit) {
            scheduled.edit.forEach(function(postNumber) {
                if (postNumber == threadNumber)
                    creatingThread = true;
            });
        }
        if (scheduled.delete) {
            scheduled.delete.forEach(function(postNumber) {
                if (postNumber == threadNumber)
                    deletingThread = true;
            });
        }
        scheduled.create = Tools.withoutDuplicates(scheduled.create);
        scheduled.edit = Tools.withoutDuplicates(scheduled.edit);
        scheduled.delete = Tools.withoutDuplicates(scheduled.delete);
        Tools.remove(scheduled.create, scheduled.delete, true);
        Tools.remove(scheduled.create, scheduled.edit);
        Tools.remove(scheduled.edit, scheduled.delete);
        var p;
        if (deletingThread) {
            deletedPosts[boardName + ":" + threadNumber] = {};
            p = Promise.resolve();
        } else if (creatingThread) {
            p = generateThread(boardName, threadNumber, true);
        } else if ((scheduled.delete && scheduled.delete.length) > 0 || (scheduled.edit && scheduled.edit.length)
            || (scheduled.create && scheduled.create.length > 0)) {
            if (scheduled.delete) {
                scheduled.delete.forEach(function(pn) {
                    deletedPosts[boardName + ":" + pn] = {};
                });
            }
            var posts = (scheduled.create || []).concat(scheduled.edit || []).sort(function(pn1, pn2) {
                pn1 = +pn1;
                pn2 = +pn2;
                if (pn1 < pn2)
                    return -1;
                else if (pn1 > pn2)
                    return 1;
                else
                    return 0;
            }).reduce(function(posts, postNumber) {
                return posts.concat({
                    boardName: boardName,
                    postNumber: postNumber
                });
            }, []);
            p = module.exports.getPosts(posts).then(function(posts) {
                c.posts = posts.filter(function(post) {
                    return post;
                });
                c.board = Board.board(boardName);
                if (!c.board)
                    return Promise.reject(Tools.translate("Invalid board"));
                return Database.getPost(boardName, threadNumber);
            }).then(function(opPost) {
                if (c.posts.length < 1)
                    return Promise.resolve([]);
                var pp = board.renderPost(c.posts[0], null, opPost);
                c.posts.slice(1).forEach(function(post) {
                    pp = pp.then(function() {
                        return board.renderPost(post, null, opPost);
                    })
                })
                return pp;
            }).then(function() {
                return Promise.resolve({
                    edited: c.posts,
                    deleted: scheduled.delete || []
                });
            });
        } else {
            p = Promise.resolve();
        }
        p = p.then(function(data) {
            c.data = data;
            return Promise.resolve();
        });
        if (deletingThread) {
            p = p.then(function() {
                return Tools.removeFile(cachePath("thread", boardName, threadNumber));
            });
        } else if (creatingThread) {
            p = p.then(function() {
                return Tools.writeFile(c.data.threadPath, c.data.threadData);
            });
        } else if ((scheduled.delete && scheduled.delete.length) > 0 || (scheduled.edit && scheduled.edit.length)
            || (scheduled.create && scheduled.create.length > 0)) {
            var threadPath = cachePath("thread", boardName, threadNumber);
            p = p.then(function() {
                return Tools.readFile(threadPath);
            }).then(function(data) {
                data = JSON.parse(data.data);
                var lastPosts = data.thread.lastPosts;
                var indexOfPost = function(post) {
                    for (var i = 0; i < lastPosts.length; ++i) {
                        if (lastPosts[i].number == (post.number || post))
                            return i;
                    }
                    return -1;
                };
                c.data.edited.forEach(function(post) {
                    var ind = indexOfPost(post);
                    if (ind >= 0)
                        lastPosts[ind] = post;
                    else
                        lastPosts.push(post);
                });
                c.data.deleted.forEach(function(postNumber) {
                    var ind = indexOfPost(postNumber);
                    if (ind >= 0)
                        lastPosts.splice(ind, 1);
                });
                return Tools.writeFile(threadPath, JSON.stringify(data));
            });
        } else {
            p = p.then(function() {
                return Promise.resolve();
            });
        }
        return p;
    };
    return addTask(scheduledGenerateThread, boardName + ":" + threadNumber, f, {
        boardName: boardName,
        threadNumber: threadNumber,
        postNumber: postNumber,
        action: action
    });
};

module.exports.scheduleGeneratePages = function(boardName) {
    var f = function(boardName) {
        var c = {};
        return generatePages(boardName, true).then(function(pages) {
            c.pages = pages;
            var p = (c.pages.length > 0) ? Tools.writeFile(c.pages[0].path, c.pages[0].data) : Promise.resolve();
            c.pages.slice(1).forEach(function(page) {
                p = p.then(function() {
                    return Tools.writeFile(page.path, page.data);
                });
            });
            return p;
        });
    };
    return addTask(scheduledGeneratePages, boardName, f);
};

module.exports.scheduleGenerateCatalog = function(boardName) {
    var f = function(boardName) {
        var c = {};
        return generateCatalog(boardName, true).then(function(catalog) {
            c.catalog = catalog;
            return Tools.writeFile(c.catalog.datePath, c.catalog.dateData);
        }).then(function() {
            Tools.writeFile(c.catalog.recentPath, c.catalog.recentData);
        }).then(function() {
            Tools.writeFile(c.catalog.bumpsPath, c.catalog.bumpsData);
        });
    };
    return addTask(scheduledGenerateCatalog, boardName, f);
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
                module.exports.scheduleGenerateCatalog(boardName);
                return Promise.resolve();
            });
        } else {
            p = p.then(function() {
                module.exports.scheduleGenerateThread(boardName, threadNumber, postNumber, action).then(function() {
                    return module.exports.scheduleGeneratePages(boardName);
                }).then(function() {
                    module.exports.scheduleGenerateCatalog(boardName);
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
                module.exports.scheduleGenerateCatalog(boardName);
            });
            return Promise.resolve();
        });
        break;
    }
    return p;
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
    var path = cachePath();
    return FS.list(path).then(function(fileNames) {
        fileNames = fileNames.filter(function(fileName) {
            return ".gitignore" != fileName;
        }).map(function(fileName) {
            return path + "/" + fileName;
        });
        var p = (fileNames.length > 0) ? Tools.removeFile(fileNames[0]) : Promise.resolve();
        fileNames.slice(1).forEach(function(fileName) {
            p = p.then(function() {
                return Tools.removeFile(fileName);
            });
        });
        return p;
    });
};

module.exports.initialize = function() {
    var promises = Board.boardNames().map(function(boardName) {
        return module.exports.pageCount(boardName).then(function(pageCount) {
            pageCounts[boardName] = pageCount;
            return Promise.resolve();
        });
    });
    return Promise.all(promises);
};
