'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.generateArchive = exports.generate = exports.getLastPostNumbers = exports.getLastPostNumber = exports.scheduleGenerate = exports.scheduleGenerateArchive = exports.scheduleGenerateCatalog = exports.scheduleGeneratePages = exports.scheduleGenerateThread = undefined;

var scheduleGenerateThread = exports.scheduleGenerateThread = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber, postNumber, action) {
        var key, result;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        key = boardName + ':' + threadNumber;
                        _context.next = 3;
                        return Database.db.sismember('deletedThreads', key);

                    case 3:
                        result = _context.sent;

                        if (!result) {
                            _context.next = 6;
                            break;
                        }

                        return _context.abrupt('return');

                    case 6:
                        if (threadNumber === postNumber) {
                            if ('edit' === action) {
                                action = 'create';
                            }
                        } else {
                            action = 'edit';
                        }
                        _context.next = 9;
                        return addTask(scheduledGenerateThread, key, 'generateThread', {
                            boardName: boardName,
                            threadNumber: threadNumber,
                            action: action
                        });

                    case 9:
                        return _context.abrupt('return', _context.sent);

                    case 10:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function scheduleGenerateThread(_x, _x2, _x3, _x4) {
        return ref.apply(this, arguments);
    };
}();

var scheduleGeneratePages = exports.scheduleGeneratePages = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.next = 2;
                        return addTask(scheduledGeneratePages, boardName, 'generatePages');

                    case 2:
                        return _context2.abrupt('return', _context2.sent);

                    case 3:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function scheduleGeneratePages(_x5) {
        return ref.apply(this, arguments);
    };
}();

var scheduleGenerateCatalog = exports.scheduleGenerateCatalog = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        _context3.next = 2;
                        return addTask(scheduledGenerateCatalog, boardName, 'generateCatalog');

                    case 2:
                        return _context3.abrupt('return', _context3.sent);

                    case 3:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function scheduleGenerateCatalog(_x6) {
        return ref.apply(this, arguments);
    };
}();

var scheduleGenerateArchive = exports.scheduleGenerateArchive = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.next = 2;
                        return addTask(scheduledGenerateArchive, boardName, 'generateArchive');

                    case 2:
                        return _context4.abrupt('return', _context4.sent);

                    case 3:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this);
    }));

    return function scheduleGenerateArchive(_x7) {
        return ref.apply(this, arguments);
    };
}();

var scheduleGenerate = exports.scheduleGenerate = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, threadNumber, postNumber, action) {
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
            while (1) {
                switch (_context11.prev = _context11.next) {
                    case 0:
                        _context11.t0 = action;
                        _context11.next = _context11.t0 === 'create' ? 3 : _context11.t0 === 'edit' ? 7 : _context11.t0 === 'delete' ? 7 : 17;
                        break;

                    case 3:
                        _context11.next = 5;
                        return scheduleGenerateThread(boardName, threadNumber, postNumber, action);

                    case 5:
                        _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
                            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                while (1) {
                                    switch (_context5.prev = _context5.next) {
                                        case 0:
                                            _context5.next = 2;
                                            return scheduleGeneratePages(boardName);

                                        case 2:
                                            _context5.next = 4;
                                            return scheduleGenerateCatalog(boardName);

                                        case 4:
                                            _context5.next = 6;
                                            return scheduleGenerateArchive(boardName);

                                        case 6:
                                        case 'end':
                                            return _context5.stop();
                                    }
                                }
                            }, _callee5, this);
                        }))();
                        return _context11.abrupt('break', 19);

                    case 7:
                        if (!(threadNumber === postNumber)) {
                            _context11.next = 15;
                            break;
                        }

                        _context11.next = 10;
                        return scheduleGenerateThread(boardName, threadNumber, postNumber, action);

                    case 10:
                        _context11.next = 12;
                        return scheduleGeneratePages(boardName);

                    case 12:
                        _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
                            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                                while (1) {
                                    switch (_context6.prev = _context6.next) {
                                        case 0:
                                            _context6.next = 2;
                                            return scheduleGenerateCatalog(boardName);

                                        case 2:
                                            _context6.next = 4;
                                            return scheduleGenerateArchive(boardName);

                                        case 4:
                                        case 'end':
                                            return _context6.stop();
                                    }
                                }
                            }, _callee6, this);
                        }))();
                        _context11.next = 16;
                        break;

                    case 15:
                        _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
                            return regeneratorRuntime.wrap(function _callee8$(_context8) {
                                while (1) {
                                    switch (_context8.prev = _context8.next) {
                                        case 0:
                                            _context8.next = 2;
                                            return scheduleGenerateThread(boardName, threadNumber, postNumber, action);

                                        case 2:
                                            _context8.next = 4;
                                            return scheduleGeneratePages(boardName);

                                        case 4:
                                            _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
                                                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                                                    while (1) {
                                                        switch (_context7.prev = _context7.next) {
                                                            case 0:
                                                                _context7.next = 2;
                                                                return scheduleGenerateCatalog(boardName);

                                                            case 2:
                                                                _context7.next = 4;
                                                                return scheduleGenerateArchive(boardName);

                                                            case 4:
                                                            case 'end':
                                                                return _context7.stop();
                                                        }
                                                    }
                                                }, _callee7, this);
                                            }))();

                                        case 5:
                                        case 'end':
                                            return _context8.stop();
                                    }
                                }
                            }, _callee8, this);
                        }))();

                    case 16:
                        return _context11.abrupt('break', 19);

                    case 17:
                        _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
                            return regeneratorRuntime.wrap(function _callee10$(_context10) {
                                while (1) {
                                    switch (_context10.prev = _context10.next) {
                                        case 0:
                                            _context10.next = 2;
                                            return scheduleGenerateThread(boardName, threadNumber, postNumber, action);

                                        case 2:
                                            _context10.next = 4;
                                            return scheduleGeneratePages(boardName);

                                        case 4:
                                            _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
                                                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                                                    while (1) {
                                                        switch (_context9.prev = _context9.next) {
                                                            case 0:
                                                                _context9.next = 2;
                                                                return scheduleGenerateCatalog(boardName);

                                                            case 2:
                                                                _context9.next = 4;
                                                                return scheduleGenerateArchive(boardName);

                                                            case 4:
                                                            case 'end':
                                                                return _context9.stop();
                                                        }
                                                    }
                                                }, _callee9, this);
                                            }))();

                                        case 5:
                                        case 'end':
                                            return _context10.stop();
                                    }
                                }
                            }, _callee10, this);
                        }));
                        return _context11.abrupt('break', 19);

                    case 19:
                    case 'end':
                        return _context11.stop();
                }
            }
        }, _callee11, this);
    }));

    return function scheduleGenerate(_x8, _x9, _x10, _x11) {
        return ref.apply(this, arguments);
    };
}();

var getLastPostNumber = exports.getLastPostNumber = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName) {
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
            while (1) {
                switch (_context12.prev = _context12.next) {
                    case 0:
                        if (Board.board(boardName)) {
                            _context12.next = 2;
                            break;
                        }

                        return _context12.abrupt('return', Promise.reject(Tools.translate('Invalid boardName')));

                    case 2:
                        _context12.next = 4;
                        return PostCounters.getOne(boardName);

                    case 4:
                        return _context12.abrupt('return', _context12.sent);

                    case 5:
                    case 'end':
                        return _context12.stop();
                }
            }
        }, _callee12, this);
    }));

    return function getLastPostNumber(_x12) {
        return ref.apply(this, arguments);
    };
}();

var getLastPostNumbers = exports.getLastPostNumbers = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(boardNames) {
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
            while (1) {
                switch (_context13.prev = _context13.next) {
                    case 0:
                        if (!(0, _underscore2.default)(boardNames), isArray()) {
                            boardNames = [boardNames];
                        }

                        if (!boardNames.some(function (boardName) {
                            return !Board.board(boardName);
                        })) {
                            _context13.next = 3;
                            break;
                        }

                        return _context13.abrupt('return', Promise.reject(Tools.translate('Invalid boardName')));

                    case 3:
                        _context13.next = 5;
                        return PostCounters.getSome(boardNames);

                    case 5:
                        return _context13.abrupt('return', _context13.sent);

                    case 6:
                    case 'end':
                        return _context13.stop();
                }
            }
        }, _callee13, this);
    }));

    return function getLastPostNumbers(_x13) {
        return ref.apply(this, arguments);
    };
}();

var generate = exports.generate = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName, threadNumber, postNumber, action) {
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
            while (1) {
                switch (_context14.prev = _context14.next) {
                    case 0:
                        _context14.prev = 0;

                        if (!_cluster2.default.isMaster) {
                            _context14.next = 6;
                            break;
                        }

                        _context14.next = 4;
                        return scheduleGenerate(boardName, threadNumber, postNumber, action);

                    case 4:
                        _context14.next = 8;
                        break;

                    case 6:
                        _context14.next = 8;
                        return IPC.send('generate', {
                            boardName: boardName,
                            threadNumber: threadNumber,
                            postNumber: postNumber,
                            action: action
                        });

                    case 8:
                        _context14.next = 13;
                        break;

                    case 10:
                        _context14.prev = 10;
                        _context14.t0 = _context14['catch'](0);

                        _logger2.default.error(_context14.t0.stack || _context14.t0);

                    case 13:
                    case 'end':
                        return _context14.stop();
                }
            }
        }, _callee14, this, [[0, 10]]);
    }));

    return function generate(_x14, _x15, _x16, _x17) {
        return ref.apply(this, arguments);
    };
}();

var generateArchive = exports.generateArchive = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName) {
        return regeneratorRuntime.wrap(function _callee15$(_context15) {
            while (1) {
                switch (_context15.prev = _context15.next) {
                    case 0:
                        _context15.prev = 0;

                        if (!_cluster2.default.isMaster) {
                            _context15.next = 5;
                            break;
                        }

                        return _context15.abrupt('return', scheduleGenerateArchive(boardName));

                    case 5:
                        _context15.next = 7;
                        return IPC.send('generateArchive', boardName);

                    case 7:
                        _context15.next = 12;
                        break;

                    case 9:
                        _context15.prev = 9;
                        _context15.t0 = _context15['catch'](0);

                        _logger2.default.error(_context15.t0.stack || _context15.t0);

                    case 12:
                    case 'end':
                        return _context15.stop();
                }
            }
        }, _callee15, this, [[0, 9]]);
    }));

    return function generateArchive(_x18) {
        return ref.apply(this, arguments);
    };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _misc = require('./misc');

var MiscModel = _interopRequireWildcard(_misc);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var FS = require("q-io/fs");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var promisify = require("promisify-node");
var Util = require("util");
var XML2JS = require("xml2js");

var Board = require("../boards/board");
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var scheduledGeneratePages = {};
var scheduledGenerateThread = {};
var scheduledGenerateCatalog = {};
var scheduledGenerateArchive = {};
var pageCounts = {};
var workerLoads = {};

var PostCounters = new _hash2.default((0, _clientFactory2.default)(), 'postCounters', {
    parse: function parse(number) {
        return +number;
    },
    stringify: function stringify(number) {
        return number.toString();
    }
});

var postSubject = function postSubject(post, maxLength) {
    var title = "";
    if (post.subject) title = post.subject;else if (post.text) title = Tools.plainText(post.text);
    title = title.replace(/\r*\n+/gi, "");
    maxLength = +maxLength;
    if (!isNaN(maxLength) && maxLength > 3 && title.length > maxLength) title = title.substr(0, maxLength - 3) + "...";
    return title;
};

module.exports.getLastPostNumbers = function (boardNames) {
    if (!Util.isArray(boardNames)) return Promise.resolve([]);
    var promises = boardNames.map(function (boardName) {
        return Database.lastPostNumber(boardName);
    });
    return Promise.all(promises);
};

module.exports.getPosts = function (posts) {
    if (!posts || posts.length < 1) return Promise.resolve([]);
    return Tools.series(posts, function (post) {
        return Database.getPost(post.boardName, post.postNumber, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true
        });
    }, true);
};

module.exports.getFileInfos = function (list, hashpass) {
    var promises = list.map(function (file) {
        return Database.getFileInfo(file);
    });
    return Promise.all(promises);
};

module.exports.getBoardPage = function (board, page, json, ifModifiedSince) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    page = +(page || 0);
    if (isNaN(page) || page < 0 || page >= pageCounts[board.name]) return Promise.reject(Tools.translate("Invalid page number"));
    var model = {
        pageCount: pageCounts[board.name],
        currentPage: page,
        threads: []
    };
    return Database.lastPostNumber(board.name).then(function (lastPostNumber) {
        model.lastPostNumber = lastPostNumber;
        return Promise.resolve(model);
    });
};

var getPage = function getPage(board, page) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    page = +(page || 0);
    if (isNaN(page) || page < 0 || page >= pageCounts[board.name]) return Promise.reject(Tools.translate("Invalid page number"));
    var c = {};
    return Database.getThreads(board.name).then(function (threads) {
        c.threads = threads;
        c.threads.sort(Board.sortThreadsByDate);
        c.pageCount = pageCounts[board.name];
        if (page >= c.pageCount) return Promise.reject(Tools.translate("Invalid page number"));
        var start = page * board.threadsPerPage;
        c.threads = c.threads.slice(start, start + board.threadsPerPage);
        var promises = c.threads.map(function (thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: 1,
                withFileInfos: true,
                withReferences: true,
                withExtraData: true
            }).then(function (posts) {
                thread.opPost = posts[0];
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function () {
        var promises = c.threads.map(function (thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: board.maxLastPosts,
                reverse: true,
                withFileInfos: true,
                withReferences: true,
                withExtraData: true,
                filterFunction: function filterFunction(post) {
                    return post.number != thread.number;
                }
            }).then(function (posts) {
                thread.lastPosts = posts;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function () {
        var promises = c.threads.map(function (thread) {
            return Database.threadPostCount(board.name, thread.number).then(function (postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function () {
        var model = {
            pageCount: c.pageCount,
            currentPage: page
        };
        model.threads = c.threads.map(function (thread) {
            return {
                opPost: thread.opPost,
                lastPosts: thread.lastPosts.reverse(),
                postCount: thread.postCount,
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: thread.postCount >= board.bumpLimit,
                postLimitReached: thread.postCount >= board.postLimit,
                closed: thread.closed,
                fixed: thread.fixed,
                unbumpable: thread.unbumpable,
                postingEnabled: board.postingEnabled && !thread.closed,
                omittedPosts: thread.postCount > board.maxLastPosts + 1 ? thread.postCount - board.maxLastPosts - 1 : 0
            };
        });
        return Promise.resolve(model);
    });
};

var getThreadPage = function getThreadPage(archived, board, number, json, ifModifiedSince) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1) return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThread(board.name, number, archived).then(function (thread) {
        if (!thread) return Promise.reject(Tools.translate("No such thread"));
        c.thread = thread;
        return Database.getPost(board.name, c.thread.number);
    }).then(function (post) {
        c.opPost = post;
        c.model = {};
        var postCount = c.thread.postNumbers.length;
        var threadModel = {
            title: postSubject(c.opPost, 50) || null,
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: postCount >= board.bumpLimit,
            postLimitReached: postCount >= board.postLimit,
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: board.postingEnabled && !c.thread.closed
        };
        c.model.thread = threadModel;
        return Database.lastPostNumber(board.name);
    }).then(function (lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

var getThread = function getThread(board, number, archived) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1) return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThreads(board.name, {
        limit: 1,
        withPostNumbers: 1,
        filterFunction: function filterFunction(thread) {
            return thread.number == number;
        },
        archived: !!archived
    }).then(function (threads) {
        if (threads.length != 1) return Promise.reject(Tools.translate("No such thread"));
        c.thread = threads[0];
        return Database.threadPosts(board.name, c.thread.number, {
            withFileInfos: true,
            withReferences: true,
            withExtraData: true
        });
    }).then(function (posts) {
        c.opPost = posts.splice(0, 1)[0];
        c.posts = posts;
        return Database.threadPostCount(board.name, c.thread.number);
    }).then(function (postCount) {
        c.model = {};
        var threadModel = {
            title: postSubject(c.opPost, 50) || null,
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: postCount >= board.bumpLimit,
            postLimitReached: postCount >= board.postLimit,
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: board.postingEnabled && !c.thread.closed,
            opPost: c.opPost,
            lastPosts: c.posts,
            archived: !!archived
        };
        c.model.thread = threadModel;
        return Database.lastPostNumber(board.name);
    }).then(function (lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        return Promise.resolve(c.model);
    });
};

module.exports.getThread = getThread;

module.exports.getThreadLastPostNumber = function (boardName, threadNumber) {
    var board = Board.board(boardName);
    if (!(board instanceof Board)) return Promise.resolve(0);
    threadNumber = +(threadNumber || 0);
    if (isNaN(threadNumber) || threadNumber < 1) return Promise.resolve(0);
    var c = {};
    return Database.db.smembers("threadPostNumbers:" + boardName + ":" + threadNumber).then(function (numbers) {
        numbers = (numbers || []).map(function (pn) {
            return +pn;
        }).sort(function (pn1, pn2) {
            if (pn1 < pn2) return -1;else if (pn1 > pn2) return 1;else return 0;
        });
        return numbers.length > 0 ? numbers[numbers.length - 1] : 0;
    });
};

module.exports.getThreadInfo = function (board, hashpass, number, lastPostNumber) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    number = +(number || 0);
    if (isNaN(number) || number < 1) return Promise.reject(Tools.translate("Invalid thread"));
    var c = {};
    return Database.getThreads(board.name, {
        limit: 1,
        filterFunction: function filterFunction(thread) {
            return thread.number == number;
        },
        withPostNumbers: true
    }).then(function (threads) {
        if (threads.length == 1) return Promise.resolve(threads);
        return Database.getThreads(board.name, {
            limit: 1,
            filterFunction: function filterFunction(thread) {
                return thread.number == number;
            },
            archived: true,
            withPostNumbers: true
        });
    }).then(function (threads) {
        if (threads.length != 1) return Promise.reject(Tools.translate("No such thread"));
        c.thread = threads[0];
        var postCount = c.thread.postNumbers.sort(function (a, b) {
            return a - b;
        }).length;
        lastPostNumber = +lastPostNumber > 0 ? +lastPostNumber : 0;
        var newPostCount = c.thread.postNumbers.filter(function (pn) {
            return pn > lastPostNumber;
        }).length;
        var threadModel = {
            number: c.thread.number,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit,
            bumpLimitReached: postCount >= board.bumpLimit,
            postLimitReached: postCount >= board.postLimit,
            closed: c.thread.closed,
            fixed: c.thread.fixed,
            unbumpable: c.thread.unbumpable,
            postCount: postCount,
            postingEnabled: board.postingEnabled && !c.thread.closed,
            lastPostNumber: c.thread.postNumbers.pop(),
            newPostCount: newPostCount
        };
        return Promise.resolve(threadModel);
    });
};

module.exports.getCatalogPage = function (board, sortMode, json, ifModifiedSince) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    return Database.lastPostNumber(board.name).then(function (lastPostNumber) {
        return Promise.resolve({ lastPostNumber: lastPostNumber });
    });
};

var getCatalog = function getCatalog(board, sortMode) {
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(board.name).then(function (threads) {
        c.threads = threads;
        var promises = c.threads.map(function (thread) {
            return Database.threadPosts(board.name, thread.number, {
                limit: 1,
                withFileInfos: true,
                withReferences: true
            }).then(function (posts) {
                thread.opPost = posts[0];
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function () {
        var promises = c.threads.map(function (thread) {
            return Database.threadPostCount(board.name, thread.number).then(function (postCount) {
                thread.postCount = postCount;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function () {
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
        model.threads = c.threads.sort(sortFunction).map(function (thread) {
            return {
                opPost: thread.opPost,
                postCount: thread.postCount,
                bumpLimit: board.bumpLimit,
                postLimit: board.postLimit,
                bumpLimitReached: thread.postCount >= board.bumpLimit,
                postLimitReached: thread.postCount >= board.postLimit,
                closed: thread.closed,
                fixed: thread.fixed,
                unbumpable: thread.unbumpable,
                postingEnabled: board.postingEnabled && !thread.closed
            };
        });
        return Promise.resolve(model);
    });
};

module.exports.pageCount = function (boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return Database.getThreads(boardName).then(function (threads) {
        return Promise.resolve(Math.ceil(threads.length / board.threadsPerPage) || 1);
    });
};

var renderThread = function renderThread(board, thread) {
    var p = board.renderPost(thread.opPost, null, thread.opPost);
    if (!thread.lastPosts) return p;
    return p.then(function () {
        return Tools.series(thread.lastPosts, function (post) {
            return board.renderPost(post, null, thread.opPost);
        });
    });
};

var generateThreadHTML = function generateThreadHTML(board, threadNumber, model, nowrite) {
    model.title = model.thread.title || board.title + " — " + model.thread.number;
    model.isBoardPage = true;
    model.isThreadPage = true;
    model.board = MiscModel.board(board).board;
    model.extraScripts = board.extraScripts();
    model.extraStylesheets = board.extraStylesheets();
    model.threadNumber = model.thread.number;
    var data = Renderer.render('pages/thread', model);
    if (nowrite) return Promise.resolve(data);
    return Cache.writeFile(board.name + '/res/' + threadNumber + '.html', data);
};

module.exports.generateThreadHTML = generateThreadHTML;

var generateThread = function generateThread(boardName, threadNumber) {
    var board = Board.board(boardName);
    if (!board) return Promise.reject(Tools.translate("Invalid board"));
    var c = {};
    return getThread(board, threadNumber).then(function (model) {
        c.model = model;
        return renderThread(board, c.model.thread);
    }).then(function () {
        return Cache.writeFile(board.name + '/res/' + threadNumber + '.json', JSON.stringify(c.model));
    }).then(function () {
        return generateThreadHTML(board, threadNumber, c.model);
    });
};

var generateThreads = function generateThreads(boardName) {
    var board = Board.board(boardName);
    if (!(board instanceof Board)) return Promise.reject(Tools.translate("Invalid board"));
    return Database.getThreads(boardName).then(function (threads) {
        return Tools.series(threads, function (thread) {
            return generateThread(boardName, thread.number);
        });
    });
};

var generatePage = function generatePage(boardName, pageNumber) {
    var board = Board.board(boardName);
    var c = {};
    return getPage(board, pageNumber).then(function (model) {
        c.model = model;
        return Tools.series(model.threads, function (thread) {
            return renderThread(board, thread);
        });
    }).then(function () {
        return Database.lastPostNumber(board.name);
    }).then(function (lastPostNumber) {
        c.model.lastPostNumber = lastPostNumber;
        c.model.postingSpeed = Tools.postingSpeedString(board.launchDate, lastPostNumber);
        return Cache.writeFile(board.name + '/' + pageNumber + '.json', JSON.stringify(c.model));
    }).then(function () {
        c.model.title = board.title;
        c.model.isBoardPage = true;
        c.model.board = MiscModel.board(board).board;
        c.model.extraScripts = board.extraScripts();
        c.model.extraStylesheets = board.extraStylesheets();
        return Cache.writeFile(board.name + '/' + (pageNumber > 0 ? pageNumber : "index") + '.html', Renderer.render('pages/board', c.model));
    });
};

var generatePages = function generatePages(boardName) {
    return module.exports.pageCount(boardName).then(function (pageCount) {
        pageCounts[boardName] = pageCount;
        var pageNumbers = [];
        for (var i = 0; i < pageCount; ++i) {
            pageNumbers.push(i);
        }return Tools.series(pageNumbers, function (pageNumber) {
            return generatePage(boardName, pageNumber);
        });
    });
};

var generateCatalog = function generateCatalog(boardName) {
    var board = Board.board(boardName);
    return Tools.series(["date", "recent", "bumps"], function (sortMode) {
        var c = {};
        return getCatalog(board, sortMode).then(function (model) {
            c.model = model;
            return Tools.series(c.model.threads, function (thread) {
                return renderThread(board, thread);
            });
        }).then(function () {
            return Database.lastPostNumber(board.name);
        }).then(function (lastPostNumber) {
            c.model.lastPostNumber = lastPostNumber;
            c.model.postingSpeed = Tools.postingSpeedString(board.launchDate, lastPostNumber);
            return Cache.writeFile(board.name + '/catalog' + ("date" != sortMode ? "-" + sortMode : "") + '.json', JSON.stringify(c.model));
        }).then(function () {
            c.model.title = board.title;
            c.model.isBoardPage = true;
            c.model.board = MiscModel.board(board).board;
            c.model.sortMode = sortMode;
            return Cache.writeFile(board.name + '/catalog' + ("date" != sortMode ? "-" + sortMode : "") + '.html', Renderer.render('pages/catalog', c.model));
        });
    });
};

var generateArchive = function generateArchive(boardName) {
    var board = Board.board(boardName);
    var model = {};
    var path = __dirname + '/../public/' + board.name + '/arch';
    return FS.exists(path).then(function (exists) {
        if (!exists) return Promise.resolve([]);
        return FS.list(path);
    }).then(function (fileNames) {
        fileNames = fileNames.filter(function (fileName) {
            return fileName.split(".").pop() == "json";
        });
        model.threads = [];
        return Tools.series(fileNames, function (fileName) {
            return FS.stat(path + "/" + fileName).then(function (stats) {
                model.threads.push({
                    boardName: board.name,
                    number: +fileName.split(".").shift(),
                    birthtime: stats.node.birthtime
                });
            });
        });
    }).then(function () {
        model.threads = model.threads.sort(function (t1, t2) {
            if (t1.birthtime > t2.birthtime) return -1;else if (t1.birthtime < t2.birthtime) return 1;else return 0;
        });
        return Database.lastPostNumber(board.name);
    }).then(function (lastPostNumber) {
        model.lastPostNumber = lastPostNumber;
        model.postingSpeed = Tools.postingSpeedString(board.launchDate, lastPostNumber);
        return Cache.writeFile(board.name + '/archive.json', JSON.stringify(model));
    }).then(function () {
        model.title = board.title;
        model.board = MiscModel.board(board).board;
        return Cache.writeFile(board.name + '/archive.html', Renderer.render('pages/archive', model));
    });
};

var generateBoard = function generateBoard(boardName) {
    return generatePages(boardName).then(function () {
        return generateThreads(boardName);
    }).then(function () {
        return generateCatalog(boardName);
    }).then(function () {
        return generateArchive(boardName);
    });
};

var performTask = function performTask(funcName, key, data) {
    var workerId = Object.keys(_cluster2.default.workers).map(function (id) {
        return {
            id: id,
            load: workerLoads[id] || 0
        };
    }).sort(function (w1, w2) {
        if (w1.load < w2.load) return -1;else if (w1.load > w2.load) return 1;else return 0;
    }).shift().id;
    if (!workerLoads.hasOwnProperty(workerId)) workerLoads[workerId] = 1;else ++workerLoads[workerId];
    return IPC.send('doGenerate', {
        funcName: funcName,
        key: key,
        data: data
    }, false, workerId).then(function (result) {
        --workerLoads[workerId];
        return Promise.resolve(result);
    }).catch(function (err) {
        --workerLoads[workerId];
        return Promise.reject(err);
    });
};

var addTask = function addTask(map, key, funcName, data) {
    var scheduled = map[key];
    if (scheduled) {
        return new Promise(function (resolve, reject) {
            if (!scheduled.next) scheduled.next = [];
            scheduled.next.push({
                resolve: resolve,
                data: data
            });
        });
    } else {
        map[key] = {};
        return performTask(funcName, key, data).catch(function (err) {
            _logger2.default.error(err.stack || err);
        }).then(function () {
            var g = function g() {
                var scheduled = map[key];
                var next = scheduled.next;
                if (!next || next.length < 1) {
                    delete map[key];
                    return Promise.resolve();
                }
                delete scheduled.next;
                var data = next.map(function (n) {
                    return n.data;
                });
                performTask(funcName, key, data).catch(function (err) {
                    _logger2.default.error(err.stack || err);
                }).then(function () {
                    g();
                    next.forEach(function (n) {
                        n.resolve();
                    });
                });
                return Promise.resolve();
            };
            return g();
        });
    };
};

module.exports.do_generateThread = function (key, data) {
    if (!Util.isArray(data)) data = [data];
    var cre = false;
    var del = false;
    for (var i = 0; i < data.length; ++i) {
        if ("create" == data[i].action) cre = true;
        if ("delete" == data[i].action) del = true;
        if (cre && del) return Promise.resolve(); //NOTE: This should actually never happen
    }
    data = data.reduce(function (acc, d) {
        if (!acc) return d;
        if (d.action < acc.action) return d;
        return acc;
    });
    var boardName = data.boardName;
    var threadNumber = data.threadNumber;
    switch (data.action) {
        case "create":
            {
                return generateThread(boardName, threadNumber);
            }
        case "edit":
            {
                var c = {};
                var threadId = boardName + '/res/' + threadNumber + '.json';
                var board = Board.board(boardName);
                if (!board) return Promise.reject(Tools.translate("Invalid board"));
                return Cache.readFile(threadId).then(function (data) {
                    c.thread = JSON.parse(data);
                    c.lastPosts = c.thread.thread.lastPosts.reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                    }, {});
                    return Database.threadPosts(boardName, threadNumber, {
                        withFileInfos: true,
                        withReferences: true,
                        withExtraData: true
                    });
                }).then(function (posts) {
                    var opPost = posts[0];
                    posts = posts.slice(1).reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                    }, {});
                    var p = Promise.resolve();
                    Tools.forIn(c.lastPosts, function (post, postNumber) {
                        if (!posts.hasOwnProperty(postNumber)) return delete c.lastPosts[postNumber];
                    });
                    Tools.forIn(posts, function (post, postNumber) {
                        var oldPost = c.lastPosts[postNumber];
                        if (oldPost && oldPost.updatedAt >= post.updatedAt) {
                            var oldRefs = oldPost.referringPosts.reduce(function (acc, ref) {
                                return acc + ";" + ref.boardName + ":" + ref.postNumber;
                            }, "");
                            var newRefs = post.referringPosts.reduce(function (acc, ref) {
                                return acc + ";" + ref.boardName + ":" + ref.postNumber;
                            }, "");
                            var oldFileInfos = oldPost.fileInfos.reduce(function (acc, fileInfo) {
                                return acc + ";" + fileInfo.fileName + ":" + JSON.stringify(fileInfo.extraData);
                            }, "");
                            var newFileInfos = post.fileInfos.reduce(function (acc, fileInfo) {
                                return acc + ";" + fileInfo.fileName + ":" + JSON.stringify(fileInfo.extraData);
                            }, "");
                            if (oldPost.bannedFor === post.bannedFor && oldPost.text === post.text && oldRefs == newRefs && oldFileInfos == newFileInfos) {
                                return;
                            }
                        }
                        p = p.then(function () {
                            return board.renderPost(post, null, opPost);
                        }).then(function (renderedPost) {
                            c.lastPosts[postNumber] = renderedPost;
                            return Promise.resolve();
                        });
                    });
                    return p;
                }).then(function () {
                    c.thread.thread.lastPosts = Tools.toArray(c.lastPosts);
                    return Cache.writeFile(threadId, JSON.stringify(c.thread));
                }).then(function () {
                    return generateThreadHTML(board, threadNumber, c.thread);
                });
            }
        case "delete":
            {
                return Database.db.sadd("deletedThreads", data.boardName + ":" + data.threadNumber).then(function () {
                    return Cache.removeFile(boardName + '/res/' + threadNumber + '.json');
                }).then(function () {
                    return Cache.removeFile(boardName + '/res/' + threadNumber + '.html');
                });
            }
        default:
            break;
    }
    return Promise.reject("Invalid action");
};

module.exports.do_generatePages = function (boardName) {
    return generatePages(boardName);
};

module.exports.do_generateCatalog = function (boardName) {
    return generateCatalog(boardName);
};

module.exports.do_generateArchive = function (boardName) {
    return generateArchive(boardName);
};

module.exports.initialize = function () {
    return Tools.series(Board.boardNames(), function (boardName) {
        return module.exports.pageCount(boardName).then(function (pageCount) {
            pageCounts[boardName] = pageCount;
            return Promise.resolve();
        });
    }).then(function () {
        return Database.db.del("deletedThreads");
    });
};

module.exports.generateJSON = function () {
    var boardNames = Board.boardNames();
    return Tools.series(boardNames, generateBoard);
};

module.exports.generateRSS = function (currentProcess) {
    var site = {
        protocol: config("site.protocol", "http"),
        domain: config("site.domain", "localhost:8080"),
        pathPrefix: config("site.pathPrefix", ""),
        locale: config("site.locale", "en")
    };
    var rssPostCount = config("server.rss.postCount", 500);
    var postNumbers = {};
    Board.boardNames().forEach(function (boardName) {
        postNumbers[boardName] = [];
    });
    var feedTranslated = Tools.translate("Feed", "channelTitle");
    return Database.db.hkeys("posts").then(function (keys) {
        keys.forEach(function (key) {
            var list = postNumbers[key.split(":").shift()];
            if (!list) return;
            list.push(+key.split(":").pop());
        });
        return Tools.series(Board.boardNames(), function (boardName) {
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
                    ttl: "" + config("server.rss.ttl", 60),
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
            return Tools.series(postNumbers[boardName].sort(function (pn1, pn2) {
                if (pn1 < pn2) return 1;else if (pn1 > pn2) return -1;else return 0;
            }).slice(0, rssPostCount).reverse(), function (postNumber) {
                return Database.getPost(boardName, postNumber, { withFileInfos: true }).then(function (post) {
                    posts.push(post);
                    return Promise.resolve();
                });
            }).then(function () {
                doc.channel.item = posts.map(function (post) {
                    var title;
                    var isOp = post.number == post.threadNumber;
                    if (isOp) title = "[" + Tools.translate("New thread", "itemTitle") + "]";else title = Tools.translate("Reply to thread", "itemTitle");
                    title += " ";
                    if (!isOp) title += "\"";
                    title += postSubject(post, 150) || post.number;
                    if (!isOp) title += "\"";
                    var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/res/" + post.threadNumber + ".html";
                    var description = "\n" + post.fileInfos.map(function (fileInfo) {
                        if (!fileInfo) return ""; //NOTE: Normally that should not happen
                        return "<img src=\"" + site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/thumb/" + fileInfo.thumb.name + "\"><br />";
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
                        "dc:creator": post.name || board.defaultUserName
                    };
                });
            }).then(function () {
                var builder = new XML2JS.Builder({
                    rootName: "rss",
                    renderOpts: {
                        pretty: true,
                        indent: "    ",
                        newline: "\n"
                    },
                    allowSurrogateChars: true,
                    cdata: true
                });
                return Cache.writeFile(board.name + '/rss.xml', builder.buildObject(doc));
            });
        });
    });
};
//# sourceMappingURL=board.js.map
