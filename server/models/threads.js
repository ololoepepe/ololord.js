'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setThreadUnbumpable = exports.setThreadClosed = exports.setThreadFixed = exports.moveThread = exports.createThread = exports.clearDeletedThreads = exports.setThreadDeleted = exports.isThreadDeleted = exports.setThreadUpdateTime = exports.getThreadsUpdateTimes = exports.getThreadUpdateTime = exports.getThreadLastPostNumber = exports.getThreadInfo = exports.getThreads = exports.getThread = exports.getThreadNumbers = exports.getThreadPosts = exports.removeThreadPostNumber = exports.addThreadPostNumber = exports.getThreadPostNumbers = exports.getThreadPostCount = undefined;

var getThreadPostCount = exports.getThreadPostCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return ThreadPostNumbers.count(boardName + ':' + threadNumber);

          case 2:
            return _context.abrupt('return', _context.sent);

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThreadPostCount(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var getThreadPostNumbers = exports.getThreadPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, threadNumber) {
    var postNumbers;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return ThreadPostNumbers.getAll(boardName + ':' + threadNumber);

          case 2:
            postNumbers = _context2.sent;
            return _context2.abrupt('return', postNumbers.sort(function (a, b) {
              return a - b;
            }));

          case 4:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getThreadPostNumbers(_x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var addThreadPostNumber = exports.addThreadPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber, postNumber) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return ThreadPostNumbers.addOne(postNumber, boardName + ':' + threadNumber);

          case 2:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function addThreadPostNumber(_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var removeThreadPostNumber = exports.removeThreadPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber, postNumber) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return ThreadPostNumbers.deleteOne(postNumber, boardName + ':' + threadNumber);

          case 2:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function removeThreadPostNumber(_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var addDataToThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(thread) {
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var withPostNumbers = _ref.withPostNumbers;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return ThreadUpdateTimes.getOne(thread.number, thread.boardName);

          case 2:
            thread.updatedAt = _context5.sent;

            if (!withPostNumbers) {
              _context5.next = 7;
              break;
            }

            _context5.next = 6;
            return getThreadPostNumbers(thread.boardName, thread.number);

          case 6:
            thread.postNumbers = _context5.sent;

          case 7:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function addDataToThread(_x11, _x12) {
    return ref.apply(this, arguments);
  };
}();

var getThreadPosts = exports.getThreadPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, threadNumber) {
    var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var reverse = _ref2.reverse;
    var limit = _ref2.limit;
    var notOP = _ref2.notOP;
    var withExtraData = _ref2.withExtraData;
    var withFileInfos = _ref2.withFileInfos;
    var withReferences = _ref2.withReferences;
    var board, threadPostNumbers, postNumbers;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context6.next = 3;
              break;
            }

            return _context6.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context6.next = 6;
              break;
            }

            return _context6.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid thread number'))));

          case 6:
            _context6.next = 8;
            return getThreadPostNumbers(boardName, threadNumber);

          case 8:
            threadPostNumbers = _context6.sent;
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
            _context6.next = 16;
            return PostsModel.getPosts(boardName, postNumbers, { withExtraData: withExtraData, withFileInfos: withFileInfos, withReferences: withReferences });

          case 16:
            return _context6.abrupt('return', _context6.sent);

          case 17:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function getThreadPosts(_x14, _x15, _x16) {
    return ref.apply(this, arguments);
  };
}();

var getThreadNumbers = exports.getThreadNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
    var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var archived = _ref3.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            source = archived ? ArchivedThreads : Threads;
            _context7.next = 3;
            return source.keys(boardName);

          case 3:
            return _context7.abrupt('return', _context7.sent);

          case 4:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getThreadNumbers(_x18, _x19) {
    return ref.apply(this, arguments);
  };
}();

var getThread = exports.getThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName, threadNumber, options) {
    var board, thread;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context8.next = 3;
              break;
            }

            return _context8.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context8.next = 6;
              break;
            }

            return _context8.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid thread number'))));

          case 6:
            _context8.next = 8;
            return Threads.getOne(threadNumber, boardName);

          case 8:
            thread = _context8.sent;

            if (thread) {
              _context8.next = 13;
              break;
            }

            _context8.next = 12;
            return ArchivedThreads.getOne(threadNumber, boardName);

          case 12:
            thread = _context8.sent;

          case 13:
            if (thread) {
              _context8.next = 15;
              break;
            }

            return _context8.abrupt('return', Promise.reject(new Error(Tools.translate('No such thread'))));

          case 15:
            _context8.next = 17;
            return addDataToThread(thread, options);

          case 17:
            return _context8.abrupt('return', thread);

          case 18:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getThread(_x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}();

var getThreads = exports.getThreads = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName, threadNumbers, options) {
    var board, threads, mayBeArchivedThreadNumbers, numbers, archivedThreads;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context10.next = 3;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

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
              _context10.next = 7;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid thread number'))));

          case 7:
            _context10.next = 9;
            return Threads.getSome(threadNumbers, boardName);

          case 9:
            threads = _context10.sent;

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
              _context10.next = 18;
              break;
            }

            numbers = mayBeArchivedThreadNumbers.map(function (thread) {
              return thread.threadNumber;
            });
            _context10.next = 16;
            return ArchivedThreads.getSome(numbers, boardName);

          case 16:
            archivedThreads = _context10.sent;

            archivedThreads.forEach(function (thread, index) {
              threads[mayBeArchivedThreadNumbers[index].index] = thread;
            });

          case 18:
            if (!(threads.length <= 0)) {
              _context10.next = 20;
              break;
            }

            return _context10.abrupt('return', []);

          case 20:
            _context10.next = 22;
            return Tools.series(threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(thread) {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return addDataToThread(thread, options);

                      case 2:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x27) {
                return ref.apply(this, arguments);
              };
            }());

          case 22:
            return _context10.abrupt('return', threads);

          case 23:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function getThreads(_x24, _x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var getThreadInfo = exports.getThreadInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, threadNumber, _ref4) {
    var lastPostNumber = _ref4.lastPostNumber;
    var board, thread, postCount, newPostCount;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context11.next = 3;
              break;
            }

            return _context11.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context11.next = 6;
              break;
            }

            return _context11.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid thread number'))));

          case 6:
            _context11.next = 8;
            return getThread(boardName, threadNumber, { withPostNumbers: true });

          case 8:
            thread = _context11.sent;

            if (thread) {
              _context11.next = 11;
              break;
            }

            return _context11.abrupt('return', thread);

          case 11:
            postCount = thread.postNumbers.length;

            lastPostNumber = Tools.option(lastPostNumber, 'number', 0, { test: Tools.testPostNumber });
            newPostCount = thread.postNumbers.filter(function (pn) {
              return pn > lastPostNumber;
            }).length;
            return _context11.abrupt('return', {
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
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function getThreadInfo(_x28, _x29, _x30) {
    return ref.apply(this, arguments);
  };
}();

var getThreadLastPostNumber = exports.getThreadLastPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName, threadNumber) {
    var threadPostNumbers;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context12.next = 2;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 2:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context12.next = 5;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid thread number'))));

          case 5:
            _context12.next = 7;
            return getThreadPostNumbers(boardName, threadNumber);

          case 7:
            threadPostNumbers = _context12.sent;
            return _context12.abrupt('return', threadPostNumbers.length > 0 ? (0, _underscore2.default)(threadPostNumbers).last() : 0);

          case 9:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function getThreadLastPostNumber(_x31, _x32) {
    return ref.apply(this, arguments);
  };
}();

var getThreadUpdateTime = exports.getThreadUpdateTime = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return ThreadUpdateTimes.getOne(threadNumber, boardName);

          case 2:
            return _context13.abrupt('return', _context13.sent);

          case 3:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function getThreadUpdateTime(_x33, _x34) {
    return ref.apply(this, arguments);
  };
}();

var getThreadsUpdateTimes = exports.getThreadsUpdateTimes = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName, threadNumbers) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            _context14.next = 2;
            return ThreadUpdateTimes.getSome(threadNumbers, boardName);

          case 2:
            return _context14.abrupt('return', _context14.sent);

          case 3:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function getThreadsUpdateTimes(_x35, _x36) {
    return ref.apply(this, arguments);
  };
}();

var setThreadUpdateTime = exports.setThreadUpdateTime = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, threadNumber, dateTme) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.next = 2;
            return ThreadUpdateTimes.setOne(threadNumber, dateTme, boardName);

          case 2:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function setThreadUpdateTime(_x37, _x38, _x39) {
    return ref.apply(this, arguments);
  };
}();

var isThreadDeleted = exports.isThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            return _context16.abrupt('return', DeletedThreads.contains(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function isThreadDeleted(_x40, _x41) {
    return ref.apply(this, arguments);
  };
}();

var setThreadDeleted = exports.setThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            return _context17.abrupt('return', DeletedThreads.addOne(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function setThreadDeleted(_x42, _x43) {
    return ref.apply(this, arguments);
  };
}();

var clearDeletedThreads = exports.clearDeletedThreads = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18() {
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            return _context18.abrupt('return', DeletedThreads.delete());

          case 1:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function clearDeletedThreads() {
    return ref.apply(this, arguments);
  };
}();

var removeThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(boardName, threadNumber) {
    var _ref5 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref5.archived;
    var leaveFileInfos = _ref5.leaveFileInfos;
    var leaveReferences = _ref5.leaveReferences;
    var source, key;
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            source = archived ? ArchivedThreads : Threads;
            key = boardName + ':' + threadNumber;
            _context21.next = 4;
            return ThreadsPlannedForDeletion.addOne(key);

          case 4:
            _context21.next = 6;
            return source.deleteOne(threadNumber, boardName);

          case 6:
            _context21.next = 8;
            return ThreadUpdateTimes.deleteOne(threadNumber, boardName);

          case 8:
            setTimeout(_asyncToGenerator(regeneratorRuntime.mark(function _callee20() {
              var postNumbers;
              return regeneratorRuntime.wrap(function _callee20$(_context20) {
                while (1) {
                  switch (_context20.prev = _context20.next) {
                    case 0:
                      _context20.prev = 0;
                      _context20.next = 3;
                      return getThreadPostNumbers(boardName, threadNumber);

                    case 3:
                      postNumbers = _context20.sent;
                      _context20.next = 6;
                      return ThreadPostNumbers.delete(key);

                    case 6:
                      _context20.next = 8;
                      return Tools.series(postNumbers, function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(postNumber) {
                          return regeneratorRuntime.wrap(function _callee19$(_context19) {
                            while (1) {
                              switch (_context19.prev = _context19.next) {
                                case 0:
                                  _context19.next = 2;
                                  return PostsModel.removePost(boardName, postNumber, {
                                    leaveFileInfos: leaveFileInfos,
                                    leaveReferences: leaveReferences,
                                    removingThread: true
                                  });

                                case 2:
                                  return _context19.abrupt('return', _context19.sent);

                                case 3:
                                case 'end':
                                  return _context19.stop();
                              }
                            }
                          }, _callee19, this);
                        }));

                        return function (_x48) {
                          return ref.apply(this, arguments);
                        };
                      }());

                    case 8:
                      _context20.next = 10;
                      return ThreadsPlannedForDeletion.deleteOne(key);

                    case 10:
                      _context20.next = 15;
                      break;

                    case 12:
                      _context20.prev = 12;
                      _context20.t0 = _context20['catch'](0);

                      Logger.error(_context20.t0.stack || _context20.t0);

                    case 15:
                    case 'end':
                      return _context20.stop();
                  }
                }
              }, _callee20, this, [[0, 12]]);
            })), 5000); //TODO: This is not OK

          case 9:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function removeThread(_x44, _x45, _x46) {
    return ref.apply(this, arguments);
  };
}();

var pushOutOldThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(boardName) {
    var threadNumbers, threads, archivedThreadNumbers, archivedThreads, thread, postNumbers;
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            _context24.next = 2;
            return getThreadNumbers(boardName);

          case 2:
            threadNumbers = _context24.sent;
            _context24.next = 5;
            return getThreads(boardName, threadNumbers);

          case 5:
            threads = _context24.sent;

            threads.sort(sortThreadsByDate);

            if (!(threads.length < board.threadLimit)) {
              _context24.next = 9;
              break;
            }

            return _context24.abrupt('return');

          case 9:
            _context24.next = 11;
            return getThreadNumbers(boardName, { archived: true });

          case 11:
            archivedThreadNumbers = _context24.sent;
            _context24.next = 14;
            return getThreads(boardName, archivedThreadNumbers);

          case 14:
            archivedThreads = _context24.sent;

            archivedThreads.sort(sortThreadsByDate);

            if (!(archivedThreads.length > 0 && archivedThreads.length >= board.archiveLimit)) {
              _context24.next = 19;
              break;
            }

            _context24.next = 19;
            return removeThread(boardName, archivedThreads.pop().number, { archived: true });

          case 19:
            thread = threads.pop();

            if (!(board.archiveLimit <= 0)) {
              _context24.next = 24;
              break;
            }

            _context24.next = 23;
            return removeThread(boardName, thread.number);

          case 23:
            return _context24.abrupt('return');

          case 24:
            thread.archived = true;
            _context24.next = 27;
            return ArchivedThreads.setOne(thread.number, thread, boardName);

          case 27:
            _context24.next = 29;
            return Threads.deleteOne(thread.number, boardName);

          case 29:
            _context24.next = 31;
            return getThreadPostNumbers(boardName, thread.number);

          case 31:
            postNumbers = _context24.sent;
            _context24.next = 34;
            return Tools.series(postNumbers, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(postNumber) {
                return regeneratorRuntime.wrap(function _callee22$(_context22) {
                  while (1) {
                    switch (_context22.prev = _context22.next) {
                      case 0:
                        _context22.next = 2;
                        return Search.updatePostIndex(function (body) {
                          body.archived = true;
                          return body;
                        });

                      case 2:
                      case 'end':
                        return _context22.stop();
                    }
                  }
                }, _callee22, this);
              }));

              return function (_x50) {
                return ref.apply(this, arguments);
              };
            }());

          case 34:
            //NOTE: This is for the sake of speed.
            _asyncToGenerator(regeneratorRuntime.mark(function _callee23() {
              var archivePath, oldThreadNumber, sourceId, data, model;
              return regeneratorRuntime.wrap(function _callee23$(_context23) {
                while (1) {
                  switch (_context23.prev = _context23.next) {
                    case 0:
                      _context23.prev = 0;
                      archivePath = __dirname + '/../../public/' + boardName + '/arch';
                      oldThreadNumber = thread.number;
                      _context23.next = 5;
                      return (0, _mkpath2.default)(archivePath);

                    case 5:
                      sourceId = boardName + '/res/' + oldThreadNumber + '.json';
                      _context23.next = 8;
                      return Cache.readFile(sourceId);

                    case 8:
                      data = _context23.sent;
                      model = JSON.parse(data);

                      model.thread.archived = true;
                      _context23.next = 13;
                      return _fs2.default.write(archivePath + '/' + oldThreadNumber + '.json', JSON.stringify(model));

                    case 13:
                      _context23.next = 15;
                      return _board4.default.renderThreadHTML(model.thread, {
                        targetPath: archivePath + '/' + oldThreadNumber + '.html',
                        archived: true
                      });

                    case 15:
                      _context23.next = 17;
                      return Cache.removeFile(sourceId);

                    case 17:
                      _context23.next = 19;
                      return Cache.removeFile(boardName + '/res/' + oldThreadNumber + '.html');

                    case 19:
                      _context23.next = 24;
                      break;

                    case 21:
                      _context23.prev = 21;
                      _context23.t0 = _context23['catch'](0);

                      Logger.error(_context23.t0.stack || _context23.t0);

                    case 24:
                    case 'end':
                      return _context23.stop();
                  }
                }
              }, _callee23, this, [[0, 21]]);
            }))();

          case 35:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function pushOutOldThread(_x49) {
    return ref.apply(this, arguments);
  };
}();

var createThread = exports.createThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(req, fields, transaction) {
    var boardName, password, board, date, hashpass, threadNumber, thread;
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            boardName = fields.boardName;
            password = fields.password;
            board = _board2.default.board(boardName);

            if (board) {
              _context25.next = 5;
              break;
            }

            return _context25.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 5:
            if (board.postingEnabled) {
              _context25.next = 7;
              break;
            }

            return _context25.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled at this board'))));

          case 7:
            date = Tools.now();

            password = Tools.sha1(password);
            hashpass = req.hashpass || null;
            _context25.next = 12;
            return BoardsModel.nextPostNumber(boardName);

          case 12:
            threadNumber = _context25.sent;
            thread = {
              archived: false,
              boardName: boardName,
              closed: false,
              createdAt: date.toISOString(),
              fixed: false,
              unbumpable: false,
              number: threadNumber,
              user: {
                hashpass: hashpass,
                ip: req.ip,
                level: req.level(boardName),
                password: password
              }
            };

            transaction.setThreadNumber(threadNumber);
            _context25.next = 17;
            return Threads.setOne(threadNumber, thread, boardName);

          case 17:
            return _context25.abrupt('return', thread);

          case 18:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this);
  }));

  return function createThread(_x51, _x52, _x53) {
    return ref.apply(this, arguments);
  };
}();

var moveThread = exports.moveThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(sourceBoardName, threadNumber, targetBoardName) {
    var targetBoard, thread, sourcePath, sourceThumbPath, targetPath, targetThumbPath, posts, lastPostNumber, postNumberMap, _ref6, toRerender, toUpdate;

    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            targetBoard = _board2.default.board(targetBoardName);

            if (!(!targetBoard || !_board2.default.board(sourceBoardName))) {
              _context27.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context27.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context27.next = 8;
            return getThread(sourceBoardName, threadNumber, { withPostNumbers: true });

          case 8:
            thread = _context27.sent;

            if (thread) {
              _context27.next = 11;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 11:
            sourcePath = __dirname + '/../../public/' + sourceBoardName + '/src';
            sourceThumbPath = __dirname + '/../../public/' + sourceBoardName + '/thumb';
            targetPath = __dirname + '/../../public/' + targetBoardName + '/src';
            targetThumbPath = __dirname + '/../../public/' + targetBoardName + '/thumb';
            _context27.next = 17;
            return (0, _mkpath2.default)(targetPath);

          case 17:
            _context27.next = 19;
            return (0, _mkpath2.default)(targetThumbPath);

          case 19:
            delete thread.updatedAt;
            _context27.next = 22;
            return PostsModel.getPosts(sourceBoardName, thread.postNumbers, {
              withFileInfos: true,
              withReferences: true,
              withExtraData: true
            });

          case 22:
            posts = _context27.sent;

            delete thread.postNumbers;
            _context27.next = 26;
            return BoardsModel.nextPostNumber(targetBoardName, posts.length);

          case 26:
            lastPostNumber = _context27.sent;

            lastPostNumber = lastPostNumber - posts.length + 1;
            thread.number = lastPostNumber;
            postNumberMap = posts.reduce(function (acc, post) {
              acc.set(post.number, lastPostNumber++);
              return acc;
            }, new Map());
            _context27.next = 32;
            return PostsModel.processMovedThreadPosts({
              posts: posts,
              postNumberMap: postNumberMap,
              threadNumber: thread.number,
              targetBoard: targetBoard,
              sourceBoardName: sourceBoardName,
              sourcePath: sourcePath,
              sourceThumbPath: sourceThumbPath,
              targetPath: targetPath,
              targetThumbPath: targetThumbPath
            });

          case 32:
            _ref6 = _context27.sent;
            toRerender = _ref6.toRerender;
            toUpdate = _ref6.toUpdate;
            _context27.next = 37;
            return Threads.setOne(thead.number, thread, targetBoardName);

          case 37:
            _context27.next = 39;
            return ThreadUpdateTimes.setOne(thread.number, Tools.now().toISOString(), targetBoardName);

          case 39:
            _context27.next = 41;
            return ThreadPostNumbers.addSome((0, _underscore2.default)(postNumberMap).toArray(), targetBoardName + ':' + thread.number);

          case 41:
            _context27.next = 43;
            return PostsModel.processMovedThreadRelatedPosts({
              posts: toRerender,
              sourceBoardName: sourceBoardName,
              postNumberMap: postNumberMap
            });

          case 43:
            _context27.next = 45;
            return Tools.series(toUpdate, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(o) {
                return regeneratorRuntime.wrap(function _callee26$(_context26) {
                  while (1) {
                    switch (_context26.prev = _context26.next) {
                      case 0:
                        _context26.next = 2;
                        return IPC.render(o.boardName, o.threadNumber, o.threadNumber, 'create');

                      case 2:
                        return _context26.abrupt('return', _context26.sent);

                      case 3:
                      case 'end':
                        return _context26.stop();
                    }
                  }
                }, _callee26, this);
              }));

              return function (_x57) {
                return ref.apply(this, arguments);
              };
            }());

          case 45:
            _context27.next = 47;
            return removeThread(sourceBoardName, threadNumber, {
              leaveFileInfos: true,
              leaveReferences: true
            });

          case 47:
            IPC.render(sourceBoardName, threadNumber, threadNumber, 'delete');
            _context27.next = 50;
            return IPC.render(targetBoardName, thread.number, thread.number, 'create');

          case 50:
            return _context27.abrupt('return', {
              boardName: targetBoardName,
              threadNumber: thread.number
            });

          case 51:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function moveThread(_x54, _x55, _x56) {
    return ref.apply(this, arguments);
  };
}();

var setThreadFixed = exports.setThreadFixed = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee28(boardName, threadNumber, fixed) {
    var thread;
    return regeneratorRuntime.wrap(function _callee28$(_context28) {
      while (1) {
        switch (_context28.prev = _context28.next) {
          case 0:
            _context28.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context28.sent;

            if (thread) {
              _context28.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            fixed = !!fixed;

            if (!(fixed === !!thread.fixed)) {
              _context28.next = 8;
              break;
            }

            return _context28.abrupt('return');

          case 8:
            thread.fixed = fixed;
            _context28.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context28.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context28.stop();
        }
      }
    }, _callee28, this);
  }));

  return function setThreadFixed(_x58, _x59, _x60) {
    return ref.apply(this, arguments);
  };
}();

var setThreadClosed = exports.setThreadClosed = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee29(boardName, threadNumber, closed) {
    var thread;
    return regeneratorRuntime.wrap(function _callee29$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            _context29.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context29.sent;

            if (thread) {
              _context29.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            closed = !!closed;

            if (!(closed === !!thread.closed)) {
              _context29.next = 8;
              break;
            }

            return _context29.abrupt('return');

          case 8:
            thread.closed = closed;
            _context29.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context29.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context29.stop();
        }
      }
    }, _callee29, this);
  }));

  return function setThreadClosed(_x61, _x62, _x63) {
    return ref.apply(this, arguments);
  };
}();

var setThreadUnbumpable = exports.setThreadUnbumpable = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee30(boardName, threadNumber, unbumpable) {
    var thread;
    return regeneratorRuntime.wrap(function _callee30$(_context30) {
      while (1) {
        switch (_context30.prev = _context30.next) {
          case 0:
            _context30.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context30.sent;

            if (thread) {
              _context30.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            unbumpable = !!unbumpable;

            if (!(unbumpable === !!thread.unbumpable)) {
              _context30.next = 8;
              break;
            }

            return _context30.abrupt('return');

          case 8:
            thread.unbumpable = unbumpable;
            _context30.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context30.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context30.stop();
        }
      }
    }, _callee30, this);
  }));

  return function setThreadUnbumpable(_x64, _x65, _x66) {
    return ref.apply(this, arguments);
  };
}();

exports.sortThreadsByDate = sortThreadsByDate;
exports.sortThreadsByCreationDate = sortThreadsByCreationDate;
exports.sortThreadsByPostCount = sortThreadsByPostCount;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkpath = require('mkpath');

var _mkpath2 = _interopRequireDefault(_mkpath);

var _boards = require('./boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _board3 = require('../controllers/board');

var _board4 = _interopRequireDefault(_board3);

var _search = require('../core/search');

var Search = _interopRequireWildcard(_search);

var _cache = require('../helpers/cache');

var Cache = _interopRequireWildcard(_cache);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ArchivedThreads = new _hash2.default((0, _redisClientFactory2.default)(), 'archivedThreads');
var DeletedThreads = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'deletedThreads', {
  parse: false,
  stringify: false
});
var ThreadPostNumbers = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'threadPostNumbers', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});
var Threads = new _hash2.default((0, _redisClientFactory2.default)(), 'threads');
var ThreadsPlannedForDeletion = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'threadsPlannedForDeletion', {
  parse: false,
  stringify: false
});
var ThreadUpdateTimes = new _hash2.default((0, _redisClientFactory2.default)(), 'threadUpdateTimes', {
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
