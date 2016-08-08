'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initialize = exports.getPageCount = exports.getLastPostNumbers = exports.getLastPostNumber = exports.getArchive = exports.getCatalog = exports.getPage = exports.getThread = undefined;

var getThread = exports.getThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, threadNumber, archived) {
    var board, thread, posts;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context.next = 3;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context.next = 5;
            return ThreadsModel.getThread(boardName, threadNumber);

          case 5:
            thread = _context.sent;
            _context.next = 8;
            return ThreadsModel.getThreadPosts(boardName, threadNumber, {
              withExtraData: true,
              withFileInfos: true,
              withReferences: true
            });

          case 8:
            posts = _context.sent;

            thread.postCount = posts.length;
            thread.opPost = posts.splice(0, 1)[0];
            thread.lastPosts = posts;
            thread.title = postSubject(thread.opPost, 50) || null;
            thread.archived = !!archived;
            addDataToThread(thread, board);
            return _context.abrupt('return', thread);

          case 16:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getThread(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var getPage = exports.getPage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, pageNumber) {
    var board, pageCount, threadNumbers, start, threads, lastPostNumber;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context3.next = 3;
              break;
            }

            return _context3.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            pageNumber = Tools.option(pageNumber, 'number', -1, { test: function test(n) {
                return n >= 0;
              } });
            pageCount = pageCounts.get(boardName);

            if (!(pageNumber < 0 || pageNumber >= pageCount)) {
              _context3.next = 7;
              break;
            }

            return _context3.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid page number'))));

          case 7:
            _context3.next = 9;
            return ThreadsModel.getThreadNumbers(boardName);

          case 9:
            threadNumbers = _context3.sent;
            start = pageNumber * board.threadsPerPage;

            threadNumbers = threadNumbers.slice(start, start + board.threadsPerPage);
            _context3.next = 14;
            return ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });

          case 14:
            threads = _context3.sent;
            _context3.next = 17;
            return Tools.series(threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(thread) {
                var lastPosts;
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
                        return ThreadsModel.getThreadPosts(boardName, thread.number, {
                          limit: board.maxLastPosts,
                          reverse: true,
                          notOP: true,
                          withExtraData: true,
                          withFileInfos: true,
                          withReferences: true
                        });

                      case 5:
                        lastPosts = _context2.sent;

                        thread.lastPosts = lastPosts.reverse();
                        thread.postCount = thread.postNumbers.length;
                        delete thread.postNumbers;
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

              return function (_x6) {
                return ref.apply(this, arguments);
              };
            }());

          case 17:
            _context3.next = 19;
            return getLastPostNumber(boardName);

          case 19:
            lastPostNumber = _context3.sent;
            return _context3.abrupt('return', {
              threads: threads.sort(Board.sortThreadsByDate),
              pageCount: pageCount,
              currentPage: pageNumber,
              lastPostNumber: lastPostNumber,
              postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 21:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getPage(_x4, _x5) {
    return ref.apply(this, arguments);
  };
}();

var getCatalog = exports.getCatalog = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, sortMode) {
    var board, threadNumbers, threads, sortFunction, lastPostNumber;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context5.next = 5;
            return ThreadsModel.getThreadNumbers(boardName);

          case 5:
            threadNumbers = _context5.sent;
            _context5.next = 8;
            return ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });

          case 8:
            threads = _context5.sent;
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

                        thread.postCount = thread.postNumbers.length;
                        delete thread.postNumbers;
                        addDataToThread(thread, board);

                      case 6:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function (_x9) {
                return ref.apply(this, arguments);
              };
            }());

          case 11:
            sortFunction = Board.sortThreadsByCreationDate;
            _context5.t0 = (sortMode || 'date').toLowerCase();
            _context5.next = _context5.t0 === 'recent' ? 15 : _context5.t0 === 'bumps' ? 17 : 19;
            break;

          case 15:
            sortFunction = Board.sortThreadsByDate;
            return _context5.abrupt('break', 20);

          case 17:
            sortFunction = Board.sortThreadsByPostCount;
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
              postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 24:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getCatalog(_x7, _x8) {
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
            board = Board.board(boardName);

            if (board) {
              _context7.next = 3;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            path = __dirname + '/../public/' + boardName + '/arch';
            _context7.next = 6;
            return FS.exists(path);

          case 6:
            exists = _context7.sent;

            if (!exists) {
              _context7.next = 13;
              break;
            }

            _context7.next = 10;
            return FS.list(path);

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
                        return FS.stat(path + '/' + fileName);

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

              return function (_x11) {
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
              postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
            });

          case 22:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getArchive(_x10) {
    return ref.apply(this, arguments);
  };
}();

var getLastPostNumber = exports.getLastPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName) {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (Board.board(boardName)) {
              _context8.next = 2;
              break;
            }

            return _context8.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid boardName'))));

          case 2:
            _context8.next = 4;
            return PostCounters.getOne(boardName);

          case 4:
            return _context8.abrupt('return', _context8.sent);

          case 5:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getLastPostNumber(_x12) {
    return ref.apply(this, arguments);
  };
}();

var getLastPostNumbers = exports.getLastPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardNames) {
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            if (!(0, _underscore2.default)(boardNames).isArray()) {
              boardNames = [boardNames];
            }

            if (!boardNames.some(function (boardName) {
              return !Board.board(boardName);
            })) {
              _context9.next = 3;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid boardName'))));

          case 3:
            _context9.next = 5;
            return PostCounters.getSome(boardNames);

          case 5:
            return _context9.abrupt('return', _context9.sent);

          case 6:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function getLastPostNumbers(_x13) {
    return ref.apply(this, arguments);
  };
}();

var getPageCount = exports.getPageCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName) {
    var board, threadCount, pageCount;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context10.next = 3;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context10.next = 5;
            return Threads.count(boardName);

          case 5:
            threadCount = _context10.sent;
            pageCount = Math.ceil(threadCount / board.threadsPerPage) || 1;

            pageCounts.set(boardName, pageCount);
            return _context10.abrupt('return', pageCount);

          case 9:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function getPageCount(_x14) {
    return ref.apply(this, arguments);
  };
}();

var initialize = exports.initialize = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.next = 2;
            return Tools.series(Board.boardNames(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName) {
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.next = 2;
                        return getPageCount(boardName);

                      case 2:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x15) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            _context12.next = 4;
            return ThreadsModel.clearDeletedThreads();

          case 4:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function initialize() {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _misc = require('./misc');

var MiscModel = _interopRequireWildcard(_misc);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _threads = require('./threads');

var ThreadsModel = _interopRequireWildcard(_threads);

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

var PostCounters = new _hash2.default((0, _clientFactory2.default)(), 'postCounters', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});
var Threads = new _hash2.default((0, _clientFactory2.default)(), 'threads');

var pageCounts = new Map();

function postSubject(post, maxLength) {
  var subject = '';
  if (post.subject) {
    subject = post.subject;
  } else if (post.text) {
    subject = Tools.plainText(post.text);
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

//TODO: Use DoT.js
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
        return PostsModel.getPost(boardName, postNumber, { withFileInfos: true }).then(function (post) {
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
  }).catch(function (err) {
    _logger2.default.error(err.stack || err);
  });
};

function addDataToThread(thread, board) {
  thread.bumpLimit = board.bumpLimit;
  thread.postLimit = board.postLimit;
  thread.bumpLimitReached = thread.postCount >= board.bumpLimit;
  thread.postLimitReached = thread.postCount >= board.postLimit;
  thread.postingEnabled = board.postingEnabled && !thread.closed;
}
//# sourceMappingURL=board.js.map
