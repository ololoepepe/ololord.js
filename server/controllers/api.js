'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _captcha = require('../captchas/captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _boards = require('../models/boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _chats = require('../models/chats');

var ChatsModel = _interopRequireWildcard(_chats);

var _files2 = require('../models/files');

var FilesModel = _interopRequireWildcard(_files2);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var GET_FILE_HEADERS_TIMEOUT = Tools.MINUTE;
var TEXT_FORMATS = new Set(['txt', 'js', 'json', 'jst', 'html', 'xml', 'css', 'md', 'example', 'gitignore', 'log']);

var router = _express2.default.Router();

router.get('/api/post.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, res, next) {
    var post, board;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (req.query.boardName) {
              _context.next = 2;
              break;
            }

            return _context.abrupt('return', next(Tools.translate('Invalid board')));

          case 2:
            _context.prev = 2;
            _context.next = 5;
            return UsersModel.checkUserBan(req.ip, req.query.boardName);

          case 5:
            _context.next = 7;
            return PostsModel.getPost(req.query.boardName, +req.query.postNumber, {
              withFileInfos: true,
              withReferences: true,
              withExtraData: true
            });

          case 7:
            post = _context.sent;

            if (post) {
              _context.next = 10;
              break;
            }

            return _context.abrupt('return', res.json(null));

          case 10:
            board = _board2.default.board(post.boardName);
            _context.next = 13;
            return Files.renderPostFileInfos(post);

          case 13:
            _context.next = 15;
            return board.renderPost(post);

          case 15:
            post = _context.sent;

            res.json(post || null);
            _context.next = 22;
            break;

          case 19:
            _context.prev = 19;
            _context.t0 = _context['catch'](2);

            next(_context.t0);

          case 22:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[2, 19]]);
  }));

  return function (_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/threadInfo.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var threadInfo;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (req.query.boardName) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt('return', next(Tools.translate('Invalid board')));

          case 2:
            _context2.prev = 2;
            _context2.next = 5;
            return UsersModel.checkUserBan(req.ip, req.query.boardName);

          case 5:
            _context2.next = 7;
            return ThreadsModel.getThreadInfo(req.query.boardName, +req.query.threadNumber, { lastPostNumber: +req.query.lastPostNumber });

          case 7:
            threadInfo = _context2.sent;

            res.json(threadInfo);
            _context2.next = 14;
            break;

          case 11:
            _context2.prev = 11;
            _context2.t0 = _context2['catch'](2);

            next(_context2.t0);

          case 14:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[2, 11]]);
  }));

  return function (_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/threadInfos.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var threads, boardNames, threadInfos;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            threads = req.query.threads;

            if (!(0, _underscore2.default)(threads).isArray()) {
              threads = [threads];
            }
            _context4.prev = 2;
            boardNames = (threads || []).map(function (thread) {
              return thread.split(':').shift();
            });
            _context4.next = 6;
            return UsersModel.checkUserBan(req.ip, boardNames);

          case 6:
            _context4.next = 8;
            return Tools.series(threads || [], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(thread) {
                var _thread$split, _thread$split2, boardName, threadNumber, lastPostNumber;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _thread$split = thread.split(':');
                        _thread$split2 = _slicedToArray(_thread$split, 3);
                        boardName = _thread$split2[0];
                        threadNumber = _thread$split2[1];
                        lastPostNumber = _thread$split2[2];
                        _context3.next = 7;
                        return ThreadsModel.getThreadInfo(boardName, +threadNumber, { lastPostNumber: +lastPostNumber });

                      case 7:
                        return _context3.abrupt('return', _context3.sent);

                      case 8:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x10) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 8:
            threadInfos = _context4.sent;

            res.json(threadInfos);
            _context4.next = 15;
            break;

          case 12:
            _context4.prev = 12;
            _context4.t0 = _context4['catch'](2);

            next(_context4.t0);

          case 15:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[2, 12]]);
  }));

  return function (_x7, _x8, _x9) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/threadLastPostNumber.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(req, res, next) {
    var boardName, threadLastPostNumber;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            boardName = req.query.boardName;

            if (boardName) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt('return', next(Tools.translate('Invalid board')));

          case 3:
            _context5.prev = 3;
            _context5.next = 6;
            return UsersModel.checkUserBan(req.ip, boardName);

          case 6:
            _context5.next = 8;
            return ThreadsModel.getThreadLastPostNumber(boardName, +req.query.threadNumber);

          case 8:
            threadLastPostNumber = _context5.sent;

            res.json({ lastPostNumber: threadLastPostNumber });
            _context5.next = 15;
            break;

          case 12:
            _context5.prev = 12;
            _context5.t0 = _context5['catch'](3);

            next(_context5.t0);

          case 15:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[3, 12]]);
  }));

  return function (_x11, _x12, _x13) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/threadLastPostNumbers.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var threads, boardNames, threadLastPostNumbers;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            threads = req.query.threads;

            if (!(0, _underscore2.default)(threads).isArray()) {
              threads = [threads];
            }
            _context7.prev = 2;
            boardNames = (threads || []).map(function (thread) {
              return thread.split(':').shift();
            });
            _context7.next = 6;
            return UsersModel.checkUserBan(req.ip, boardNames);

          case 6:
            _context7.next = 8;
            return Tools.series(threads || [], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(thread) {
                var _thread$split3, _thread$split4, boardName, threadNumber;

                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _thread$split3 = thread.split(':');
                        _thread$split4 = _slicedToArray(_thread$split3, 2);
                        boardName = _thread$split4[0];
                        threadNumber = _thread$split4[1];
                        _context6.next = 6;
                        return ThreadsModel.getThreadLastPostNumber(boardName, +threadNumber);

                      case 6:
                        return _context6.abrupt('return', _context6.sent);

                      case 7:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x17) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 8:
            threadLastPostNumbers = _context7.sent;

            res.json(threadLastPostNumbers);
            _context7.next = 15;
            break;

          case 12:
            _context7.prev = 12;
            _context7.t0 = _context7['catch'](2);

            next(_context7.t0);

          case 15:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[2, 12]]);
  }));

  return function (_x14, _x15, _x16) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/fileInfo.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(req, res, next) {
    var fileInfo;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;
            fileInfo = null;

            if (!req.query.fileName) {
              _context8.next = 8;
              break;
            }

            _context8.next = 5;
            return FilesModel.getFileInfoByName(req.query.fileName);

          case 5:
            fileInfo = _context8.sent;
            _context8.next = 15;
            break;

          case 8:
            if (!req.query.fileHash) {
              _context8.next = 14;
              break;
            }

            _context8.next = 11;
            return FilesModel.getFileInfoByHash(req.query.fileHash);

          case 11:
            fileInfo = _context8.sent;
            _context8.next = 15;
            break;

          case 14:
            return _context8.abrupt('return', next(Tools.translate('Neither file name nor hash is specified')));

          case 15:
            res.json(fileInfo);
            _context8.next = 21;
            break;

          case 18:
            _context8.prev = 18;
            _context8.t0 = _context8['catch'](0);

            next(_context8.t0);

          case 21:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 18]]);
  }));

  return function (_x18, _x19, _x20) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/fileExistence.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, res, next) {
    var exists;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;
            exists = false;

            if (!req.query.fileName) {
              _context9.next = 8;
              break;
            }

            _context9.next = 5;
            return FilesModel.fileInfoExistsByName(req.query.fileName);

          case 5:
            exists = _context9.sent;
            _context9.next = 15;
            break;

          case 8:
            if (!req.query.fileHash) {
              _context9.next = 14;
              break;
            }

            _context9.next = 11;
            return FilesModel.fileInfoExistsByHash(req.query.fileHash);

          case 11:
            exists = _context9.sent;
            _context9.next = 15;
            break;

          case 14:
            return _context9.abrupt('return', next(Tools.translate('Neither file name nor hash is specified')));

          case 15:
            res.json(exists);
            _context9.next = 21;
            break;

          case 18:
            _context9.prev = 18;
            _context9.t0 = _context9['catch'](0);

            next(_context9.t0);

          case 21:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[0, 18]]);
  }));

  return function (_x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/lastPostNumber.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, res, next) {
    var lastPostNumber;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (req.query.boardName) {
              _context10.next = 2;
              break;
            }

            return _context10.abrupt('return', next(Tools.translate('Invalid board')));

          case 2:
            _context10.prev = 2;
            _context10.next = 5;
            return BoardsModel.getLastPostNumber(req.query.boardName);

          case 5:
            lastPostNumber = _context10.sent;

            res.json({ lastPostNumber: lastPostNumber });
            _context10.next = 12;
            break;

          case 9:
            _context10.prev = 9;
            _context10.t0 = _context10['catch'](2);

            next(_context10.t0);

          case 12:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this, [[2, 9]]);
  }));

  return function (_x24, _x25, _x26) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/lastPostNumbers.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(req, res, next) {
    var boardNames, lastPostNumbers;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            boardNames = req.query.boardNames;

            if (!boardNames) {
              boardNames = _board2.default.boardNames();
            } else if (!(0, _underscore2.default)(boardNames).isArray()) {
              boardNames = [boardNames];
            }
            _context11.prev = 2;
            _context11.next = 5;
            return BoardsModel.getLastPostNumbers(boardNames);

          case 5:
            lastPostNumbers = _context11.sent;

            res.json((0, _underscore2.default)(lastPostNumbers).reduce(function (acc, lastPostNumber, index) {
              acc[boardNames[index]] = lastPostNumber;
              return acc;
            }, {}));
            _context11.next = 12;
            break;

          case 9:
            _context11.prev = 9;
            _context11.t0 = _context11['catch'](2);

            next(_context11.t0);

          case 12:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this, [[2, 9]]);
  }));

  return function (_x27, _x28, _x29) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/chatMessages.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(req, res, next) {
    var chats;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.prev = 0;
            _context12.next = 3;
            return ChatsModel.getChatMessages(req, req.query.lastRequestDate);

          case 3:
            chats = _context12.sent;

            res.json(chats);
            _context12.next = 10;
            break;

          case 7:
            _context12.prev = 7;
            _context12.t0 = _context12['catch'](0);

            next(_context12.t0);

          case 10:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this, [[0, 7]]);
  }));

  return function (_x30, _x31, _x32) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/synchronization.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(req, res, next) {
    var data;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (req.query.key) {
              _context13.next = 2;
              break;
            }

            return _context13.abrupt('return', next(Tools.translate('No key specified')));

          case 2:
            _context13.prev = 2;
            _context13.next = 5;
            return UsersModel.getSynchronizationData(req.query.key);

          case 5:
            data = _context13.sent;

            res.json(data);
            _context13.next = 12;
            break;

          case 9:
            _context13.prev = 9;
            _context13.t0 = _context13['catch'](2);

            next(_context13.t0);

          case 12:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this, [[2, 9]]);
  }));

  return function (_x33, _x34, _x35) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/captchaQuota.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(req, res, next) {
    var quota;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            if (req.query.boardName) {
              _context14.next = 2;
              break;
            }

            return _context14.abrupt('return', next(Tools.translate('Invalid board')));

          case 2:
            _context14.prev = 2;
            _context14.next = 5;
            return UsersModel.checkUserBan(req.ip, req.query.boardName);

          case 5:
            _context14.next = 7;
            return UsersModel.getUserCaptchaQuota(req.query.boardName, req.hashpass || req.ip);

          case 7:
            quota = _context14.sent;

            res.json({ quota: quota });
            _context14.next = 14;
            break;

          case 11:
            _context14.prev = 11;
            _context14.t0 = _context14['catch'](2);

            next(_context14.t0);

          case 14:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this, [[2, 11]]);
  }));

  return function (_x36, _x37, _x38) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/userLevels.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(req, res, next) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            try {
              res.json(req.levels || {});
            } catch (err) {
              next(err);
            }

          case 1:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function (_x39, _x40, _x41) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/userIp.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(req, res, next) {
    var ip;
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            if (req.query.boardName) {
              _context16.next = 2;
              break;
            }

            return _context16.abrupt('return', next(Tools.translate('Invalid board')));

          case 2:
            _context16.prev = 2;
            _context16.next = 5;
            return UsersModel.checkUserBan(req.ip, req.query.boardName);

          case 5:
            if (req.isModer()) {
              _context16.next = 7;
              break;
            }

            return _context16.abrupt('return', next(Tools.translate('Not enough rights')));

          case 7:
            _context16.next = 9;
            return UsersModel.getUserIP(req.query.boardName, +req.query.postNumber);

          case 9:
            ip = _context16.sent;

            res.json(Tools.addIPv4({ ip: ip }));
            _context16.next = 16;
            break;

          case 13:
            _context16.prev = 13;
            _context16.t0 = _context16['catch'](2);

            next(_context16.t0);

          case 16:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this, [[2, 13]]);
  }));

  return function (_x42, _x43, _x44) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/bannedUser.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(req, res, next) {
    var ip, bans;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            ip = Tools.correctAddress(req.query.ip);

            if (ip) {
              _context17.next = 3;
              break;
            }

            return _context17.abrupt('return', next(Tools.translate('Invalid IP address')));

          case 3:
            if (req.isModer()) {
              _context17.next = 5;
              break;
            }

            return _context17.abrupt('return', next(Tools.translate('Not enough rights')));

          case 5:
            _context17.prev = 5;
            _context17.next = 8;
            return UsersModel.getBannedUserBans(ip, _board2.default.boardNames().filter(function (boardName) {
              return req.isModer(boardName);
            }));

          case 8:
            bans = _context17.sent;

            res.json(Tools.addIPv4({
              ip: ip,
              bans: bans
            }));
            _context17.next = 15;
            break;

          case 12:
            _context17.prev = 12;
            _context17.t0 = _context17['catch'](5);

            next(_context17.t0);

          case 15:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this, [[5, 12]]);
  }));

  return function (_x45, _x46, _x47) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/bannedUsers.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(req, res, next) {
    var users;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            if (req.isModer()) {
              _context18.next = 2;
              break;
            }

            return _context18.abrupt('return', next(Tools.translate('Not enough rights')));

          case 2:
            _context18.prev = 2;
            _context18.next = 5;
            return UsersModel.getBannedUsers(_board2.default.boardNames().filter(function (boardName) {
              return req.isModer(boardName);
            }));

          case 5:
            users = _context18.sent;

            res.json((0, _underscore2.default)(users).map(function (bans, ip) {
              return Tools.addIPv4({
                ip: ip,
                bans: bans
              });
            }));
            _context18.next = 12;
            break;

          case 9:
            _context18.prev = 9;
            _context18.t0 = _context18['catch'](2);

            next(_context18.t0);

          case 12:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this, [[2, 9]]);
  }));

  return function (_x48, _x49, _x50) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/registeredUser.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(req, res, next) {
    var hashpass, user;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            if (req.isSuperuser()) {
              _context19.next = 2;
              break;
            }

            return _context19.abrupt('return', next(Tools.translate('Not enough rights')));

          case 2:
            hashpass = req.query.hashpass;

            if (Tools.mayBeHashpass(hashpass)) {
              _context19.next = 5;
              break;
            }

            return _context19.abrupt('return', next(Tools.translate('Invalid hashpass')));

          case 5:
            _context19.prev = 5;
            _context19.next = 8;
            return UsersModel.getRegisteredUser(hashpass);

          case 8:
            user = _context19.sent;

            res.json(Tools.addIPv4(user));
            _context19.next = 15;
            break;

          case 12:
            _context19.prev = 12;
            _context19.t0 = _context19['catch'](5);

            next(_context19.t0);

          case 15:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this, [[5, 12]]);
  }));

  return function (_x51, _x52, _x53) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/registeredUsers.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(req, res, next) {
    var users;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            if (req.isSuperuser()) {
              _context20.next = 2;
              break;
            }

            return _context20.abrupt('return', next(Tools.translate('Not enough rights')));

          case 2:
            _context20.prev = 2;
            _context20.next = 5;
            return UsersModel.getRegisteredUsers();

          case 5:
            users = _context20.sent;

            res.json(users.map(function (user) {
              return Tools.addIPv4(user);
            }));
            _context20.next = 12;
            break;

          case 9:
            _context20.prev = 9;
            _context20.t0 = _context20['catch'](2);

            next(_context20.t0);

          case 12:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this, [[2, 9]]);
  }));

  return function (_x54, _x55, _x56) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/fileTree.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(req, res, next) {
    var _this = this;

    return regeneratorRuntime.wrap(function _callee23$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            if (req.isSuperuser()) {
              _context23.next = 2;
              break;
            }

            return _context23.abrupt('return', next(Tools.translate('Not enough rights')));

          case 2:
            _context23.prev = 2;
            return _context23.delegateYield(regeneratorRuntime.mark(function _callee22() {
              var dir, path, list;
              return regeneratorRuntime.wrap(function _callee22$(_context22) {
                while (1) {
                  switch (_context22.prev = _context22.next) {
                    case 0:
                      dir = req.query.dir;

                      if (!dir || '#' === dir) {
                        dir = './';
                      }
                      if ('/' !== dir.slice(-1)[0]) {
                        dir += '/';
                      }
                      path = __dirname + '/../../' + dir;
                      _context22.next = 6;
                      return _fs2.default.list(path);

                    case 6:
                      list = _context22.sent;
                      _context22.next = 9;
                      return Tools.series(list, function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(file) {
                          var stat, node;
                          return regeneratorRuntime.wrap(function _callee21$(_context21) {
                            while (1) {
                              switch (_context21.prev = _context21.next) {
                                case 0:
                                  _context21.next = 2;
                                  return _fs2.default.stat(path + '/' + file);

                                case 2:
                                  stat = _context21.sent;
                                  node = {
                                    id: dir + file,
                                    text: file
                                  };

                                  if (stat.isDirectory()) {
                                    node.type = 'folder';
                                    node.children = true;
                                  } else if (stat.isFile()) {
                                    node.type = 'file';
                                  }
                                  return _context21.abrupt('return', node);

                                case 6:
                                case 'end':
                                  return _context21.stop();
                              }
                            }
                          }, _callee21, this);
                        }));

                        return function (_x60) {
                          return ref.apply(this, arguments);
                        };
                      }(), true);

                    case 9:
                      list = _context22.sent;

                      res.json(list);

                    case 11:
                    case 'end':
                      return _context22.stop();
                  }
                }
              }, _callee22, _this);
            })(), 't0', 4);

          case 4:
            _context23.next = 10;
            break;

          case 6:
            _context23.prev = 6;
            _context23.t1 = _context23['catch'](2);

            if ('ENOENT' === _context23.t1.code) {
              _context23.t1.status = 404;
            } else if ('ENOTDIR' === _context23.t1.code) {
              _context23.t1 = Tools.translate('Not a directory');
            }
            next(_context23.t1);

          case 10:
          case 'end':
            return _context23.stop();
        }
      }
    }, _callee23, this, [[2, 6]]);
  }));

  return function (_x57, _x58, _x59) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/fileContent.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(req, res, next) {
    var encoding, content;
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            if (req.isSuperuser()) {
              _context24.next = 2;
              break;
            }

            return _context24.abrupt('return', next(Tools.translate('Not enough rights')));

          case 2:
            _context24.prev = 2;
            encoding = !TEXT_FORMATS.has((req.query.fileName || '').split('.').pop()) ? 'b' : undefined;
            _context24.next = 6;
            return _fs2.default.read(__dirname + '/../../' + req.query.fileName, encoding);

          case 6:
            content = _context24.sent;

            res.json({ content: content });
            _context24.next = 14;
            break;

          case 10:
            _context24.prev = 10;
            _context24.t0 = _context24['catch'](2);

            if ('ENOENT' === _context24.t0.code) {
              _context24.t0.status = 404;
            } else if ('EISDIR' === _context24.t0.code) {
              _context24.t0 = Tools.translate('Not a file');
            }
            next(_context24.t0);

          case 14:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this, [[2, 10]]);
  }));

  return function (_x61, _x62, _x63) {
    return ref.apply(this, arguments);
  };
}());

router.get('/api/fileHeaders.json', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(req, res, next) {
    var options, proxy, response;
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            if (req.query.url) {
              _context25.next = 2;
              break;
            }

            return _context25.abrupt('return', next(Tools.translate('Invalid URL')));

          case 2:
            _context25.prev = 2;
            options = {
              method: 'HEAD',
              timeout: GET_FILE_HEADERS_TIMEOUT
            };
            proxy = _config2.default.proxy();

            if (proxy) {
              options = _merge2.default.recursive(options, {
                host: proxy.host,
                port: proxy.port,
                headers: { 'Proxy-Authorization': proxy.auth },
                path: req.query.url
              });
            } else {
              options.url = req.query.url;
            }
            _context25.next = 8;
            return _http2.default.request(options);

          case 8:
            response = _context25.sent;

            if (!(200 !== +response.status)) {
              _context25.next = 11;
              break;
            }

            return _context25.abrupt('return', next(Tools.translate('Failed to get file headers')));

          case 11:
            res.json(response.headers);
            _context25.next = 17;
            break;

          case 14:
            _context25.prev = 14;
            _context25.t0 = _context25['catch'](2);

            next(_context25.t0);

          case 17:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this, [[2, 14]]);
  }));

  return function (_x64, _x65, _x66) {
    return ref.apply(this, arguments);
  };
}());

_captcha2.default.captchaIDs().forEach(function (id) {
  _captcha2.default.captcha(id).apiRoutes().forEach(function (route) {
    router[route.method]('/api' + route.path, route.handler);
  });
});

_board2.default.boardNames().forEach(function (name) {
  _board2.default.board(name).apiRoutes().forEach(function (route) {
    router[route.method]('/api' + route.path, route.handler);
  });
});

module.exports = router;
//# sourceMappingURL=api.js.map
