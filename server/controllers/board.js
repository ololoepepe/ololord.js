'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var renderThreadHTML = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(thread) {
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var prerendered = _ref.prerendered;
    var targetPath = _ref.targetPath;
    var board, model, data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            board = _board2.default.board(thread.boardName);

            if (board) {
              _context.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            model = {
              thread: thread,
              title: thread.title || board.title + ' — ' + thread.number,
              isThreadPage: true,
              board: MiscModel.board(board).board,
              threadNumber: thread.number,
              prerendered: prerendered
            };
            data = Renderer.render('pages/thread', model);

            if (!targetPath) {
              _context.next = 10;
              break;
            }

            _context.next = 8;
            return _fs2.default.write(targetPath, data);

          case 8:
            _context.next = 12;
            break;

          case 10:
            _context.next = 12;
            return Cache.writeFile(thread.boardName + '/res/' + thread.number + '.html', data);

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function renderThreadHTML(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var renderThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, threadNumber) {
    var thread;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return BoardsModel.getThread(boardName, threadNumber);

          case 2:
            thread = _context2.sent;
            _context2.next = 5;
            return Renderer.renderThread(thread);

          case 5:
            _context2.next = 7;
            return Cache.writeFile(boardName + '/res/' + threadNumber + '.json', JSON.stringify({ thread: thread }));

          case 7:
            _context2.next = 9;
            return renderThreadHTML(thread);

          case 9:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function renderThread(_x4, _x5) {
    return ref.apply(this, arguments);
  };
}();

var renderArchivedThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber) {
    var thread, archPath;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return BoardsModel.getThread(boardName, threadNumber);

          case 2:
            thread = _context3.sent;

            if (!(!thread || !thread.archived)) {
              _context3.next = 5;
              break;
            }

            throw new Error(Tools.translate('No such thread: >>/$[1]/$[2]', '', boardName, threadNumber));

          case 5:
            archPath = __dirname + '/../../public/' + boardName + '/arch';
            _context3.next = 8;
            return mkpath(archPath);

          case 8:
            _context3.next = 10;
            return Renderer.renderThread(thread);

          case 10:
            _context3.next = 12;
            return _fs2.default.write(archPath + '/' + threadNumber + '.json', JSON.stringify({ thread: thread }));

          case 12:
            _context3.next = 14;
            return renderThreadHTML(thread, { targetPath: archPath + '/' + threadNumber + '.html' });

          case 14:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function renderArchivedThread(_x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var renderPage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, pageNumber) {
    var _this = this;

    var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var allowPrerender = _ref2.allowPrerender;

    var board, page, pageID, _ret;

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
            return BoardsModel.getPage(boardName, pageNumber);

          case 5:
            page = _context6.sent;
            _context6.next = 8;
            return Tools.series(page.threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(thread) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.next = 2;
                        return Renderer.renderThread(thread);

                      case 2:
                        return _context4.abrupt('return', _context4.sent);

                      case 3:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function (_x12) {
                return ref.apply(this, arguments);
              };
            }());

          case 8:
            pageID = pageNumber > 0 ? pageNumber : 'index';

            if (!allowPrerender) {
              _context6.next = 16;
              break;
            }

            return _context6.delegateYield(regeneratorRuntime.mark(function _callee5() {
              var pageJSON, pageHTML, mustRender, lastPosts, posts, postsToRerender, prerendered;
              return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                  switch (_context5.prev = _context5.next) {
                    case 0:
                      _context5.next = 2;
                      return Cache.readFile(boardName + '/' + pageNumber + '.json');

                    case 2:
                      pageJSON = _context5.sent;

                      pageJSON = JSON.parse(pageJSON);
                      _context5.next = 6;
                      return Cache.readFile(boardName + '/' + pageID + '.html');

                    case 6:
                      pageHTML = _context5.sent;
                      mustRender = page.threads.some(function (thread) {
                        return allowPrerender === thread.number;
                      });
                      lastPosts = pageJSON.threads.map(function (thread) {
                        var posts = thread.lastPosts.concat(thread.opPost);
                        if (allowPrerender === thread.number) {
                          posts.splice(-1, 1);
                        }
                        return posts;
                      });

                      lastPosts = (0, _underscore2.default)(lastPosts).flatten().reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});
                      posts = page.threads.map(function (thread) {
                        var posts = thread.lastPosts.concat(thread.opPost);
                        if (allowPrerender === thread.number) {
                          posts.splice(-1, 1);
                        }
                        return posts;
                      });

                      posts = (0, _underscore2.default)(posts).flatten().reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});
                      lastPosts = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
                        return posts.hasOwnProperty(postNumber);
                      });
                      postsToRerender = pickPostsToRerender(lastPosts, posts);

                      if (!(!mustRender && (0, _underscore2.default)(postsToRerender).isEmpty())) {
                        _context5.next = 16;
                        break;
                      }

                      return _context5.abrupt('return', {
                        v: void 0
                      });

                    case 16:
                      prerendered = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
                        return !postsToRerender.hasOwnProperty(postNumber);
                      });

                      prerendered = (0, _underscore2.default)(prerendered).mapObject(function (_1, postNumber) {
                        return getPrerenderedPost(pageHTML, postNumber);
                      });
                      _context5.next = 20;
                      return Cache.writeFile(boardName + '/' + pageNumber + '.json', JSON.stringify(page));

                    case 20:
                      page.prerendered = prerendered;

                    case 21:
                    case 'end':
                      return _context5.stop();
                  }
                }
              }, _callee5, _this);
            })(), 't0', 11);

          case 11:
            _ret = _context6.t0;

            if (!((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object")) {
              _context6.next = 14;
              break;
            }

            return _context6.abrupt('return', _ret.v);

          case 14:
            _context6.next = 18;
            break;

          case 16:
            _context6.next = 18;
            return Cache.writeFile(boardName + '/' + pageNumber + '.json', JSON.stringify(page));

          case 18:
            page.title = board.title;
            page.board = MiscModel.board(board).board;
            _context6.next = 22;
            return Cache.writeFile(boardName + '/' + pageID + '.html', Renderer.render('pages/board', page));

          case 22:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function renderPage(_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var renderPages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName) {
    var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var allowPrerender = _ref3.allowPrerender;
    var pageCount;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return BoardsModel.getPageCount(boardName);

          case 2:
            pageCount = _context8.sent;
            _context8.next = 5;
            return Tools.series(_underscore2.default.range(pageCount), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(pageNumber) {
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        _context7.next = 2;
                        return renderPage(boardName, pageNumber, { allowPrerender: allowPrerender });

                      case 2:
                        return _context7.abrupt('return', _context7.sent);

                      case 3:
                      case 'end':
                        return _context7.stop();
                    }
                  }
                }, _callee7, this);
              }));

              return function (_x16) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
            return _context8.abrupt('return', _context8.sent);

          case 6:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function renderPages(_x13, _x14) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _cache = require('../helpers/cache');

var Cache = _interopRequireWildcard(_cache);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _boards = require('../models/boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var RSS_DATE_TIME_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss +0000';

var client = (0, _mongodbClientFactory2.default)();
var router = _express2.default.Router();

function pickPostsToRerender(oldPosts, posts) {
  return (0, _underscore2.default)(posts).pick(function (post, postNumber) {
    var oldPost = oldPosts[postNumber];
    if (!oldPost) {
      return true;
    }
    if (oldPost.options.bannedFor !== post.options.bannedFor) {
      return true;
    }
    if (oldPost.sequenceNumber !== post.sequenceNumber) {
      return true;
    }
    if (oldPost.updatedAt < post.updatedAt) {
      return true;
    }
    if (oldPost.text !== post.text) {
      return true;
    }
    var oldRefs = oldPost.referringPosts.reduce(function (acc, ref) {
      return acc + ';' + ref.boardName + ':' + ref.postNumber;
    }, '');
    var newRefs = post.referringPosts.reduce(function (acc, ref) {
      return acc + ';' + ref.boardName + ':' + ref.postNumber;
    }, '');
    if (oldRefs !== newRefs) {
      return true;
    }
    var oldFileInfos = oldPost.fileInfos.reduce(function (acc, fileInfo) {
      return acc + ';' + fileInfo.fileName + ':' + JSON.stringify(fileInfo.extraData);
    }, '');
    var newFileInfos = post.fileInfos.reduce(function (acc, fileInfo) {
      return acc + ';' + fileInfo.fileName + ':' + JSON.stringify(fileInfo.extraData);
    }, '');
    if (oldFileInfos !== newFileInfos) {
      return true;
    }
  });
}

function getPrerenderedPost(html, postNumber) {
  var startIndex = html.indexOf('<div id=\'post-' + postNumber + '\'');
  if (startIndex < 0) {
    return;
  }
  var endPattern = '<!--__ololord_end_post#' + postNumber + '-->';
  var endIndex = html.lastIndexOf(endPattern);
  if (endIndex < 0) {
    return;
  }
  return html.substring(startIndex, endIndex + endPattern.length);
}

;

router.paths = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(description) {
    var arrays;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (!description) {
              _context10.next = 2;
              break;
            }

            return _context10.abrupt('return', [{
              path: '/<board name>',
              description: Tools.translate('Board pages (from 0 to N)')
            }, {
              path: '/<board name>/archive',
              description: Tools.translate('Board archive page (WITHOUT the archived threads)')
            }, {
              path: '/<board name>/catalog',
              description: Tools.translate('Board catalog page')
            }, {
              path: '/<board name>/rss',
              description: Tools.translate('Board RSS feed')
            }, {
              path: '/<board name>/res/<thread number>',
              description: Tools.translate('A thread')
            }, {
              path: '/<board name>/arch/<thread number>',
              description: Tools.translate('An archived thread')
            }]);

          case 2:
            _context10.next = 4;
            return Tools.series(_board2.default.boardNames(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName) {
                var threadNumbers, archivedThreadNumbers, paths;
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return ThreadsModel.getThreadNumbers(boardName);

                      case 2:
                        threadNumbers = _context9.sent;
                        _context9.next = 5;
                        return ThreadsModel.getThreadNumbers(boardName, { archived: true });

                      case 5:
                        archivedThreadNumbers = _context9.sent;
                        paths = ['/' + boardName, '/' + boardName + '/archive', '/' + boardName + '/catalog', '/' + boardName + '/rss'];

                        paths = paths.concat(threadNumbers.map(function (threadNumber) {
                          return '/' + boardName + '/res/' + threadNumber;
                        }));
                        return _context9.abrupt('return', paths.concat(archivedThreadNumbers.map(function (threadNumber) {
                          return '/' + boardName + '/arch/' + threadNumber;
                        })));

                      case 9:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x18) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 4:
            arrays = _context10.sent;
            return _context10.abrupt('return', (0, _underscore2.default)(arrays).flatten());

          case 6:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function (_x17) {
    return ref.apply(this, arguments);
  };
}();

router.renderThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(key, data) {
    var _this2 = this;

    var mustCreate, mustDelete, board, _ret2;

    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!(0, _underscore2.default)(data).isArray()) {
              data = [data];
            }
            mustCreate = data.some(function (d) {
              return 'create' === d.action;
            });
            mustDelete = data.some(function (d) {
              return 'delete' === d.action;
            });

            if (!(mustCreate && mustDelete)) {
              _context13.next = 5;
              break;
            }

            return _context13.abrupt('return');

          case 5:
            //NOTE: This should actually never happen

            data = data.reduce(function (acc, d) {
              if (!acc) {
                return d;
              }
              if (d.action < acc.action) {
                return d;
              }
              return acc;
            });
            board = _board2.default.board(data.boardName);

            if (board) {
              _context13.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 9:
            _context13.t0 = data.action;
            _context13.next = _context13.t0 === 'create' ? 12 : _context13.t0 === 'edit' ? 15 : _context13.t0 === 'delete' ? 19 : 26;
            break;

          case 12:
            _context13.next = 14;
            return renderThread(data.boardName, data.threadNumber);

          case 14:
            return _context13.abrupt('break', 27);

          case 15:
            return _context13.delegateYield(regeneratorRuntime.mark(function _callee12() {
              var threadID, threadData, model, thread, lastPosts, posts, postsToRerender, threadHTML, prerendered;
              return regeneratorRuntime.wrap(function _callee12$(_context12) {
                while (1) {
                  switch (_context12.prev = _context12.next) {
                    case 0:
                      threadID = data.boardName + '/res/' + data.threadNumber;
                      _context12.next = 3;
                      return Cache.readFile(threadID + '.json');

                    case 3:
                      threadData = _context12.sent;
                      model = JSON.parse(threadData);
                      thread = model.thread;
                      lastPosts = thread.lastPosts.reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});
                      _context12.next = 9;
                      return BoardsModel.getThread(data.boardName, data.threadNumber);

                    case 9:
                      thread = _context12.sent;
                      posts = thread.lastPosts.reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});

                      lastPosts = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
                        return posts.hasOwnProperty(postNumber);
                      });
                      postsToRerender = pickPostsToRerender(lastPosts, posts);
                      _context12.next = 15;
                      return Cache.readFile(threadID + '.html');

                    case 15:
                      threadHTML = _context12.sent;
                      prerendered = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
                        return !postsToRerender.hasOwnProperty(postNumber);
                      });

                      prerendered = (0, _underscore2.default)(prerendered).mapObject(function (_1, postNumber) {
                        return getPrerenderedPost(threadHTML, postNumber);
                      });
                      _context12.next = 20;
                      return Files.renderPostFileInfos(thread.opPost);

                    case 20:
                      _context12.next = 22;
                      return board.renderPost(thread.opPost);

                    case 22:
                      thread.opPost = _context12.sent;
                      _context12.next = 25;
                      return Tools.series(postsToRerender, function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(post, postNumber) {
                          var renderedPost;
                          return regeneratorRuntime.wrap(function _callee11$(_context11) {
                            while (1) {
                              switch (_context11.prev = _context11.next) {
                                case 0:
                                  _context11.next = 2;
                                  return Files.renderPostFileInfos(post);

                                case 2:
                                  _context11.next = 4;
                                  return board.renderPost(post);

                                case 4:
                                  renderedPost = _context11.sent;

                                  lastPosts[postNumber] = renderedPost;

                                case 6:
                                case 'end':
                                  return _context11.stop();
                              }
                            }
                          }, _callee11, this);
                        }));

                        return function (_x21, _x22) {
                          return ref.apply(this, arguments);
                        };
                      }());

                    case 25:
                      thread.lastPosts = (0, _underscore2.default)(lastPosts).toArray();
                      model.thread = thread;
                      _context12.next = 29;
                      return Cache.writeFile(threadID + '.json', JSON.stringify(model));

                    case 29:
                      _context12.next = 31;
                      return renderThreadHTML(thread, { prerendered: prerendered });

                    case 31:
                      return _context12.abrupt('return', 'break');

                    case 32:
                    case 'end':
                      return _context12.stop();
                  }
                }
              }, _callee12, _this2);
            })(), 't1', 16);

          case 16:
            _ret2 = _context13.t1;

            if (!(_ret2 === 'break')) {
              _context13.next = 19;
              break;
            }

            return _context13.abrupt('break', 27);

          case 19:
            _context13.next = 21;
            return ThreadsModel.setThreadDeleted(data.boardName + ':' + data.threadNumber);

          case 21:
            _context13.next = 23;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.json');

          case 23:
            _context13.next = 25;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.html');

          case 25:
            return _context13.abrupt('break', 27);

          case 26:
            throw new Error(Tools.translate('Invalid action'));

          case 27:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function (_x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

router.renderPages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            _context14.next = 2;
            return renderPages(boardName, { allowPrerender: threadNumber || true });

          case 2:
            return _context14.abrupt('return', _context14.sent);

          case 3:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function (_x23, _x24) {
    return ref.apply(this, arguments);
  };
}();

router.renderCatalog = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(boardName) {
    var board;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context17.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context17.next = 5;
            return Tools.series(['date', 'recent', 'bumps'], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(sortMode) {
                var catalog, suffix;
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        _context16.next = 2;
                        return BoardsModel.getCatalog(boardName, sortMode);

                      case 2:
                        catalog = _context16.sent;
                        _context16.next = 5;
                        return Tools.series(catalog.threads, function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(thread) {
                            return regeneratorRuntime.wrap(function _callee15$(_context15) {
                              while (1) {
                                switch (_context15.prev = _context15.next) {
                                  case 0:
                                    _context15.next = 2;
                                    return Renderer.renderThread(thread);

                                  case 2:
                                    return _context15.abrupt('return', _context15.sent);

                                  case 3:
                                  case 'end':
                                    return _context15.stop();
                                }
                              }
                            }, _callee15, this);
                          }));

                          return function (_x27) {
                            return ref.apply(this, arguments);
                          };
                        }());

                      case 5:
                        suffix = 'date' !== sortMode ? '-' + sortMode : '';
                        _context16.next = 8;
                        return Cache.writeFile(boardName + '/catalog' + suffix + '.json', JSON.stringify(catalog));

                      case 8:
                        catalog.title = board.title;
                        catalog.board = MiscModel.board(board).board;
                        catalog.sortMode = sortMode;
                        return _context16.abrupt('return', Cache.writeFile(boardName + '/catalog' + suffix + '.html', Renderer.render('pages/catalog', catalog)));

                      case 12:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x26) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function (_x25) {
    return ref.apply(this, arguments);
  };
}();

router.renderArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(boardName) {
    var board, archive;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context18.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context18.next = 5;
            return BoardsModel.getArchive(boardName);

          case 5:
            archive = _context18.sent;
            _context18.next = 8;
            return Cache.writeFile(boardName + '/archive.json', JSON.stringify(archive));

          case 8:
            archive.title = board.title;
            archive.board = MiscModel.board(board).board;
            _context18.next = 12;
            return Cache.writeFile(boardName + '/archive.html', Renderer.render('pages/archive', archive));

          case 12:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function (_x28) {
    return ref.apply(this, arguments);
  };
}();

router.renderRSS = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(boardName) {
    var board, rssPostCount, Post, posts, rss;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            if (boardName) {
              _context19.next = 4;
              break;
            }

            _context19.next = 3;
            return Tools.series(_board2.default.boardNames(), router.renderRSS.bind(router));

          case 3:
            return _context19.abrupt('return', _context19.sent);

          case 4:
            board = _board2.default.board(boardName);

            if (board) {
              _context19.next = 7;
              break;
            }

            throw new Error(Tools.translate('Invalid board name: $[1]', '', boardName));

          case 7:
            rssPostCount = (0, _config2.default)('server.rss.postCount');
            _context19.next = 10;
            return client.collection('post');

          case 10:
            Post = _context19.sent;
            _context19.next = 13;
            return Post.find({ boardName: boardName }, {
              number: 1,
              threadNumber: 1,
              subject: 1,
              name: 1,
              text: 1,
              fileInfos: 1,
              createdAt: 1
            }).sort({ createdAt: -1 }).limit(rssPostCount).sort({ createdAt: 1 }).toArray();

          case 13:
            posts = _context19.sent;

            if (!(!posts.length <= 0)) {
              _context19.next = 16;
              break;
            }

            return _context19.abrupt('return');

          case 16:
            posts.forEach(function (post) {
              post.subject = BoardsModel.postSubject(post, 150) || post.number; //TODO: Magic number
            });
            rss = {
              date: Tools.now(),
              ttl: (0, _config2.default)('server.rss.ttl'),
              board: MiscModel.board(board).board,
              posts: posts,
              formattedDate: function formattedDate(date) {
                return (0, _moment2.default)().utc().locale('en').format(RSS_DATE_TIME_FORMAT);
              }
            };
            _context19.next = 20;
            return Cache.writeFile(boardName + '/rss.xml', Renderer.render('pages/rss', rss));

          case 20:
            return _context19.abrupt('return', _context19.sent);

          case 21:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function (_x29) {
    return ref.apply(this, arguments);
  };
}();

router.render = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(path) {
    var match;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            match = path.match(/^\/([^\/]+)\/rss$/);

            if (!match) {
              _context20.next = 5;
              break;
            }

            _context20.next = 4;
            return router.renderRSS(match[1]);

          case 4:
            return _context20.abrupt('return', _context20.sent);

          case 5:
            match = path.match(/^\/([^\/]+)$/);

            if (!match) {
              _context20.next = 10;
              break;
            }

            _context20.next = 9;
            return renderPages(match[1]);

          case 9:
            return _context20.abrupt('return', _context20.sent);

          case 10:
            match = path.match(/^\/([^\/]+)\/archive$/);

            if (!match) {
              _context20.next = 15;
              break;
            }

            _context20.next = 14;
            return router.renderArchive(match[1]);

          case 14:
            return _context20.abrupt('return', _context20.sent);

          case 15:
            match = path.match(/^\/([^\/]+)\/catalog$/);

            if (!match) {
              _context20.next = 20;
              break;
            }

            _context20.next = 19;
            return router.renderCatalog(match[1]);

          case 19:
            return _context20.abrupt('return', _context20.sent);

          case 20:
            match = path.match(/^\/([^\/]+)\/res\/(\d+)$/);

            if (!match) {
              _context20.next = 25;
              break;
            }

            _context20.next = 24;
            return renderThread(match[1], +match[2]);

          case 24:
            return _context20.abrupt('return', _context20.sent);

          case 25:
            match = path.match(/^\/([^\/]+)\/arch\/(\d+)$/);

            if (!match) {
              _context20.next = 30;
              break;
            }

            _context20.next = 29;
            return renderArchivedThread(match[1], +match[2]);

          case 29:
            return _context20.abrupt('return', _context20.sent);

          case 30:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function (_x30) {
    return ref.apply(this, arguments);
  };
}();

router.renderThreadHTML = renderThreadHTML;

exports.default = router;
//# sourceMappingURL=board.js.map
