'use strict';

var renderThreadHTML = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(thread) {
    var board, model, data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context.next = 3;
              break;
            }

            return _context.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            thread.title = thread.title || board.title + ' — ' + thread.number;
            model = { thread: thread };

            model.isBoardPage = true;
            model.isThreadPage = true;
            model.board = MiscModel.board(board).board;
            model.threadNumber = thread.number;
            data = Renderer.render('pages/thread', model);
            _context.next = 12;
            return Cache.writeFile(thread.boardName + '/res/' + thread.number + '.html', data);

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function renderThreadHTML(_x) {
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

  return function renderThread(_x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var renderPage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, pageNumber) {
    var board, page, pageID;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context4.next = 3;
              break;
            }

            return _context4.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            _context4.next = 5;
            return BoardsModel.getPage(boardName, pageNumber);

          case 5:
            page = _context4.sent;
            _context4.next = 8;
            return Tools.series(page.threads, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(thread) {
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

              return function (_x6) {
                return ref.apply(this, arguments);
              };
            }());

          case 8:
            _context4.next = 10;
            return Cache.writeFile(boardName + '/' + pageNumber + '.json', JSON.stringify(page));

          case 10:
            page.title = board.title;
            page.board = MiscModel.board(board).board;
            pageID = pageNumber > 0 ? pageNumber : 'index';
            _context4.next = 15;
            return Cache.writeFile(boardName + '/' + pageID + '.html', Renderer.render('pages/board', page));

          case 15:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function renderPage(_x4, _x5) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _board = require('../models/board');

var BoardsModel = _interopRequireWildcard(_board);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _cache = require('../helpers/cache');

var Cache = _interopRequireWildcard(_cache);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Board = require('../boards/board');


var router = _express2.default.Router();

function pickPostsToRerender(oldPosts, posts) {
  return (0, _underscore2.default)(posts).pick(function (post, postNumber) {
    var oldPost = oldPosts[postNumber];
    if (!oldPost || oldPost.updatedAt < post.updatedAt || oldPost.bannedFor !== post.bannedFor || oldPost.text === post.text) {
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

router.paths = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
  var arrays;
  return regeneratorRuntime.wrap(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return Tools.series(Board.boardNames(), function () {
            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName) {
              var threadNumbers, archivedThreadNumbers, paths;
              return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                  switch (_context5.prev = _context5.next) {
                    case 0:
                      _context5.next = 2;
                      return ThreadsModel.getThreadNumbers(boardName);

                    case 2:
                      threadNumbers = _context5.sent;
                      _context5.next = 5;
                      return ThreadsModel.getThreadNumbers(boardName, { archived: true });

                    case 5:
                      archivedThreadNumbers = _context5.sent;
                      paths = ['/' + boardName, '/' + boardName + '/archive', '/' + boardName + '/catalog'];
                      return _context5.abrupt('return', paths.concat(threadNumbers.map(function (threadNumber) {
                        return '/' + boardName + '/res/' + threadNumber;
                      })));

                    case 8:
                    case 'end':
                      return _context5.stop();
                  }
                }
              }, _callee5, this);
            }));

            return function (_x7) {
              return ref.apply(this, arguments);
            };
          }(), true);

        case 2:
          arrays = _context6.sent;
          return _context6.abrupt('return', (0, _underscore2.default)(arrays).flatten());

        case 4:
        case 'end':
          return _context6.stop();
      }
    }
  }, _callee6, this);
}));

router.renderThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(key, data) {
    var _this = this;

    var mustCreate, mustDelete, board, _ret;

    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
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
              _context9.next = 5;
              break;
            }

            return _context9.abrupt('return');

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
            board = Board.board(data.boardName);

            if (board) {
              _context9.next = 9;
              break;
            }

            return _context9.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 9:
            _context9.t0 = data.action;
            _context9.next = _context9.t0 === 'create' ? 12 : _context9.t0 === 'edit' ? 15 : _context9.t0 === 'delete' ? 19 : 26;
            break;

          case 12:
            _context9.next = 14;
            return renderThread(data.boardName, data.threadNumber);

          case 14:
            return _context9.abrupt('break', 27);

          case 15:
            return _context9.delegateYield(regeneratorRuntime.mark(function _callee8() {
              var threadID, threadData, model, thread, lastPosts, posts, opPost, postsToRerender;
              return regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                  switch (_context8.prev = _context8.next) {
                    case 0:
                      threadID = data.boardName + '/res/' + data.threadNumber + '.json';
                      _context8.next = 3;
                      return Cache.readFile(threadID);

                    case 3:
                      threadData = _context8.sent;
                      model = JSON.parse(threadData);
                      thread = model.thread;
                      lastPosts = thread.lastPosts.reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});
                      _context8.next = 9;
                      return ThreadsModel.getThreadPosts(data.boardName, data.threadNumber, {
                        withExtraData: true,
                        withFileInfos: true,
                        withReferences: true
                      });

                    case 9:
                      posts = _context8.sent;
                      opPost = posts.splice(0, 1)[0];

                      posts = posts.reduce(function (acc, post) {
                        acc[post.number] = post;
                        return acc;
                      }, {});
                      postsToRerender = pickPostsToRerender(lastPosts, posts);
                      _context8.next = 15;
                      return Tools.series(postsToRerender, function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(post, postNumber) {
                          var renderedPost;
                          return regeneratorRuntime.wrap(function _callee7$(_context7) {
                            while (1) {
                              switch (_context7.prev = _context7.next) {
                                case 0:
                                  _context7.next = 2;
                                  return board.renderPost(post);

                                case 2:
                                  renderedPost = _context7.sent;

                                  lastPosts[postNumber] = renderedPost;

                                case 4:
                                case 'end':
                                  return _context7.stop();
                              }
                            }
                          }, _callee7, this);
                        }));

                        return function (_x10, _x11) {
                          return ref.apply(this, arguments);
                        };
                      }());

                    case 15:
                      thread.lastPosts = (0, _underscore2.default)(lastPosts).toArray();
                      _context8.next = 18;
                      return Cache.writeFile(threadID, JSON.stringify(model));

                    case 18:
                      _context8.next = 20;
                      return renderThreadHTML(thread);

                    case 20:
                      return _context8.abrupt('return', 'break');

                    case 21:
                    case 'end':
                      return _context8.stop();
                  }
                }
              }, _callee8, _this);
            })(), 't1', 16);

          case 16:
            _ret = _context9.t1;

            if (!(_ret === 'break')) {
              _context9.next = 19;
              break;
            }

            return _context9.abrupt('break', 27);

          case 19:
            _context9.next = 21;
            return ThreadsModel.setThreadDeleted(data.boardName + ':' + data.threadNumber);

          case 21:
            _context9.next = 23;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.json');

          case 23:
            _context9.next = 25;
            return Cache.removeFile(data.boardName + '/res/' + data.threadNumber + '.html');

          case 25:
            return _context9.abrupt('break', 27);

          case 26:
            return _context9.abrupt('return', Promise.reject(Tools.translate('Invalid action')));

          case 27:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function (_x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

router.renderPages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName) {
    var pageCount;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return BoardsModel.getPageCount(boardName);

          case 2:
            pageCount = _context11.sent;
            _context11.next = 5;
            return Tools.series(_underscore2.default.range(pageCount), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(pageNumber) {
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        _context10.next = 2;
                        return renderPage(boardName, pageNumber);

                      case 2:
                        return _context10.abrupt('return', _context10.sent);

                      case 3:
                      case 'end':
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function (_x13) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
            return _context11.abrupt('return', _context11.sent);

          case 6:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function (_x12) {
    return ref.apply(this, arguments);
  };
}();

router.renderCatalog = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(boardName) {
    var board;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context14.next = 3;
              break;
            }

            return _context14.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

          case 3:
            _context14.next = 5;
            return Tools.series(['date', 'recent', 'bumps'], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(sortMode) {
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
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(thread) {
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

                          return function (_x16) {
                            return ref.apply(this, arguments);
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

              return function (_x15) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function (_x14) {
    return ref.apply(this, arguments);
  };
}();

router.renderArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName) {
    var board, archive;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            board = Board.board(boardName);

            if (board) {
              _context15.next = 3;
              break;
            }

            return _context15.abrupt('return', Promise.reject(Tools.translate('Invalid board')));

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

  return function (_x17) {
    return ref.apply(this, arguments);
  };
}();

router.render = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(paths) {
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return Tools.series(paths, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(path) {
                var match;
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        match = path.match(/^\/([^\/]+)$/);

                        if (!match) {
                          _context16.next = 6;
                          break;
                        }

                        console.log(Tools.translate('Rendering board pages: /$[1]', '', match[1]));
                        _context16.next = 5;
                        return router.renderPages(match[1]);

                      case 5:
                        return _context16.abrupt('return', _context16.sent);

                      case 6:
                        match = path.match(/^\/([^\/]+)\/archive$/);

                        if (!match) {
                          _context16.next = 12;
                          break;
                        }

                        console.log(Tools.translate('Rendering board archive: /$[1]/archive', '', match[1]));
                        _context16.next = 11;
                        return router.renderArchive(match[1]);

                      case 11:
                        return _context16.abrupt('return', _context16.sent);

                      case 12:
                        match = path.match(/^\/([^\/]+)\/catalog$/);

                        if (!match) {
                          _context16.next = 18;
                          break;
                        }

                        console.log(Tools.translate('Rendering board catalog: /$[1]/catalog', '', match[1]));
                        _context16.next = 17;
                        return router.renderCatalog(match[1]);

                      case 17:
                        return _context16.abrupt('return', _context16.sent);

                      case 18:
                        match = path.match(/^\/([^\/]+)\/res\/(\d+)$/);

                        if (!match) {
                          _context16.next = 24;
                          break;
                        }

                        console.log(Tools.translate('Rendering thread: /$[1]/$[2]', '', match[1], match[2]));
                        _context16.next = 23;
                        return renderThread(match[1], +match[2]);

                      case 23:
                        return _context16.abrupt('return', _context16.sent);

                      case 24:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x19) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            return _context17.abrupt('return', _context17.sent);

          case 3:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function (_x18) {
    return ref.apply(this, arguments);
  };
}();

module.exports = router;
//# sourceMappingURL=board.js.map
