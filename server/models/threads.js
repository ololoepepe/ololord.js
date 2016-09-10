'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setThreadUnbumpable = exports.setThreadClosed = exports.setThreadFixed = exports.moveThread = exports.createThread = exports.clearDeletedThreads = exports.setThreadDeleted = exports.isThreadDeleted = exports.setThreadUpdateTime = exports.getThreadLastPostNumber = exports.getThreadInfo = exports.getThreads = exports.getThread = exports.getThreadNumbers = exports.getThreadPosts = exports.removeThreadPostNumber = exports.addThreadPostNumber = exports.getThreadPostNumbers = exports.getThreadPostCount = undefined;

var getThreadPostCount = exports.getThreadPostCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            source = archived ? ArchivedThreadPostNumbers : ThreadPostNumbers;
            _context.next = 3;
            return source.count(boardName + ':' + threadNumber);

          case 3:
            return _context.abrupt('return', _context.sent);

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThreadPostCount(_x, _x2, _x3) {
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

            if (!(!postNumbers || postNumbers.length <= 0)) {
              _context2.next = 7;
              break;
            }

            _context2.next = 6;
            return ArchivedThreadPostNumbers.getAll(boardName + ':' + threadNumber);

          case 6:
            postNumbers = _context2.sent;

          case 7:
            return _context2.abrupt('return', postNumbers.sort(function (a, b) {
              return a - b;
            }));

          case 8:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getThreadPostNumbers(_x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var addThreadPostNumber = exports.addThreadPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber, postNumber) {
    var _ref2 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref2.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            source = archived ? ArchivedThreadPostNumbers : ThreadPostNumbers;
            _context3.next = 3;
            return source.addOne(postNumber, boardName + ':' + threadNumber);

          case 3:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function addThreadPostNumber(_x7, _x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var removeThreadPostNumber = exports.removeThreadPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber, postNumber) {
    var _ref3 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref3.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            source = archived ? ArchivedThreadPostNumbers : ThreadPostNumbers;
            _context4.next = 3;
            return source.deleteOne(postNumber, boardName + ':' + threadNumber);

          case 3:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function removeThreadPostNumber(_x12, _x13, _x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var addDataToThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(thread) {
    var _ref4 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var withPostNumbers = _ref4.withPostNumbers;
    var source;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            source = thread.archived ? ArchivedThreadUpdateTimes : ThreadUpdateTimes;
            _context5.next = 3;
            return source.getOne(thread.number, thread.boardName);

          case 3:
            thread.updatedAt = _context5.sent;

            if (!withPostNumbers) {
              _context5.next = 8;
              break;
            }

            _context5.next = 7;
            return getThreadPostNumbers(thread.boardName, thread.number);

          case 7:
            thread.postNumbers = _context5.sent;

          case 8:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function addDataToThread(_x17, _x18) {
    return ref.apply(this, arguments);
  };
}();

var getThreadPosts = exports.getThreadPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, threadNumber) {
    var _ref5 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var reverse = _ref5.reverse;
    var limit = _ref5.limit;
    var notOP = _ref5.notOP;
    var withExtraData = _ref5.withExtraData;
    var withFileInfos = _ref5.withFileInfos;
    var withReferences = _ref5.withReferences;
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

  return function getThreadPosts(_x20, _x21, _x22) {
    return ref.apply(this, arguments);
  };
}();

var getThreadNumbers = exports.getThreadNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
    var _ref6 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var archived = _ref6.archived;
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

  return function getThreadNumbers(_x24, _x25) {
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

  return function getThread(_x27, _x28, _x29) {
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

              return function (_x33) {
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

  return function getThreads(_x30, _x31, _x32) {
    return ref.apply(this, arguments);
  };
}();

var getThreadInfo = exports.getThreadInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, threadNumber, _ref7) {
    var lastPostNumber = _ref7.lastPostNumber;
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

  return function getThreadInfo(_x34, _x35, _x36) {
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

  return function getThreadLastPostNumber(_x37, _x38) {
    return ref.apply(this, arguments);
  };
}();

var setThreadUpdateTime = exports.setThreadUpdateTime = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(boardName, threadNumber, dateTme) {
    var _ref8 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref8.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            source = archived ? ArchivedThreadUpdateTimes : ThreadUpdateTimes;
            _context13.next = 3;
            return source.setOne(threadNumber, dateTme, boardName);

          case 3:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function setThreadUpdateTime(_x39, _x40, _x41, _x42) {
    return ref.apply(this, arguments);
  };
}();

var isThreadDeleted = exports.isThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            return _context14.abrupt('return', DeletedThreads.contains(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function isThreadDeleted(_x44, _x45) {
    return ref.apply(this, arguments);
  };
}();

var setThreadDeleted = exports.setThreadDeleted = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            return _context15.abrupt('return', DeletedThreads.addOne(boardName + ':' + threadNumber));

          case 1:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function setThreadDeleted(_x46, _x47) {
    return ref.apply(this, arguments);
  };
}();

var clearDeletedThreads = exports.clearDeletedThreads = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16() {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            return _context16.abrupt('return', DeletedThreads.delete());

          case 1:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function clearDeletedThreads() {
    return ref.apply(this, arguments);
  };
}();

var removeThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(boardName, threadNumber) {
    var _ref9 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref9.archived;
    var leaveFileInfos = _ref9.leaveFileInfos;
    var leaveReferences = _ref9.leaveReferences;
    var source, key, updateTimeSource;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            source = archived ? ArchivedThreads : Threads;
            key = boardName + ':' + threadNumber;
            _context19.next = 4;
            return ThreadsPlannedForDeletion.addOne(key);

          case 4:
            _context19.next = 6;
            return source.deleteOne(threadNumber, boardName);

          case 6:
            updateTimeSource = archived ? ArchivedThreadUpdateTimes : ThreadUpdateTimes;
            _context19.next = 9;
            return updateTimeSource.deleteOne(threadNumber, boardName);

          case 9:
            setTimeout(_asyncToGenerator(regeneratorRuntime.mark(function _callee18() {
              var postNumbers, postNumbersSource;
              return regeneratorRuntime.wrap(function _callee18$(_context18) {
                while (1) {
                  switch (_context18.prev = _context18.next) {
                    case 0:
                      _context18.prev = 0;
                      _context18.next = 3;
                      return getThreadPostNumbers(boardName, threadNumber);

                    case 3:
                      postNumbers = _context18.sent;
                      postNumbersSource = archived ? ArchivedThreadPostNumbers : ThreadPostNumbers;
                      _context18.next = 7;
                      return postNumbersSource.delete(key);

                    case 7:
                      _context18.next = 9;
                      return Tools.series(postNumbers, function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(postNumber) {
                          return regeneratorRuntime.wrap(function _callee17$(_context17) {
                            while (1) {
                              switch (_context17.prev = _context17.next) {
                                case 0:
                                  _context17.next = 2;
                                  return PostsModel.removePost(boardName, postNumber, {
                                    leaveFileInfos: leaveFileInfos,
                                    leaveReferences: leaveReferences,
                                    removingThread: true
                                  });

                                case 2:
                                  return _context17.abrupt('return', _context17.sent);

                                case 3:
                                case 'end':
                                  return _context17.stop();
                              }
                            }
                          }, _callee17, this);
                        }));

                        return function (_x52) {
                          return ref.apply(this, arguments);
                        };
                      }());

                    case 9:
                      _context18.next = 11;
                      return ThreadsPlannedForDeletion.deleteOne(key);

                    case 11:
                      _context18.next = 16;
                      break;

                    case 13:
                      _context18.prev = 13;
                      _context18.t0 = _context18['catch'](0);

                      Logger.error(_context18.t0.stack || _context18.t0);

                    case 16:
                    case 'end':
                      return _context18.stop();
                  }
                }
              }, _callee18, this, [[0, 13]]);
            })), 5000); //TODO: This is not OK

          case 10:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function removeThread(_x48, _x49, _x50) {
    return ref.apply(this, arguments);
  };
}();

var pushOutOldThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(boardName) {
    var client, threadNumbers, threads, archivedThreadNumbers, archivedThreads, thread, key, postNumbers, archivePath, oldThreadNumber, sourceId, data, model;
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            _context21.prev = 0;
            _context21.next = 3;
            return (0, _sqlClientFactory2.default)();

          case 3:
            client = _context21.sent;
            _context21.next = 6;
            return client.transaction();

          case 6:
            _context21.next = 8;
            return getThreadNumbers(boardName);

          case 8:
            threadNumbers = _context21.sent;
            _context21.next = 11;
            return getThreads(boardName, threadNumbers);

          case 11:
            threads = _context21.sent;

            threads.sort(sortThreadsByDate);

            if (!(threads.length < board.threadLimit)) {
              _context21.next = 15;
              break;
            }

            return _context21.abrupt('return');

          case 15:
            _context21.next = 17;
            return getThreadNumbers(boardName, { archived: true });

          case 17:
            archivedThreadNumbers = _context21.sent;
            _context21.next = 20;
            return getThreads(boardName, archivedThreadNumbers);

          case 20:
            archivedThreads = _context21.sent;

            archivedThreads.sort(sortThreadsByDate);

            if (!(archivedThreads.length > 0 && archivedThreads.length >= board.archiveLimit)) {
              _context21.next = 25;
              break;
            }

            _context21.next = 25;
            return removeThread(boardName, archivedThreads.pop().number, { archived: true });

          case 25:
            thread = threads.pop();

            if (!(board.archiveLimit <= 0)) {
              _context21.next = 30;
              break;
            }

            _context21.next = 29;
            return removeThread(boardName, thread.number);

          case 29:
            return _context21.abrupt('return');

          case 30:
            ArchivedThreadUpdateTimes.setOne(thread.number, thread.updatedAt, boardName);
            ThreadUpdateTimes.deleteOne(thread.number, boardName);
            thread.archived = true;
            delete thread.updatedAt;
            _context21.next = 36;
            return ArchivedThreads.setOne(thread.number, thread, boardName);

          case 36:
            _context21.next = 38;
            return Threads.deleteOne(thread.number, boardName);

          case 38:
            key = boardName + ':' + thread.number;
            _context21.next = 41;
            return getThreadPostNumbers(boardName, thread.number);

          case 41:
            postNumbers = _context21.sent;
            _context21.next = 44;
            return ArchivedThreadPostNumbers.addSome(postNumber, key);

          case 44:
            _context21.next = 46;
            return ThreadPostNumbers.delete(key);

          case 46:
            _context21.next = 48;
            return Tools.series(postNumbers, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(postNumber) {
                return regeneratorRuntime.wrap(function _callee20$(_context20) {
                  while (1) {
                    switch (_context20.prev = _context20.next) {
                      case 0:
                        _context20.next = 2;
                        return PostsModel.pushPostToArchive(boardName, postNumber);

                      case 2:
                      case 'end':
                        return _context20.stop();
                    }
                  }
                }, _callee20, this);
              }));

              return function (_x54) {
                return ref.apply(this, arguments);
              };
            }());

          case 48:
            client.commit();
            archivePath = __dirname + '/../../public/' + boardName + '/arch';
            oldThreadNumber = thread.number;
            _context21.next = 53;
            return mkpath(archivePath);

          case 53:
            sourceId = boardName + '/res/' + oldThreadNumber + '.json';
            _context21.next = 56;
            return Cache.readFile(sourceId);

          case 56:
            data = _context21.sent;
            model = JSON.parse(data);

            model.thread.archived = true;
            _context21.next = 61;
            return _fs2.default.write(archivePath + '/' + oldThreadNumber + '.json', JSON.stringify(model));

          case 61:
            _context21.next = 63;
            return _board4.default.renderThreadHTML(model.thread, {
              targetPath: archivePath + '/' + oldThreadNumber + '.html',
              archived: true
            });

          case 63:
            _context21.next = 65;
            return Cache.removeFile(sourceId);

          case 65:
            _context21.next = 67;
            return Cache.removeFile(boardName + '/res/' + oldThreadNumber + '.html');

          case 67:
            _context21.next = 72;
            break;

          case 69:
            _context21.prev = 69;
            _context21.t0 = _context21['catch'](0);

            Logger.error(_context21.t0.stack || _context21.t0);

          case 72:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this, [[0, 69]]);
  }));

  return function pushOutOldThread(_x53) {
    return ref.apply(this, arguments);
  };
}();

var createThread = exports.createThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(req, fields, transaction) {
    var boardName, password, board, date, hashpass, threadNumber, thread;
    return regeneratorRuntime.wrap(function _callee22$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            boardName = fields.boardName;
            password = fields.password;
            board = _board2.default.board(boardName);

            if (board) {
              _context22.next = 5;
              break;
            }

            return _context22.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 5:
            if (board.postingEnabled) {
              _context22.next = 7;
              break;
            }

            return _context22.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled at this board'))));

          case 7:
            pushOutOldThread(); //NOTE: No, "await" should not be here. Executing in parallel. This is for the sake of speed.
            date = Tools.now();

            password = Tools.sha1(password);
            hashpass = req.hashpass || null;
            _context22.next = 13;
            return BoardsModel.nextPostNumber(boardName);

          case 13:
            threadNumber = _context22.sent;
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
            _context22.next = 18;
            return Threads.setOne(threadNumber, thread, boardName);

          case 18:
            return _context22.abrupt('return', thread);

          case 19:
          case 'end':
            return _context22.stop();
        }
      }
    }, _callee22, this);
  }));

  return function createThread(_x55, _x56, _x57) {
    return ref.apply(this, arguments);
  };
}();

var moveThread = exports.moveThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(sourceBoardName, threadNumber, targetBoardName) {
    var targetBoard, thread, sourcePath, sourceThumbPath, targetPath, targetThumbPath, posts, lastPostNumber, postNumberMap, _ref10, toRerender, toUpdate;

    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            targetBoard = _board2.default.board(targetBoardName);

            if (!(!targetBoard || !_board2.default.board(sourceBoardName))) {
              _context24.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context24.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context24.next = 8;
            return getThread(sourceBoardName, threadNumber, { withPostNumbers: true });

          case 8:
            thread = _context24.sent;

            if (thread) {
              _context24.next = 11;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 11:
            sourcePath = __dirname + '/../../public/' + sourceBoardName + '/src';
            sourceThumbPath = __dirname + '/../../public/' + sourceBoardName + '/thumb';
            targetPath = __dirname + '/../../public/' + targetBoardName + '/src';
            targetThumbPath = __dirname + '/../../public/' + targetBoardName + '/thumb';
            _context24.next = 17;
            return mkpath(targetPath);

          case 17:
            _context24.next = 19;
            return mkpath(targetThumbPath);

          case 19:
            delete thread.updatedAt;
            _context24.next = 22;
            return PostsModel.getPosts(sourceBoardName, thread.postNumbers, {
              withFileInfos: true,
              withReferences: true,
              withExtraData: true
            });

          case 22:
            posts = _context24.sent;

            delete thread.postNumbers;
            _context24.next = 26;
            return BoardsModel.nextPostNumber(targetBoardName, posts.length);

          case 26:
            lastPostNumber = _context24.sent;

            lastPostNumber = lastPostNumber - posts.length + 1;
            thread.number = lastPostNumber;
            postNumberMap = posts.reduce(function (acc, post) {
              acc.set(post.number, lastPostNumber++);
              return acc;
            }, new Map());
            _context24.next = 32;
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
            _ref10 = _context24.sent;
            toRerender = _ref10.toRerender;
            toUpdate = _ref10.toUpdate;

            thread.boardName = targetBoardName;
            _context24.next = 38;
            return Threads.setOne(thead.number, thread, targetBoardName);

          case 38:
            _context24.next = 40;
            return ThreadUpdateTimes.setOne(thread.number, Tools.now().toISOString(), targetBoardName);

          case 40:
            _context24.next = 42;
            return ThreadPostNumbers.addSome((0, _underscore2.default)(postNumberMap).toArray(), targetBoardName + ':' + thread.number);

          case 42:
            _context24.next = 44;
            return PostsModel.processMovedThreadRelatedPosts({
              posts: toRerender,
              sourceBoardName: sourceBoardName,
              postNumberMap: postNumberMap
            });

          case 44:
            _context24.next = 46;
            return Tools.series(toUpdate, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(o) {
                return regeneratorRuntime.wrap(function _callee23$(_context23) {
                  while (1) {
                    switch (_context23.prev = _context23.next) {
                      case 0:
                        _context23.next = 2;
                        return IPC.render(o.boardName, o.threadNumber, o.threadNumber, 'create');

                      case 2:
                        return _context23.abrupt('return', _context23.sent);

                      case 3:
                      case 'end':
                        return _context23.stop();
                    }
                  }
                }, _callee23, this);
              }));

              return function (_x61) {
                return ref.apply(this, arguments);
              };
            }());

          case 46:
            _context24.next = 48;
            return removeThread(sourceBoardName, threadNumber, {
              leaveFileInfos: true,
              leaveReferences: true
            });

          case 48:
            IPC.render(sourceBoardName, threadNumber, threadNumber, 'delete');
            _context24.next = 51;
            return IPC.render(targetBoardName, thread.number, thread.number, 'create');

          case 51:
            return _context24.abrupt('return', {
              boardName: targetBoardName,
              threadNumber: thread.number
            });

          case 52:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function moveThread(_x58, _x59, _x60) {
    return ref.apply(this, arguments);
  };
}();

var setThreadFixed = exports.setThreadFixed = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(boardName, threadNumber, fixed) {
    var thread;
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            _context25.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context25.sent;

            if (thread) {
              _context25.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            fixed = !!fixed;

            if (!(fixed === !!thread.fixed)) {
              _context25.next = 8;
              break;
            }

            return _context25.abrupt('return');

          case 8:
            thread.fixed = fixed;
            _context25.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context25.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this);
  }));

  return function setThreadFixed(_x62, _x63, _x64) {
    return ref.apply(this, arguments);
  };
}();

var setThreadClosed = exports.setThreadClosed = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(boardName, threadNumber, closed) {
    var thread;
    return regeneratorRuntime.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            _context26.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context26.sent;

            if (thread) {
              _context26.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            closed = !!closed;

            if (!(closed === !!thread.closed)) {
              _context26.next = 8;
              break;
            }

            return _context26.abrupt('return');

          case 8:
            thread.closed = closed;
            _context26.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context26.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function setThreadClosed(_x65, _x66, _x67) {
    return ref.apply(this, arguments);
  };
}();

var setThreadUnbumpable = exports.setThreadUnbumpable = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(boardName, threadNumber, unbumpable) {
    var thread;
    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            _context27.next = 2;
            return getThread(boardName, threadNumber);

          case 2:
            thread = _context27.sent;

            if (thread) {
              _context27.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 5:
            unbumpable = !!unbumpable;

            if (!(unbumpable === !!thread.unbumpable)) {
              _context27.next = 8;
              break;
            }

            return _context27.abrupt('return');

          case 8:
            thread.unbumpable = unbumpable;
            _context27.next = 11;
            return Threads.setOne(threadNumber, thread, boardName);

          case 11:
            _context27.next = 13;
            return IPC.render(boardName, threadNumber, threadNumber, 'edit');

          case 13:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function setThreadUnbumpable(_x68, _x69, _x70) {
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

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

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

var _sqlClientFactory = require('../storage/sql-client-factory');

var _sqlClientFactory2 = _interopRequireDefault(_sqlClientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var ArchivedThreadPostNumbers = new _unorderedSet2.default((0, _sqlClientFactory2.default)(), 'archivedThreadPostNumbers', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});
var ArchivedThreads = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedThreads');
var ArchivedThreadUpdateTimes = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedThreadUpdateTimes', {
  parse: false,
  stringify: false
});
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
