'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearDeletedThreads = exports.setThreadDeleted = exports.isThreadDeleted = exports.getThreadLastPostNumber = exports.getThreadInfo = exports.getThreads = exports.getThread = exports.getThreadNumbers = exports.getThreadPosts = exports.getThreadPostNumbers = undefined;

var getThreadPostNumbers = exports.getThreadPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber) {
    var postNumbers;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return ThreadPostNumbers.getAll(boardName + ':' + threadNumber);

          case 2:
            postNumbers = _context.sent;
            return _context.abrupt('return', postNumbers.sort(function (a, b) {
              return a - b;
            }));

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThreadPostNumbers(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var addDataToThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(thread) {
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var withPostNumbers = _ref.withPostNumbers;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return ThreadUpdateDateTimes.getOne(thread.number, thread.boardName);

          case 2:
            thread.updatedAt = _context2.sent;

            if (!withPostNumbers) {
              _context2.next = 7;
              break;
            }

            _context2.next = 6;
            return getThreadPostNumbers(thread.boardName, thread.number);

          case 6:
            thread.postNumbers = _context2.sent;

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function addDataToThread(_x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var getThreadPosts = exports.getThreadPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber) {
    var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var reverse = _ref2.reverse;
    var limit = _ref2.limit;
    var notOP = _ref2.notOP;
    var withExtraData = _ref2.withExtraData;
    var withFileInfos = _ref2.withFileInfos;
    var withReferences = _ref2.withReferences;
    var board, threadPostNumbers, postNumbers;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context3.next = 3;
              break;
            }

            return _context3.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 6;
              break;
            }

            return _context3.abrupt('return', Promise.reject(Tools.translate('Invalid thread number')));

          case 6:
            _context3.next = 8;
            return getThreadPostNumbers(boardName, threadNumber);

          case 8:
            threadPostNumbers = _context3.sent;
            postNumbers = Tools.cloned(threadPostNumbers);

            if (notOP) {
              postNumbers.splice(0, 1);
            }
            if (reverse) {
              postNumbers.reverse();
            }
            limit = Tools.option(limit, 'number', 0, { test: function test(l) {
                return l > 0;
              } });
            if (limit) {
              postNumbers.splice(limit);
            }
            _context3.next = 16;
            return PostsModel.getPosts(boardName, postNumbers, { withExtraData: withExtraData, withFileInfos: withFileInfos, withReferences: withReferences });

          case 16:
            return _context3.abrupt('return', _context3.sent);

          case 17:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getThreadPosts(_x6, _x7, _x8) {
    return ref.apply(this, arguments);
  };
}();

var getThreadNumbers = exports.getThreadNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName) {
    var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var archived = _ref3.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            source = archived ? ArchivedThreads : Threads;
            _context4.next = 3;
            return source.keys(boardName);

          case 3:
            return _context4.abrupt('return', _context4.sent);

          case 4:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getThreadNumbers(_x10, _x11) {
    return ref.apply(this, arguments);
  };
}();

var getThread = exports.getThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, threadNumber, options) {
    var board, thread;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context5.next = 6;
              break;
            }

            return _context5.abrupt('return', Promise.reject(Tools.translate('Invalid thread number')));

          case 6:
            _context5.next = 8;
            return Threads.getOne(threadNumber, boardName);

          case 8:
            thread = _context5.sent;

            if (thread) {
              _context5.next = 13;
              break;
            }

            _context5.next = 12;
            return ArchivedThreads.getOne(threadNumber, boardName);

          case 12:
            thread = _context5.sent;

          case 13:
            if (thread) {
              _context5.next = 15;
              break;
            }

            return _context5.abrupt('return', Promise.reject(Tools.translate('No such thread')));

          case 15:
            _context5.next = 17;
            return addDataToThread(thread, options);

          case 17:
            return _context5.abrupt('return', thread);

          case 18:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getThread(_x13, _x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var getThreads = exports.getThreads = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName, threadNumbers, options) {
    var board, threads, mayBeArchivedThreadNumbers, numbers, archivedThreads;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context7.next = 3;
              break;
            }

            return _context7.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            if (!(0, _underscore2.default)(threadNumbers).isArray()) {
              threadNumbers = [threadNumbers];
            }
            threadNumbers = threadNumbers.map(function (threadNumber) {
              return Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
            });

            if (!threadNumbers.some(function (threadNumber) {
              return !threadNumber;
            })) {
              _context7.next = 7;
              break;
            }

            return _context7.abrupt('return', Promise.reject(Tools.translate('Invalid thread number')));

          case 7:
            _context7.next = 9;
            return Threads.getSome(threadNumbers, boardName);

          case 9:
            threads = _context7.sent;

            threads = (0, _underscore2.default)(threads).toArray();
            mayBeArchivedThreadNumbers = threads.map(function (thread, index) {
              return {
                thread: thread,
                index: index
              };
            }).filter(function (thread) {
              return !thread.thread;
            }).map(function (thread) {
              return {
                index: thread.index,
                threadNumber: threadNumbers[thread.index]
              };
            });

            if (!(mayBeArchivedThreadNumbers.length > 0)) {
              _context7.next = 18;
              break;
            }

            numbers = mayBeArchivedThreadNumbers.map(function (thread) {
              return thread.threadNumber;
            });
            _context7.next = 16;
            return ArchivedThreads.getSome(numbers, boardName);

          case 16:
            archivedThreads = _context7.sent;

            archivedThreads.forEach(function (thread, index) {
              threads[mayBeArchivedThreadNumbers[index].index] = thread;
            });

          case 18:
            if (!(threads.length <= 0)) {
              _context7.next = 20;
              break;
            }

            return _context7.abrupt('return', []);

          case 20:
            _context7.next = 22;
            return Tools.series(threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(thread) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return addDataToThread(thread, options);

                      case 2:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x19) {
                return ref.apply(this, arguments);
              };
            }());

          case 22:
            return _context7.abrupt('return', threads);

          case 23:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getThreads(_x16, _x17, _x18) {
    return ref.apply(this, arguments);
  };
}();

var getThreadInfo = exports.getThreadInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName, threadNumber, _ref4) {
    var lastPostNumber = _ref4.lastPostNumber;
    var board, thread, postCount, newPostCount;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context8.next = 3;
              break;
            }

            return _context8.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context8.next = 6;
              break;
            }

            return _context8.abrupt('return', Promise.reject(Tools.translate('Invalid thread number')));

          case 6:
            _context8.next = 8;
            return getThread(boardName, threadNumber, { withPostNumbers: true });

          case 8:
            thread = _context8.sent;

            if (thread) {
              _context8.next = 11;
              break;
            }

            return _context8.abrupt('return', thread);

          case 11:
            postCount = thread.postNumbers.length;

            lastPostNumber = Tools.option(lastPostNumber, 'number', 0, { test: Tools.testPostNumber });
            newPostCount = thread.postNumbers.filter(function (pn) {
              return pn > lastPostNumber;
            }).length;
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
              lastPostNumber: thread.postNumbers.pop(),
              newPostCount: newPostCount
            });

          case 15:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getThreadInfo(_x20, _x21, _x22) {
    return ref.apply(this, arguments);
  };
}();

var getThreadLastPostNumber = exports.getThreadLastPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName, threadNumber) {
    var threadPostNumbers;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context9.next = 2;
              break;
            }

            return _context9.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 2:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context9.next = 5;
              break;
            }

            return _context9.abrupt('return', Promise.reject(Tools.translate('Invalid thread number')));

          case 5:
            _context9.next = 7;
            return getThreadPostNumbers(boardName, threadNumber);

          case 7:
            threadPostNumbers = _context9.sent;
            return _context9.abrupt('return', threadPostNumbers.length > 0 ? (0, _underscore2.default)(threadPostNumbers).last() : 0);

          case 9:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function getThreadLastPostNumber(_x23, _x24) {
    return ref.apply(this, arguments);
  };
}();

var isThreadDeleted = exports.isThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            return _context10.abrupt('return', DeletedThreads.contains(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function isThreadDeleted(_x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var setThreadDeleted = exports.setThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            return _context11.abrupt('return', DeletedThreads.addOne(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function setThreadDeleted(_x27, _x28) {
    return ref.apply(this, arguments);
  };
}();

var clearDeletedThreads = exports.clearDeletedThreads = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            return _context12.abrupt('return', DeletedThreads.delete());

          case 1:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function clearDeletedThreads() {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ArchivedThreads = new _hash2.default((0, _clientFactory2.default)(), 'archivedThreads');
var DeletedThreads = new _unorderedSet2.default((0, _clientFactory2.default)(), 'deletedThreads', {
  parse: false,
  stringify: false
});
var ThreadPostNumbers = new _unorderedSet2.default((0, _clientFactory2.default)(), 'threadPostNumbers', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});
var Threads = new _hash2.default((0, _clientFactory2.default)(), 'threads');
var ThreadUpdateDateTimes = new _hash2.default((0, _clientFactory2.default)(), 'threadUpdateDateTimes', {
  parse: false,
  stringify: false
});
//# sourceMappingURL=threads.js.map
