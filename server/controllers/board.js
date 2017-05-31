'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var renderThreadHTML = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(thread) {
    var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        prerendered = _ref2.prerendered;

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
              title: thread.title || board.title + ' \u2014 ' + thread.number,
              isThreadPage: true,
              board: MiscModel.board(board).board,
              threadNumber: thread.number,
              prerendered: prerendered
            };
            data = Renderer.render('pages/thread', model);
            _context.next = 7;
            return Cache.writeFile(thread.boardName + '/res/' + thread.number + '.html', data);

          case 7:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function renderThreadHTML(_x) {
    return _ref.apply(this, arguments);
  };
}();

var renderThread = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, threadNumber) {
    var thread;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return BoardsModel.getThread(boardName, threadNumber);

          case 2:
            thread = _context2.sent;

            delete thread.user.ip;
            delete thread.user.hashpass;
            delete thread.user.password;
            _context2.next = 8;
            return Renderer.renderThread(thread);

          case 8:
            _context2.next = 10;
            return Cache.writeFile(boardName + '/res/' + threadNumber + '.json', JSON.stringify({ thread: thread }));

          case 10:
            _context2.next = 12;
            return renderThreadHTML(thread);

          case 12:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function renderThread(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
}();

var renderPage = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, pageNumber) {
    var _ref5 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        allowPrerender = _ref5.allowPrerender;

    var board, page, pageID, pageJSON, pageHTML, mustRender, lastPosts, posts, postsToRerender, prerendered;
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
            _context4.next = 5;
            return BoardsModel.getPage(boardName, pageNumber);

          case 5:
            page = _context4.sent;
            _context4.next = 8;
            return Tools.series(page.threads, function () {
              var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(thread) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.next = 2;
                        return Renderer.renderThread(thread);

                      case 2:
                        return _context3.abrupt('return', _context3.sent);

                      case 3:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x8) {
                return _ref6.apply(this, arguments);
              };
            }());

          case 8:
            pageID = pageNumber > 0 ? pageNumber : 'index';

            if (!allowPrerender) {
              _context4.next = 33;
              break;
            }

            _context4.next = 12;
            return Cache.readFile(boardName + '/' + pageNumber + '.json');

          case 12:
            pageJSON = _context4.sent;

            pageJSON = JSON.parse(pageJSON);
            _context4.next = 16;
            return Cache.readFile(boardName + '/' + pageID + '.html');

          case 16:
            pageHTML = _context4.sent;
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
              _context4.next = 26;
              break;
            }

            return _context4.abrupt('return');

          case 26:
            prerendered = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
              return !postsToRerender.hasOwnProperty(postNumber);
            });

            prerendered = (0, _underscore2.default)(prerendered).mapObject(function (_1, postNumber) {
              return getPrerenderedPost(pageHTML, postNumber);
            });
            _context4.next = 30;
            return Cache.writeFile(boardName + '/' + pageNumber + '.json', JSON.stringify(page));

          case 30:
            page.prerendered = prerendered;
            _context4.next = 35;
            break;

          case 33:
            _context4.next = 35;
            return Cache.writeFile(boardName + '/' + pageNumber + '.json', JSON.stringify(page));

          case 35:
            page.title = board.title;
            page.board = MiscModel.board(board).board;
            _context4.next = 39;
            return Cache.writeFile(boardName + '/' + pageID + '.html', Renderer.render('pages/board', page));

          case 39:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function renderPage(_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
}();

var renderPages = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName) {
    var _ref8 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        allowPrerender = _ref8.allowPrerender;

    var pageCount;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return BoardsModel.getPageCount(boardName);

          case 2:
            pageCount = _context6.sent;
            _context6.next = 5;
            return Tools.series(_underscore2.default.range(pageCount), function () {
              var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(pageNumber) {
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        _context5.next = 2;
                        return renderPage(boardName, pageNumber, { allowPrerender: allowPrerender });

                      case 2:
                        return _context5.abrupt('return', _context5.sent);

                      case 3:
                      case 'end':
                        return _context5.stop();
                    }
                  }
                }, _callee5, this);
              }));

              return function (_x11) {
                return _ref9.apply(this, arguments);
              };
            }());

          case 5:
            return _context6.abrupt('return', _context6.sent);

          case 6:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function renderPages(_x9) {
    return _ref7.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

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

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _boards = require('../models/boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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

router.paths = function () {
  var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(description) {
    var arrays;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (!description) {
              _context8.next = 2;
              break;
            }

            return _context8.abrupt('return', [{
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
            }]);

          case 2:
            _context8.next = 4;
            return Tools.series(_board2.default.boardNames(), function () {
              var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
                var threadNumbers, archivedThreadNumbers, paths;
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        _context7.next = 2;
                        return ThreadsModel.getThreadNumbers(boardName);

                      case 2:
                        threadNumbers = _context7.sent;
                        _context7.next = 5;
                        return ThreadsModel.getThreadNumbers(boardName, { archived: true });

                      case 5:
                        archivedThreadNumbers = _context7.sent;

                        threadNumbers = threadNumbers.concat(archivedThreadNumbers).sort();
                        paths = ['/' + boardName, '/' + boardName + '/archive', '/' + boardName + '/catalog', '/' + boardName + '/rss'];
                        return _context7.abrupt('return', paths.concat(threadNumbers.map(function (threadNumber) {
                          return '/' + boardName + '/res/' + threadNumber;
                        })));

                      case 9:
                      case 'end':
                        return _context7.stop();
                    }
                  }
                }, _callee7, this);
              }));

              return function (_x13) {
                return _ref11.apply(this, arguments);
              };
            }(), true);

          case 4:
            arrays = _context8.sent;
            return _context8.abrupt('return', (0, _underscore2.default)(arrays).flatten());

          case 6:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function (_x12) {
    return _ref10.apply(this, arguments);
  };
}();

router.renderThread = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(key, data) {
    var mustCreate, mustDelete, board, threadID, threadData, model, thread, lastPosts, posts, postsToRerender, threadHTML, prerendered;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
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
              _context10.next = 5;
              break;
            }

            return _context10.abrupt('return');

          case 5:
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
              _context10.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 9:
            _context10.t0 = data.action;
            _context10.next = _context10.t0 === 'create' ? 12 : _context10.t0 === 'edit' ? 15 : _context10.t0 === 'delete' ? 47 : 54;
            break;

          case 12:
            _context10.next = 14;
            return renderThread(data.boardName, data.threadNumber);

          case 14:
            return _context10.abrupt('break', 55);

          case 15:
            threadID = data.boardName + '/res/' + data.threadNumber;
            _context10.next = 18;
            return Cache.readFile(threadID + '.json');

          case 18:
            threadData = _context10.sent;
            model = JSON.parse(threadData);
            thread = model.thread;
            lastPosts = thread.lastPosts.reduce(function (acc, post) {
              acc[post.number] = post;
              return acc;
            }, {});
            _context10.next = 24;
            return BoardsModel.getThread(data.boardName, data.threadNumber);

          case 24:
            thread = _context10.sent;
            posts = thread.lastPosts.reduce(function (acc, post) {
              acc[post.number] = post;
              return acc;
            }, {});

            lastPosts = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
              return posts.hasOwnProperty(postNumber);
            });
            postsToRerender = pickPostsToRerender(lastPosts, posts);
            _context10.next = 30;
            return Cache.readFile(threadID + '.html');

          case 30:
            threadHTML = _context10.sent;
            prerendered = (0, _underscore2.default)(lastPosts).pick(function (_1, postNumber) {
              return !postsToRerender.hasOwnProperty(postNumber);
            });

            prerendered = (0, _underscore2.default)(prerendered).mapObject(function (_1, postNumber) {
              return getPrerenderedPost(threadHTML, postNumber);
            });
            _context10.next = 35;
            return Files.renderPostFileInfos(thread.opPost);

          case 35:
            _context10.next = 37;
            return board.renderPost(thread.opPost);

          case 37:
            thread.opPost = _context10.sent;
            _context10.next = 40;
            return Tools.series(postsToRerender, function () {
              var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(post, postNumber) {
                var renderedPost;
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return Files.renderPostFileInfos(post);

                      case 2:
                        _context9.next = 4;
                        return board.renderPost(post);

                      case 4:
                        renderedPost = _context9.sent;

                        lastPosts[postNumber] = renderedPost;

                      case 6:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x16, _x17) {
                return _ref13.apply(this, arguments);
              };
            }());

          case 40:
            thread.lastPosts = (0, _underscore2.default)(lastPosts).toArray();
            model.thread = thread;
            _context10.next = 44;
            return Cache.writeFile(threadID + '.json', JSON.stringify(model));

          case 44:
            _context10.next = 46;
            return renderThreadHTML(thread, { prerendered: prerendered });

          case 46:
            return _context10.abrupt('break', 55);

          case 47:
            _context10.next = 49;
            return ThreadsModel.setThreadDeleted(data.boardName + ':' + data.threadNumber);

          case 49:
            _context10.next = 51;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.json');

          case 51:
            _context10.next = 53;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.html');

          case 53:
            return _context10.abrupt('break', 55);

          case 54:
            throw new Error(Tools.translate('Invalid action'));

          case 55:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function (_x14, _x15) {
    return _ref12.apply(this, arguments);
  };
}();

router.renderPages = function () {
  var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, threadNumber) {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return renderPages(boardName, { allowPrerender: threadNumber || true });

          case 2:
            return _context11.abrupt('return', _context11.sent);

          case 3:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function (_x18, _x19) {
    return _ref14.apply(this, arguments);
  };
}();

router.renderCatalog = function () {
  var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName) {
    var board;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context14.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context14.next = 5;
            return Tools.series(['date', 'recent', 'bumps'], function () {
              var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(sortMode) {
                var catalog, suffix;
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                  while (1) {
                    switch (_context13.prev = _context13.next) {
                      case 0:
                        _context13.next = 2;
                        return BoardsModel.getCatalog(boardName, sortMode);

                      case 2:
                        catalog = _context13.sent;
                        _context13.next = 5;
                        return Tools.series(catalog.threads, function () {
                          var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(thread) {
                            return regeneratorRuntime.wrap(function _callee12$(_context12) {
                              while (1) {
                                switch (_context12.prev = _context12.next) {
                                  case 0:
                                    _context12.next = 2;
                                    return Renderer.renderThread(thread);

                                  case 2:
                                    return _context12.abrupt('return', _context12.sent);

                                  case 3:
                                  case 'end':
                                    return _context12.stop();
                                }
                              }
                            }, _callee12, this);
                          }));

                          return function (_x22) {
                            return _ref17.apply(this, arguments);
                          };
                        }());

                      case 5:
                        suffix = 'date' !== sortMode ? '-' + sortMode : '';
                        _context13.next = 8;
                        return Cache.writeFile(boardName + '/catalog' + suffix + '.json', JSON.stringify(catalog));

                      case 8:
                        catalog.title = board.title;
                        catalog.board = MiscModel.board(board).board;
                        catalog.sortMode = sortMode;
                        return _context13.abrupt('return', Cache.writeFile(boardName + '/catalog' + suffix + '.html', Renderer.render('pages/catalog', catalog)));

                      case 12:
                      case 'end':
                        return _context13.stop();
                    }
                  }
                }, _callee13, this);
              }));

              return function (_x21) {
                return _ref16.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function (_x20) {
    return _ref15.apply(this, arguments);
  };
}();

router.renderArchive = function () {
  var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName) {
    var board, archive;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context15.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context15.next = 5;
            return BoardsModel.getArchive(boardName);

          case 5:
            archive = _context15.sent;
            _context15.next = 8;
            return Cache.writeFile(boardName + '/archive.json', JSON.stringify(archive));

          case 8:
            archive.title = board.title;
            archive.board = MiscModel.board(board).board;
            _context15.next = 12;
            return Cache.writeFile(boardName + '/archive.html', Renderer.render('pages/archive', archive));

          case 12:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function (_x23) {
    return _ref18.apply(this, arguments);
  };
}();

router.renderRSS = function () {
  var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(boardName) {
    var board, rssPostCount, Post, posts, rss;
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            if (boardName) {
              _context16.next = 4;
              break;
            }

            _context16.next = 3;
            return Tools.series(_board2.default.boardNames(), router.renderRSS.bind(router));

          case 3:
            return _context16.abrupt('return', _context16.sent);

          case 4:
            board = _board2.default.board(boardName);

            if (board) {
              _context16.next = 7;
              break;
            }

            throw new Error(Tools.translate('Invalid board name: $[1]', '', boardName));

          case 7:
            rssPostCount = (0, _config2.default)('server.rss.postCount');
            _context16.next = 10;
            return client.collection('post');

          case 10:
            Post = _context16.sent;
            _context16.next = 13;
            return Post.find({ boardName: boardName }, {
              number: 1,
              threadNumber: 1,
              subject: 1,
              name: 1,
              text: 1,
              fileInfos: 1,
              createdAt: 1
            }).sort({ createdAt: -1 }).limit(rssPostCount).toArray();

          case 13:
            posts = _context16.sent;

            if (!(posts.length <= 0)) {
              _context16.next = 16;
              break;
            }

            return _context16.abrupt('return');

          case 16:
            posts.sort(function (p1, p2) {
              return +p1.createdAt < +p2.createdAt;
            });
            posts.forEach(function (post) {
              if (post.text) {
                post.text = post.text.split('&nbsp', ' '); //NOTE: Required for the RSS to be valid
              }
              post.subject = BoardsModel.postSubject(post, 150) || post.number; //TODO: Magic number
            });
            rss = {
              date: Tools.now(),
              ttl: (0, _config2.default)('server.rss.ttl'),
              board: MiscModel.board(board).board,
              posts: posts,
              formattedDate: function formattedDate(date) {
                return (0, _moment2.default)(date).utc().locale('en').format(RSS_DATE_TIME_FORMAT);
              }
            };
            _context16.next = 21;
            return Cache.writeFile(boardName + '/rss.xml', Renderer.render('pages/rss', rss));

          case 21:
            return _context16.abrupt('return', _context16.sent);

          case 22:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function (_x24) {
    return _ref19.apply(this, arguments);
  };
}();

router.render = function () {
  var _ref20 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(path) {
    var match;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            match = path.match(/^\/([^\/]+)\/rss$/);

            if (!match) {
              _context17.next = 5;
              break;
            }

            _context17.next = 4;
            return router.renderRSS(match[1]);

          case 4:
            return _context17.abrupt('return', _context17.sent);

          case 5:
            match = path.match(/^\/([^\/]+)$/);

            if (!match) {
              _context17.next = 10;
              break;
            }

            _context17.next = 9;
            return renderPages(match[1]);

          case 9:
            return _context17.abrupt('return', _context17.sent);

          case 10:
            match = path.match(/^\/([^\/]+)\/archive$/);

            if (!match) {
              _context17.next = 15;
              break;
            }

            _context17.next = 14;
            return router.renderArchive(match[1]);

          case 14:
            return _context17.abrupt('return', _context17.sent);

          case 15:
            match = path.match(/^\/([^\/]+)\/catalog$/);

            if (!match) {
              _context17.next = 20;
              break;
            }

            _context17.next = 19;
            return router.renderCatalog(match[1]);

          case 19:
            return _context17.abrupt('return', _context17.sent);

          case 20:
            match = path.match(/^\/([^\/]+)\/res\/(\d+)$/);

            if (!match) {
              _context17.next = 25;
              break;
            }

            _context17.next = 24;
            return renderThread(match[1], +match[2]);

          case 24:
            return _context17.abrupt('return', _context17.sent);

          case 25:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function (_x25) {
    return _ref20.apply(this, arguments);
  };
}();

router.renderThreadHTML = renderThreadHTML;

function installThreadHandler(type) {
  router.get('/:boardName/res/:threadNumber.' + type, function () {
    var _ref21 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(req, res, next) {
      var _req$params, boardName, threadNumber, redirect;

      return regeneratorRuntime.wrap(function _callee18$(_context18) {
        while (1) {
          switch (_context18.prev = _context18.next) {
            case 0:
              _req$params = req.params, boardName = _req$params.boardName, threadNumber = _req$params.threadNumber;

              threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

              if (threadNumber) {
                _context18.next = 4;
                break;
              }

              return _context18.abrupt('return', next(Tools.create404Error(req.baseUrl)));

            case 4:
              _context18.next = 6;
              return ThreadsModel.getThreadRedirect(boardName, threadNumber);

            case 6:
              redirect = _context18.sent;

              if (redirect) {
                _context18.next = 9;
                break;
              }

              return _context18.abrupt('return', next(Tools.create404Error(req.baseUrl)));

            case 9:
              res.redirect(301, '/' + (0, _config2.default)('site.pathPrefix') + redirect.boardName + '/res/' + redirect.threadNumber + '.' + type);

            case 10:
            case 'end':
              return _context18.stop();
          }
        }
      }, _callee18, this);
    }));

    return function (_x26, _x27, _x28) {
      return _ref21.apply(this, arguments);
    };
  }());
}

installThreadHandler('html');
installThreadHandler('json');

exports.default = router;
//# sourceMappingURL=board.js.map
