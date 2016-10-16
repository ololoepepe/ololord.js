'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delall = exports.initialize = exports.nextPostNumber = exports.getPageCount = exports.getLastPostNumbers = exports.getLastPostNumber = exports.getArchive = exports.getCatalog = exports.getPage = exports.getThread = undefined;

var getThread = exports.getThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber) {
    var board, thread, posts;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context.next = 5;
            return ThreadsModel.getThread(boardName, threadNumber);

          case 5:
            thread = _context.sent;
            _context.next = 8;
            return PostsModel.getThreadPosts(boardName, threadNumber);

          case 8:
            posts = _context.sent;

            thread.postCount = posts.length;

            if (!(thread.postCount <= 0)) {
              _context.next = 12;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 12:
            thread.opPost = posts.splice(0, 1)[0];
            thread.lastPosts = posts;
            thread.title = postSubject(thread.opPost, 50) || null;
            addDataToThread(thread, board);
            return _context.abrupt('return', thread);

          case 17:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThread(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var getPage = exports.getPage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, pageNumber) {
    var board, pageCount, threads, Post, lastPostNumber;
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
            pageNumber = Tools.option(pageNumber, 'number', -1, { test: function test(n) {
                return n >= 0;
              } });
            pageCount = pageCounts.get(boardName);

            if (!(pageNumber < 0 || pageNumber >= pageCount)) {
              _context3.next = 7;
              break;
            }

            throw new Error(Tools.translate('Invalid page number'));

          case 7:
            _context3.next = 9;
            return ThreadsModel.getThreads(boardName, {
              sort: true,
              limit: board.threadsPerPage,
              offset: pageNumber * board.threadsPerPage
            });

          case 9:
            threads = _context3.sent;
            _context3.next = 12;
            return client.collection('post');

          case 12:
            Post = _context3.sent;
            _context3.next = 15;
            return Tools.series(threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(thread) {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return PostsModel.getPost(boardName, thread.number, {
                          withExtraData: true,
                          withFileInfos: true,
                          withReferences: true
                        });

                      case 2:
                        thread.opPost = _context2.sent;
                        _context2.next = 5;
                        return PostsModel.getThreadPosts(boardName, thread.number, {
                          limit: board.maxLastPosts,
                          offset: 1,
                          sort: true
                        });

                      case 5:
                        thread.lastPosts = _context2.sent;
                        _context2.next = 8;
                        return ThreadsModel.getThreadPostCount(boardName, thread.number);

                      case 8:
                        thread.postCount = _context2.sent;

                        addDataToThread(thread, board);
                        if (thread.postCount > board.maxLastPosts + 1) {
                          thread.omittedPosts = thread.postCount - board.maxLastPosts - 1;
                        } else {
                          thread.omittedPosts = 0;
                        }

                      case 11:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, this);
              }));

              return function (_x5) {
                return ref.apply(this, arguments);
              };
            }());

          case 15:
            threads = threads.filter(function (thread) {
              return thread.opPost && thread.postCount > 0;
            });
            _context3.next = 18;
            return getLastPostNumber(boardName);

          case 18:
            lastPostNumber = _context3.sent;
            return _context3.abrupt('return', {
              threads: threads,
              pageCount: pageCount,
              currentPage: pageNumber,
              lastPostNumber: lastPostNumber,
              postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 20:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getPage(_x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var getCatalog = exports.getCatalog = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, sortMode) {
    var board, threads, Post, sortFunction, lastPostNumber;
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
            return ThreadsModel.getThreads(boardName);

          case 5:
            threads = _context5.sent;
            _context5.next = 8;
            return client.collection('post');

          case 8:
            Post = _context5.sent;
            _context5.next = 11;
            return Tools.series(threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(thread) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.next = 2;
                        return PostsModel.getPost(boardName, thread.number, {
                          withFileInfos: true,
                          withReferences: true
                        });

                      case 2:
                        thread.opPost = _context4.sent;
                        _context4.next = 5;
                        return ThreadsModel.getThreadPostCount(boardName, thread.number);

                      case 5:
                        thread.postCount = _context4.sent;

                        addDataToThread(thread, board);

                      case 7:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function (_x8) {
                return ref.apply(this, arguments);
              };
            }());

          case 11:
            sortFunction = ThreadsModel.sortThreadsByCreationDate;
            _context5.t0 = (sortMode || 'date').toLowerCase();
            _context5.next = _context5.t0 === 'recent' ? 15 : _context5.t0 === 'bumps' ? 17 : 19;
            break;

          case 15:
            sortFunction = ThreadsModel.sortThreadsByDate;
            return _context5.abrupt('break', 20);

          case 17:
            sortFunction = ThreadsModel.sortThreadsByPostCount;
            return _context5.abrupt('break', 20);

          case 19:
            return _context5.abrupt('break', 20);

          case 20:
            _context5.next = 22;
            return getLastPostNumber(boardName);

          case 22:
            lastPostNumber = _context5.sent;
            return _context5.abrupt('return', {
              threads: threads.sort(sortFunction),
              lastPostNumber: lastPostNumber,
              postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 24:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getCatalog(_x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var getArchive = exports.getArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
    var board, path, exists, fileNames, threads, lastPostNumber;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context7.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            path = __dirname + '/../../public/' + boardName + '/arch';
            _context7.next = 6;
            return _fs2.default.exists(path);

          case 6:
            exists = _context7.sent;

            if (!exists) {
              _context7.next = 13;
              break;
            }

            _context7.next = 10;
            return _fs2.default.list(path);

          case 10:
            fileNames = _context7.sent;
            _context7.next = 14;
            break;

          case 13:
            fileNames = [];

          case 14:
            fileNames = fileNames.filter(function (fileName) {
              return fileName.split('.').pop() === 'json';
            });
            _context7.next = 17;
            return Tools.series(fileNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(fileName) {
                var stats;
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return _fs2.default.stat(path + '/' + fileName);

                      case 2:
                        stats = _context6.sent;
                        return _context6.abrupt('return', {
                          boardName: boardName,
                          number: +fileName.split('.').shift(),
                          birthtime: stats.node.birthtime.valueOf()
                        });

                      case 4:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x10) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 17:
            threads = _context7.sent;
            _context7.next = 20;
            return getLastPostNumber(boardName);

          case 20:
            lastPostNumber = _context7.sent;
            return _context7.abrupt('return', {
              threads: threads.sort(function (t1, t2) {
                return t2 - t1;
              }), //NOTE: The order is correct (t2 - t1).
              lastPostNumber: lastPostNumber,
              postingSpeed: Renderer.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 22:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getArchive(_x9) {
    return ref.apply(this, arguments);
  };
}();

var getLastPostNumber = exports.getLastPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName) {
    var PostCounter, result;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context8.next = 2;
              break;
            }

            throw new Error(Tools.translate('Invalid boardName'));

          case 2:
            _context8.next = 4;
            return client.collection('postCounter');

          case 4:
            PostCounter = _context8.sent;
            _context8.next = 7;
            return PostCounter.findOne({ _id: boardName }, { lastPostNumber: 1 });

          case 7:
            result = _context8.sent;
            return _context8.abrupt('return', result ? result.lastPostNumber : 0);

          case 9:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getLastPostNumber(_x11) {
    return ref.apply(this, arguments);
  };
}();

var getLastPostNumbers = exports.getLastPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardNames) {
    var PostCounter, query, result;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            if (!(0, _underscore2.default)(boardNames).isArray()) {
              boardNames = [boardNames];
            }

            if (!boardNames.some(function (boardName) {
              return !_board2.default.board(boardName);
            })) {
              _context9.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid boardName'));

          case 3:
            _context9.next = 5;
            return client.collection('postCounter');

          case 5:
            PostCounter = _context9.sent;
            query = {
              _id: { $in: boardNames }
            };
            _context9.next = 9;
            return PostCounter.find(query).toArray();

          case 9:
            result = _context9.sent;
            return _context9.abrupt('return', result.reduce(function (acc, _ref) {
              var _id = _ref._id;
              var lastPostNumber = _ref.lastPostNumber;

              acc[_id] = lastPostNumber;
              return acc;
            }, {}));

          case 11:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function getLastPostNumbers(_x12) {
    return ref.apply(this, arguments);
  };
}();

var getPageCount = exports.getPageCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName) {
    var board, Thread, threadCount, pageCount;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context10.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context10.next = 5;
            return client.collection('thread');

          case 5:
            Thread = _context10.sent;
            _context10.next = 8;
            return ThreadsModel.getThreadCount(boardName);

          case 8:
            threadCount = _context10.sent;
            pageCount = Math.ceil(threadCount / board.threadsPerPage) || 1;

            pageCounts.set(boardName, pageCount);
            return _context10.abrupt('return', pageCount);

          case 12:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function getPageCount(_x13) {
    return ref.apply(this, arguments);
  };
}();

var nextPostNumber = exports.nextPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, incrementBy) {
    var board, PostCounter, result, lastPostNumber;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context11.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            incrementBy = Tools.option(incrementBy, 'number', 1, { test: function test(i) {
                return i >= 1;
              } });
            _context11.next = 6;
            return client.collection('postCounter');

          case 6:
            PostCounter = _context11.sent;
            _context11.next = 9;
            return PostCounter.findOneAndUpdate({ _id: boardName }, {
              $inc: { lastPostNumber: incrementBy }
            }, {
              projection: { lastPostNumber: 1 },
              upsert: true,
              returnOriginal: false
            });

          case 9:
            result = _context11.sent;

            if (result) {
              _context11.next = 12;
              break;
            }

            return _context11.abrupt('return', 0);

          case 12:
            lastPostNumber = result.value.lastPostNumber;
            //TODO: improve get skipping

            if (!(1 === incrementBy && board.skippedGetOrder > 0 && !(lastPostNumber % Math.pow(10, board.skippedGetOrder)))) {
              _context11.next = 17;
              break;
            }

            _context11.next = 16;
            return nextPostNumber(boardName, incrementBy);

          case 16:
            return _context11.abrupt('return', _context11.sent);

          case 17:
            return _context11.abrupt('return', lastPostNumber);

          case 18:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function nextPostNumber(_x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var initialize = exports.initialize = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return Tools.series(_board2.default.boardNames(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName) {
                return regeneratorRuntime.wrap(function _callee12$(_context12) {
                  while (1) {
                    switch (_context12.prev = _context12.next) {
                      case 0:
                        _context12.next = 2;
                        return getPageCount(boardName);

                      case 2:
                      case 'end':
                        return _context12.stop();
                    }
                  }
                }, _callee12, this);
              }));

              return function (_x16) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            _context13.next = 4;
            return ThreadsModel.clearDeletedThreads();

          case 4:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function initialize() {
    return ref.apply(this, arguments);
  };
}();

var delall = exports.delall = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(req, ip, boardNames) {
    var deletedThreads, updatedThreads, deletedPosts, Post;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            ip = Tools.correctAddress(ip);

            if (ip) {
              _context19.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid IP address'));

          case 3:
            deletedThreads = {};
            updatedThreads = {};
            deletedPosts = {};
            _context19.next = 8;
            return client.collection('post');

          case 8:
            Post = _context19.sent;
            _context19.next = 11;
            return Tools.series(boardNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName) {
                var posts;
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        _context14.next = 2;
                        return Post.find({
                          boardName: boardName,
                          'user.ip': ip
                        }, {
                          number: 1,
                          threadNumber: 1
                        }).toArray();

                      case 2:
                        posts = _context14.sent;

                        posts.forEach(function (post) {
                          if (post.threadNumber === post.number) {
                            deletedThreads[boardName + ':' + post.threadNumber] = {
                              boardName: boardName,
                              number: post.threadNumber
                            };
                          }
                        });
                        posts.filter(function (post) {
                          return !deletedThreads.hasOwnProperty(boardName + ':' + post.threadNumber);
                        }).forEach(function (post) {
                          updatedThreads[boardName + ':' + post.threadNumber] = {
                            boardName: boardName,
                            number: post.threadNumber
                          };
                          deletedPosts[boardName + ':' + post.number] = {
                            boardName: boardName,
                            number: post.number,
                            threadNumber: post.threadNumber
                          };
                        });

                      case 5:
                      case 'end':
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function (_x20) {
                return ref.apply(this, arguments);
              };
            }());

          case 11:
            _context19.next = 13;
            return Tools.series(deletedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(post) {
                return regeneratorRuntime.wrap(function _callee15$(_context15) {
                  while (1) {
                    switch (_context15.prev = _context15.next) {
                      case 0:
                        _context15.next = 2;
                        return Post.deleteOne({
                          boardName: post.boardName,
                          number: post.number
                        });

                      case 2:
                        _context15.next = 4;
                        return PostsModel.removePostData(post.boardName, post.number, post.threadNumber);

                      case 4:
                      case 'end':
                        return _context15.stop();
                    }
                  }
                }, _callee15, this);
              }));

              return function (_x21) {
                return ref.apply(this, arguments);
              };
            }());

          case 13:
            _context19.next = 15;
            return Tools.series(deletedThreads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(thread) {
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        _context16.next = 2;
                        return ThreadsModel.removeThread(thread.boardName, thread.number);

                      case 2:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x22) {
                return ref.apply(this, arguments);
              };
            }());

          case 15:
            _context19.next = 17;
            return Tools.series(updatedThreads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(thread) {
                return regeneratorRuntime.wrap(function _callee17$(_context17) {
                  while (1) {
                    switch (_context17.prev = _context17.next) {
                      case 0:
                        _context17.next = 2;
                        return IPC.render(thread.boardName, thread.number, thread.number, 'edit');

                      case 2:
                      case 'end':
                        return _context17.stop();
                    }
                  }
                }, _callee17, this);
              }));

              return function (_x23) {
                return ref.apply(this, arguments);
              };
            }());

          case 17:
            _context19.next = 19;
            return Tools.series(deletedThreads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(thread) {
                return regeneratorRuntime.wrap(function _callee18$(_context18) {
                  while (1) {
                    switch (_context18.prev = _context18.next) {
                      case 0:
                        _context18.next = 2;
                        return IPC.render(thread.boardName, thread.number, thread.number, 'delete');

                      case 2:
                      case 'end':
                        return _context18.stop();
                    }
                  }
                }, _callee18, this);
              }));

              return function (_x24) {
                return ref.apply(this, arguments);
              };
            }());

          case 19:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function delall(_x17, _x18, _x19) {
    return ref.apply(this, arguments);
  };
}();

exports.postSubject = postSubject;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _misc = require('./misc');

var MiscModel = _interopRequireWildcard(_misc);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _threads = require('./threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();
var pageCounts = new Map();

function addDataToThread(thread, board) {
  thread.bumpLimit = board.bumpLimit;
  thread.postLimit = board.postLimit;
  thread.bumpLimitReached = thread.postCount >= board.bumpLimit;
  thread.postLimitReached = thread.postCount >= board.postLimit;
  thread.postingEnabled = board.postingEnabled && !thread.closed;
}

function postSubject(post, maxLength) {
  var subject = '';
  if (post.subject) {
    subject = post.subject;
  } else if (post.text) {
    subject = Renderer.plainText(post.text);
  }
  subject = subject.replace(/\r*\n+/gi, '');
  maxLength = Tools.option(maxLength, 'number', 0, { test: function test(l) {
      return l > 0;
    } });
  if (maxLength > 1 && subject.length > maxLength) {
    subject = subject.substr(0, maxLength - 1) + '…';
  }
  return subject;
}
//# sourceMappingURL=boards.js.map
