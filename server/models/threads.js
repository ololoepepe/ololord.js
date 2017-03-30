'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getThreadRedirect = exports.deleteThread = exports.moveThread = exports.setThreadUnbumpable = exports.setThreadClosed = exports.setThreadFixed = exports.createThread = exports.clearDeletedThreads = exports.setThreadDeleted = exports.isThreadDeleted = exports.getThreadInfo = exports.getThreadLastPostNumber = exports.getThreadCount = exports.getThreads = exports.threadExists = exports.getThread = exports.getThreadNumbers = exports.getThreadPostCount = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var getThreadPostCount = exports.getThreadPostCount = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber) {
    var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        lastPostNumber = _ref2.lastPostNumber;

    var Post, query;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.collection('post');

          case 2:
            Post = _context.sent;
            query = {
              boardName: boardName,
              threadNumber: threadNumber
            };

            lastPostNumber = Tools.option(lastPostNumber, 'number', 0, { test: Tools.testPostNumber });
            if (lastPostNumber) {
              query.number = { $gt: lastPostNumber };
            }
            _context.next = 8;
            return Post.count(query);

          case 8:
            return _context.abrupt('return', _context.sent);

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThreadPostCount(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var getThreadNumbers = exports.getThreadNumbers = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName) {
    var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        archived = _ref4.archived;

    var Thread, threads;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context2.sent;
            _context2.next = 5;
            return Thread.find({
              boardName: boardName,
              archived: !!archived
            }, { number: 1 }).sort({ number: -1 }).toArray();

          case 5:
            threads = _context2.sent;
            return _context2.abrupt('return', threads.map(function (_ref5) {
              var number = _ref5.number;
              return number;
            }));

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getThreadNumbers(_x4) {
    return _ref3.apply(this, arguments);
  };
}();

var getThread = exports.getThread = function () {
  var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber, projection) {
    var board, Thread, thread;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context3.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context3.next = 8;
            return client.collection('thread');

          case 8:
            Thread = _context3.sent;

            if ((typeof projection === 'undefined' ? 'undefined' : _typeof(projection)) !== 'object') {
              projection = { _id: 0 };
            }
            _context3.next = 12;
            return Thread.findOne({
              boardName: boardName,
              number: threadNumber
            }, projection);

          case 12:
            thread = _context3.sent;

            if (thread) {
              _context3.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 15:
            return _context3.abrupt('return', thread);

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getThread(_x6, _x7, _x8) {
    return _ref6.apply(this, arguments);
  };
}();

var threadExists = exports.threadExists = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber) {
    var board, Thread, count;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context4.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context4.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context4.next = 8;
            return client.collection('thread');

          case 8:
            Thread = _context4.sent;
            _context4.next = 11;
            return Thread.count({
              boardName: boardName,
              number: threadNumber
            });

          case 11:
            count = _context4.sent;
            return _context4.abrupt('return', count > 0);

          case 13:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function threadExists(_x9, _x10) {
    return _ref7.apply(this, arguments);
  };
}();

var getThreads = exports.getThreads = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName) {
    var _ref9 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        archived = _ref9.archived,
        limit = _ref9.limit,
        offset = _ref9.offset,
        sort = _ref9.sort;

    var board, Thread, cursor, threads;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context5.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context5.next = 5;
            return client.collection('thread');

          case 5:
            Thread = _context5.sent;
            cursor = Thread.find({
              boardName: boardName,
              archived: !!archived
            }, { _id: 0 });

            if (sort) {
              cursor = cursor.sort({
                fixed: sort,
                updatedAt: sort
              });
            }
            if (offset) {
              cursor = cursor.skip(offset);
            }
            if (limit) {
              cursor = cursor.limit(limit);
            }
            _context5.next = 12;
            return cursor.toArray();

          case 12:
            threads = _context5.sent;
            return _context5.abrupt('return', threads);

          case 14:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getThreads(_x11) {
    return _ref8.apply(this, arguments);
  };
}();

var getThreadCount = exports.getThreadCount = function () {
  var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName) {
    var _ref11 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        archived = _ref11.archived;

    var board, Thread;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context6.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context6.next = 5;
            return client.collection('thread');

          case 5:
            Thread = _context6.sent;
            _context6.next = 8;
            return Thread.count({
              boardName: boardName,
              archived: !!archived
            });

          case 8:
            return _context6.abrupt('return', _context6.sent);

          case 9:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function getThreadCount(_x13) {
    return _ref10.apply(this, arguments);
  };
}();

var getThreadLastPostNumber = exports.getThreadLastPostNumber = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName, threadNumber) {
    var Post, posts;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context7.next = 2;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 2:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context7.next = 5;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 5:
            _context7.next = 7;
            return client.collection('post');

          case 7:
            Post = _context7.sent;
            _context7.next = 10;
            return Post.find({
              boardName: boardName,
              threadNumber: threadNumber
            }, { number: 1 }).sort({ number: -1 }).limit(1).toArray();

          case 10:
            posts = _context7.sent;
            return _context7.abrupt('return', posts.length > 0 ? posts[0].number : 0);

          case 12:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getThreadLastPostNumber(_x15, _x16) {
    return _ref12.apply(this, arguments);
  };
}();

var getThreadInfo = exports.getThreadInfo = function () {
  var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName, threadNumber, _ref14) {
    var lastPostNumber = _ref14.lastPostNumber;
    var board, Thread, thread, postCount, newPostCount;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context8.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context8.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context8.next = 8;
            return client.collection('thread');

          case 8:
            Thread = _context8.sent;
            _context8.next = 11;
            return getThread(boardName, threadNumber);

          case 11:
            thread = _context8.sent;

            if (thread) {
              _context8.next = 14;
              break;
            }

            return _context8.abrupt('return', thread);

          case 14:
            _context8.next = 16;
            return getThreadPostCount(boardName, threadNumber);

          case 16:
            postCount = _context8.sent;
            _context8.next = 19;
            return getThreadPostCount(boardName, threadNumber, { lastPostNumber: lastPostNumber });

          case 19:
            newPostCount = _context8.sent;
            _context8.next = 22;
            return getThreadLastPostNumber(boardName, threadNumber);

          case 22:
            lastPostNumber = _context8.sent;
            return _context8.abrupt('return', {
              number: thread.number,
              bumpLimit: board.bumpLimit,
              postLimit: board.postLimit,
              bumpLimitReached: postCount >= board.bumpLimit,
              postLimitReached: postCount >= board.postLimit,
              closed: thread.closed,
              fixed: thread.fixed,
              unbumpable: thread.unbumpable,
              postCount: postCount,
              postingEnabled: board.postingEnabled && !thread.closed,
              lastPostNumber: lastPostNumber,
              newPostCount: newPostCount
            });

          case 24:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getThreadInfo(_x17, _x18, _x19) {
    return _ref13.apply(this, arguments);
  };
}();

var isThreadDeleted = exports.isThreadDeleted = function () {
  var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            return _context9.abrupt('return', DeletedThreads.contains(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function isThreadDeleted(_x20, _x21) {
    return _ref15.apply(this, arguments);
  };
}();

var setThreadDeleted = exports.setThreadDeleted = function () {
  var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            return _context10.abrupt('return', DeletedThreads.addOne(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function setThreadDeleted(_x22, _x23) {
    return _ref16.apply(this, arguments);
  };
}();

var clearDeletedThreads = exports.clearDeletedThreads = function () {
  var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            return _context11.abrupt('return', DeletedThreads.delete());

          case 1:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function clearDeletedThreads() {
    return _ref17.apply(this, arguments);
  };
}();

var pushOutOldThread = function () {
  var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName) {
    var board, threadCount, archivedThreadCount, removeLastArchivedThread, Thread, _ref19, _ref20, lastThread, _ref21, _ref22, lastArchivedThread, Post;

    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context12.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context12.next = 5;
            return getThreadCount(boardName);

          case 5:
            threadCount = _context12.sent;

            if (!(threadCount < board.threadLimit)) {
              _context12.next = 8;
              break;
            }

            return _context12.abrupt('return');

          case 8:
            _context12.next = 10;
            return getThreadCount(boardName, { archived: true });

          case 10:
            archivedThreadCount = _context12.sent;
            removeLastArchivedThread = board.archiveLimit > 0 && archivedThreadCount >= board.archiveLimit;
            _context12.next = 14;
            return client.collection('thread');

          case 14:
            Thread = _context12.sent;
            _context12.next = 17;
            return getThreads(boardName, {
              sort: 1,
              limit: 1
            });

          case 17:
            _ref19 = _context12.sent;
            _ref20 = _slicedToArray(_ref19, 1);
            lastThread = _ref20[0];

            if (!removeLastArchivedThread) {
              _context12.next = 31;
              break;
            }

            _context12.next = 23;
            return getThreads(boardName, {
              archived: true,
              sort: 1,
              limit: 1
            });

          case 23:
            _ref21 = _context12.sent;
            _ref22 = _slicedToArray(_ref21, 1);
            lastArchivedThread = _ref22[0];

            if (!lastArchivedThread) {
              _context12.next = 31;
              break;
            }

            _context12.next = 29;
            return deleteThread(boardName, lastArchivedThread.number);

          case 29:
            _context12.next = 31;
            return IPC.renderArchive(boardName);

          case 31:
            if (!(board.archiveLimit <= 0)) {
              _context12.next = 35;
              break;
            }

            _context12.next = 34;
            return deleteThread(boardName, lastThread.number);

          case 34:
            return _context12.abrupt('return');

          case 35:
            _context12.next = 37;
            return Thread.updateOne({
              boardName: boardName,
              number: lastThread.number
            }, {
              $set: { archived: true }
            });

          case 37:
            _context12.next = 39;
            return client.collection('post');

          case 39:
            Post = _context12.sent;
            _context12.next = 42;
            return Post.updateMany({
              boardName: boardName,
              threadNumber: lastThread.number
            }, {
              $set: { archived: true }
            });

          case 42:
            _context12.next = 44;
            return IPC.render(boardName, lastThread.number, lastThread.number, 'edit');

          case 44:
            _context12.next = 46;
            return IPC.renderArchive(boardName);

          case 46:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function pushOutOldThread(_x24) {
    return _ref18.apply(this, arguments);
  };
}();

var createThread = exports.createThread = function () {
  var _ref23 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(req, fields, transaction) {
    var boardName, password, board, date, threadNumber, thread, Thread;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            boardName = fields.boardName, password = fields.password;
            board = _board2.default.board(boardName);

            if (board) {
              _context13.next = 4;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 4:
            if (board.postingEnabled) {
              _context13.next = 6;
              break;
            }

            throw new Error(Tools.translate('Posting is disabled at this board'));

          case 6:
            _context13.prev = 6;
            _context13.next = 9;
            return pushOutOldThread(boardName);

          case 9:
            _context13.next = 14;
            break;

          case 11:
            _context13.prev = 11;
            _context13.t0 = _context13['catch'](6);

            _logger2.default.error(_context13.t0.stack || _context13.t0);

          case 14:
            date = Tools.now();
            _context13.next = 17;
            return BoardsModel.nextPostNumber(boardName);

          case 17:
            threadNumber = _context13.sent;
            thread = {
              boardName: boardName,
              number: threadNumber,
              archived: false,
              fixed: false,
              closed: false,
              unbumpable: false,
              user: PostsModel.createPostUser(req, req.level(boardName), password),
              createdAt: date.toISOString(),
              updatedAt: date.toISOString()
            };

            transaction.setThreadNumber(threadNumber);
            _context13.next = 22;
            return client.collection('thread');

          case 22:
            Thread = _context13.sent;
            _context13.next = 25;
            return Thread.insertOne(thread);

          case 25:
            return _context13.abrupt('return', thread);

          case 26:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this, [[6, 11]]);
  }));

  return function createThread(_x25, _x26, _x27) {
    return _ref23.apply(this, arguments);
  };
}();

var setThreadFlag = function () {
  var _ref24 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName, threadNumber, flagName, flagValue) {
    var Thread, _ref25, matchedCount, modifiedCount;

    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            _context14.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context14.sent;
            _context14.next = 5;
            return Thread.updateOne({
              boardName: boardName,
              number: threadNumber
            }, {
              $set: _defineProperty({}, flagName, !!flagValue)
            });

          case 5:
            _ref25 = _context14.sent;
            matchedCount = _ref25.matchedCount;
            modifiedCount = _ref25.modifiedCount;

            if (!(matchedCount <= 0)) {
              _context14.next = 10;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 10:
            if (!(modifiedCount > 0)) {
              _context14.next = 13;
              break;
            }

            _context14.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function setThreadFlag(_x28, _x29, _x30, _x31) {
    return _ref24.apply(this, arguments);
  };
}();

var setThreadFixed = exports.setThreadFixed = function () {
  var _ref26 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, threadNumber, fixed) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.next = 2;
            return setThreadFlag(boardName, threadNumber, 'fixed', fixed);

          case 2:
            return _context15.abrupt('return', _context15.sent);

          case 3:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function setThreadFixed(_x32, _x33, _x34) {
    return _ref26.apply(this, arguments);
  };
}();

var setThreadClosed = exports.setThreadClosed = function () {
  var _ref27 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(boardName, threadNumber, closed) {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            _context16.next = 2;
            return setThreadFlag(boardName, threadNumber, 'closed', closed);

          case 2:
            return _context16.abrupt('return', _context16.sent);

          case 3:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function setThreadClosed(_x35, _x36, _x37) {
    return _ref27.apply(this, arguments);
  };
}();

var setThreadUnbumpable = exports.setThreadUnbumpable = function () {
  var _ref28 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(boardName, threadNumber, unbumpable) {
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return setThreadFlag(boardName, threadNumber, 'unbumpable', unbumpable);

          case 2:
            return _context17.abrupt('return', _context17.sent);

          case 3:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function setThreadUnbumpable(_x38, _x39, _x40) {
    return _ref28.apply(this, arguments);
  };
}();

var moveThread = exports.moveThread = function () {
  var _ref29 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(sourceBoardName, threadNumber, targetBoardName, transaction) {
    var targetBoard, thread, postCount, lastPostNumber, initialPostNumber, Thread;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            targetBoard = _board2.default.board(targetBoardName);

            if (!(!targetBoard || !_board2.default.board(sourceBoardName))) {
              _context18.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context18.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context18.next = 8;
            return getThread(sourceBoardName, threadNumber);

          case 8:
            thread = _context18.sent;

            if (thread) {
              _context18.next = 11;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 11:
            thread.originalBoardName = thread.boardName;
            thread.originalNumber = thread.number;
            thread.boardName = targetBoardName;
            _context18.next = 16;
            return getThreadPostCount(sourceBoardName, threadNumber);

          case 16:
            postCount = _context18.sent;
            _context18.next = 19;
            return BoardsModel.nextPostNumber(targetBoardName, postCount);

          case 19:
            lastPostNumber = _context18.sent;
            initialPostNumber = lastPostNumber - postCount + 1;

            thread.number = initialPostNumber;
            _context18.next = 24;
            return PostsModel.copyPosts({
              sourceBoardName: sourceBoardName,
              sourceThreadNumber: threadNumber,
              targetBoardName: targetBoardName,
              initialPostNumber: initialPostNumber,
              transaction: transaction
            });

          case 24:
            _context18.next = 26;
            return client.collection('thread');

          case 26:
            Thread = _context18.sent;

            transaction.setThreadNumber(thread.number);
            _context18.next = 30;
            return Thread.insertOne(thread);

          case 30:
            _context18.next = 32;
            return IPC.render(targetBoardName, thread.number, thread.number, 'create');

          case 32:
            transaction.commit();
            _context18.next = 35;
            return deleteThread(sourceBoardName, threadNumber);

          case 35:
            return _context18.abrupt('return', {
              boardName: targetBoardName,
              threadNumber: thread.number
            });

          case 36:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function moveThread(_x41, _x42, _x43, _x44) {
    return _ref29.apply(this, arguments);
  };
}();

var deleteThread = exports.deleteThread = function () {
  var _ref30 = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(boardName, threadNumber) {
    var Thread, result, thread, Post, query, posts, refs, referencedPosts, fileInfos;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            _context20.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context20.sent;
            _context20.next = 5;
            return Thread.findOneAndDelete({
              boardName: boardName,
              number: threadNumber
            }, {
              projection: { archived: 1 }
            });

          case 5:
            result = _context20.sent;
            thread = result.value;

            if (thread) {
              _context20.next = 9;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 9:
            _context20.next = 11;
            return client.collection('post');

          case 11:
            Post = _context20.sent;
            query = {
              boardName: boardName,
              threadNumber: threadNumber
            };
            _context20.next = 15;
            return Post.find(query, {
              number: 1,
              referencedPosts: 1,
              referringPosts: 1,
              fileInfos: 1
            }).toArray();

          case 15:
            posts = _context20.sent;
            _context20.next = 18;
            return Post.deleteMany(query);

          case 18:
            _context20.next = 20;
            return Tools.series(posts, function () {
              var _ref31 = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(post) {
                return regeneratorRuntime.wrap(function _callee19$(_context19) {
                  while (1) {
                    switch (_context19.prev = _context19.next) {
                      case 0:
                        _context19.next = 2;
                        return PostReferencesModel.removeReferringPosts(boardName, post.number);

                      case 2:
                      case 'end':
                        return _context19.stop();
                    }
                  }
                }, _callee19, this);
              }));

              return function (_x47) {
                return _ref31.apply(this, arguments);
              };
            }(), true);

          case 20:
            _context20.next = 22;
            return Tools.series(posts, function (post) {
              return PostReferencesModel.updateReferringPosts(post.referringPosts, boardName, undefined, threadNumber);
            }, true);

          case 22:
            refs = _context20.sent;

            refs = _underscore2.default.extend.apply(_underscore2.default, _toConsumableArray(refs));
            referencedPosts = (0, _underscore2.default)(posts.map(function (_ref32) {
              var referencedPosts = _ref32.referencedPosts;
              return referencedPosts;
            })).flatten();
            _context20.next = 27;
            return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, refs, referencedPosts);

          case 27:
            fileInfos = posts.map(function (_ref33) {
              var fileInfos = _ref33.fileInfos;
              return fileInfos;
            });
            _context20.next = 30;
            return FilesModel.removeFiles((0, _underscore2.default)(fileInfos).flatten());

          case 30:
            _context20.next = 32;
            return IPC.render(boardName, threadNumber, threadNumber, 'delete');

          case 32:
            if (!thread.archived) {
              _context20.next = 35;
              break;
            }

            _context20.next = 35;
            return IPC.renderArchive(boardName);

          case 35:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function deleteThread(_x45, _x46) {
    return _ref30.apply(this, arguments);
  };
}();

var getThreadRedirect = exports.getThreadRedirect = function () {
  var _ref34 = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(boardName, threadNumber) {
    var Thread, thread;
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            _context21.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context21.sent;
            _context21.next = 5;
            return Thread.findOne({
              originalBoardName: boardName,
              originalNumber: threadNumber
            }, {
              _id: 0,
              boardName: 1,
              number: 1
            });

          case 5:
            thread = _context21.sent;

            if (thread) {
              _context21.next = 8;
              break;
            }

            return _context21.abrupt('return', null);

          case 8:
            return _context21.abrupt('return', {
              boardName: thread.boardName,
              threadNumber: thread.number
            });

          case 9:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function getThreadRedirect(_x48, _x49) {
    return _ref34.apply(this, arguments);
  };
}();

exports.sortThreadsByDate = sortThreadsByDate;
exports.sortThreadsByCreationDate = sortThreadsByCreationDate;
exports.sortThreadsByPostCount = sortThreadsByPostCount;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _boards = require('./boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _files = require('./files');

var FilesModel = _interopRequireWildcard(_files);

var _postReferences = require('./post-references');

var PostReferencesModel = _interopRequireWildcard(_postReferences);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var client = (0, _mongodbClientFactory2.default)();
var DeletedThreads = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'deletedThreads', {
  parse: false,
  stringify: false
});

function sortThreadsByDate(t1, t2) {
  if (!!t1.fixed === !!t2.fixed) {
    return t2.updatedAt.localeCompare(t1.updatedAt);
  } else {
    return t1.fixed ? -1 : 1;
  }
}

function sortThreadsByCreationDate(t1, t2) {
  return t2.createdAt.localeCompare(t1.createdAt);
}

function sortThreadsByPostCount(t1, t2) {
  return t2.postCount - t1.postCount;
}
//# sourceMappingURL=threads.js.map
