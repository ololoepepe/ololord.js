'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var testParameters = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, boardName, mode) {
    var _ref2 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
        fields = _ref2.fields,
        files = _ref2.files,
        postNumber = _ref2.postNumber;

    var board, fileCount, post;
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
            if (!fields) {
              fields = {};
            }
            if (!(0, _underscore2.default)(files).isArray()) {
              files = [];
            }
            fileCount = 0;

            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
            post = void 0;

            if (!postNumber) {
              _context.next = 16;
              break;
            }

            _context.next = 11;
            return PostsModel.getPost(boardName, postNumber);

          case 11:
            post = _context.sent;

            if (typeof fields.text === 'undefined') {
              fields.text = post.rawText;
            }
            _context.next = 15;
            return FilesModel.getPostFileCount(boardName, postNumber);

          case 15:
            fileCount = _context.sent;

          case 16:
            _context.next = 18;
            return board.testParameters({
              req: req,
              mode: mode,
              fields: fields,
              files: files,
              existingFileCount: fileCount
            });

          case 18:
            return _context.abrupt('return', post);

          case 19:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function testParameters(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _captcha = require('../captchas/captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _geolocation = require('../core/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _postCreationTransaction = require('../helpers/post-creation-transaction');

var _postCreationTransaction2 = _interopRequireDefault(_postCreationTransaction);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _markup = require('../markup');

var _markup2 = _interopRequireDefault(_markup);

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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

router.post('/action/markupText', function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _ref4, fields, boardName, text, markupMode, signAsOp, tripcode, board, rawText, markupModes, data;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref4 = _context2.sent;
            fields = _ref4.fields;
            boardName = fields.boardName, text = fields.text, markupMode = fields.markupMode, signAsOp = fields.signAsOp, tripcode = fields.tripcode;
            board = _board2.default.board(boardName);

            if (board) {
              _context2.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 9:
            _context2.next = 11;
            return (0, _geolocation2.default)(req.ip);

          case 11:
            req.geolocationInfo = _context2.sent;
            _context2.next = 14;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 14:
            rawText = text || '';
            _context2.next = 17;
            return testParameters(req, boardName, 'markupText', { fields: fields });

          case 17:
            markupMode = markupMode || '';
            markupModes = _markup2.default.markupModes(markupMode);
            _context2.next = 21;
            return (0, _markup2.default)(boardName, text, {
              markupModes: markupModes,
              accessLevel: req.level(boardName)
            });

          case 21:
            text = _context2.sent;
            data = {
              boardName: boardName,
              text: text || null,
              rawText: rawText || null,
              options: {
                signAsOp: 'true' === signAsOp,
                showTripcode: !!(req.hashpass && 'true' === tripcode)
              },
              createdAt: Tools.now().toISOString()
            };

            if (req.hashpass && tripcode) {
              data.tripcode = board.generateTripcode(req.hashpass);
            }
            res.json(data);
            _context2.next = 30;
            break;

          case 27:
            _context2.prev = 27;
            _context2.t0 = _context2['catch'](0);

            next(_context2.t0);

          case 30:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 27]]);
  }));

  return function (_x5, _x6, _x7) {
    return _ref3.apply(this, arguments);
  };
}());

router.post('/action/createPost', function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var transaction, _ref6, fields, files, boardName, threadNumber, captchaEngine, thread, post, hash, path;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            transaction = void 0;
            _context3.prev = 1;
            _context3.next = 4;
            return Files.parseForm(req);

          case 4:
            _ref6 = _context3.sent;
            fields = _ref6.fields;
            files = _ref6.files;
            boardName = fields.boardName, threadNumber = fields.threadNumber, captchaEngine = fields.captchaEngine;

            if (_board2.default.board(boardName)) {
              _context3.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid thread'));

          case 13:
            _context3.next = 15;
            return (0, _geolocation2.default)(req.ip);

          case 15:
            req.geolocationInfo = _context3.sent;
            _context3.next = 18;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 18:
            _context3.next = 20;
            return _captcha2.default.checkCaptcha(req, fields);

          case 20:
            _context3.next = 22;
            return Files.getFiles(fields, files);

          case 22:
            files = _context3.sent;
            _context3.next = 25;
            return testParameters(req, boardName, 'createPost', {
              fields: fields,
              files: files
            });

          case 25:
            _context3.next = 27;
            return ThreadsModel.getThread(boardName, threadNumber, {
              closed: 1,
              unbumpable: 1
            });

          case 27:
            thread = _context3.sent;

            if (!thread.closed) {
              _context3.next = 30;
              break;
            }

            throw new Error(Tools.translate('Posting is disabled in this thread'));

          case 30:
            transaction = new _postCreationTransaction2.default(boardName);
            _context3.next = 33;
            return Files.processFiles(boardName, files, transaction);

          case 33:
            files = _context3.sent;
            _context3.next = 36;
            return PostsModel.createPost(req, fields, files, transaction, {
              unbumpable: thread.unbumpable,
              archived: thread.archived
            });

          case 36:
            post = _context3.sent;

            IPC.send('notifyAboutNewPosts', boardName + '/' + threadNumber);
            if ('node-captcha-noscript' !== captchaEngine) {
              res.json({
                boardName: post.boardName,
                postNumber: post.number
              });
            } else {
              hash = 'post-' + post.number;
              path = '/' + (0, _config2.default)('site.pathPrefix') + post.boardName + '/res/' + post.threadNumber + '.html#' + hash;

              res.redirect(303, path);
            }
            _context3.next = 45;
            break;

          case 41:
            _context3.prev = 41;
            _context3.t0 = _context3['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context3.t0);

          case 45:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[1, 41]]);
  }));

  return function (_x8, _x9, _x10) {
    return _ref5.apply(this, arguments);
  };
}());

router.post('/action/createThread', function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var transaction, _ref8, fields, files, boardName, captchaEngine, thread, post;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            transaction = void 0;
            _context4.prev = 1;
            _context4.next = 4;
            return Files.parseForm(req);

          case 4:
            _ref8 = _context4.sent;
            fields = _ref8.fields;
            files = _ref8.files;
            boardName = fields.boardName, captchaEngine = fields.captchaEngine;

            if (_board2.default.board(boardName)) {
              _context4.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            _context4.next = 12;
            return (0, _geolocation2.default)(req.ip);

          case 12:
            req.geolocationInfo = _context4.sent;
            _context4.next = 15;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 15:
            _context4.next = 17;
            return _captcha2.default.checkCaptcha(req, fields);

          case 17:
            _context4.next = 19;
            return Files.getFiles(fields, files);

          case 19:
            files = _context4.sent;
            _context4.next = 22;
            return testParameters(req, boardName, 'createThread', {
              fields: fields,
              files: files
            });

          case 22:
            transaction = new _postCreationTransaction2.default(boardName);
            _context4.next = 25;
            return ThreadsModel.createThread(req, fields, transaction);

          case 25:
            thread = _context4.sent;
            _context4.next = 28;
            return Files.processFiles(boardName, files, transaction);

          case 28:
            files = _context4.sent;
            _context4.next = 31;
            return PostsModel.createPost(req, fields, files, transaction, {
              postNumber: thread.number,
              date: new Date(thread.createdAt)
            });

          case 31:
            post = _context4.sent;

            if ('node-captcha-noscript' !== captchaEngine) {
              res.json({
                boardName: thread.boardName,
                threadNumber: thread.number
              });
            } else {
              res.redirect(303, '/' + (0, _config2.default)('site.pathPrefix') + thread.boardName + '/res/' + thread.number + '.html');
            }
            _context4.next = 39;
            break;

          case 35:
            _context4.prev = 35;
            _context4.t0 = _context4['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context4.t0);

          case 39:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[1, 35]]);
  }));

  return function (_x11, _x12, _x13) {
    return _ref7.apply(this, arguments);
  };
}());

router.post('/action/editPost', function () {
  var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(req, res, next) {
    var _ref10, fields, boardName, postNumber, post;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref10 = _context5.sent;
            fields = _ref10.fields;
            boardName = fields.boardName, postNumber = fields.postNumber;

            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context5.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 9:
            _context5.next = 11;
            return (0, _geolocation2.default)(req.ip);

          case 11:
            req.geolocationInfo = _context5.sent;
            _context5.next = 14;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 14:
            _context5.next = 16;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editPost');

          case 16:
            _context5.next = 18;
            return testParameters(req, boardName, 'editPost', {
              fields: fields,
              postNumber: postNumber
            });

          case 18:
            _context5.next = 20;
            return PostsModel.editPost(req, fields);

          case 20:
            post = _context5.sent;

            res.json({
              boardName: post.boardName,
              postNumber: post.number
            });
            _context5.next = 27;
            break;

          case 24:
            _context5.prev = 24;
            _context5.t0 = _context5['catch'](0);

            next(_context5.t0);

          case 27:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[0, 24]]);
  }));

  return function (_x14, _x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}());

router.post('/action/addFiles', function () {
  var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, res, next) {
    var transaction, _ref12, fields, files, boardName, postNumber, post;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            transaction = void 0;
            _context6.prev = 1;
            _context6.next = 4;
            return Files.parseForm(req);

          case 4:
            _ref12 = _context6.sent;
            fields = _ref12.fields;
            files = _ref12.files;
            boardName = fields.boardName, postNumber = fields.postNumber;

            if (_board2.default.board(boardName)) {
              _context6.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context6.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 13:
            _context6.next = 15;
            return (0, _geolocation2.default)(req.ip);

          case 15:
            req.geolocationInfo = _context6.sent;
            _context6.next = 18;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 18:
            _context6.next = 20;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'addFilesToPost');

          case 20:
            _context6.next = 22;
            return PostsModel.getPost(boardName, postNumber);

          case 22:
            post = _context6.sent;

            if (post) {
              _context6.next = 25;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 25:
            _context6.next = 27;
            return Files.getFiles(fields, files);

          case 27:
            files = _context6.sent;

            if (!(files.length <= 0)) {
              _context6.next = 30;
              break;
            }

            throw new Error(Tools.translate('No file specified'));

          case 30:
            _context6.next = 32;
            return testParameters(req, boardName, 'addFiles', {
              fields: fields,
              files: files,
              postNumber: postNumber
            });

          case 32:
            transaction = new _postCreationTransaction2.default(boardName);
            _context6.next = 35;
            return Files.processFiles(boardName, files, transaction);

          case 35:
            files = _context6.sent;
            _context6.next = 38;
            return FilesModel.addFilesToPost(boardName, postNumber, files);

          case 38:
            res.json({});
            _context6.next = 45;
            break;

          case 41:
            _context6.prev = 41;
            _context6.t0 = _context6['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context6.t0);

          case 45:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[1, 41]]);
  }));

  return function (_x17, _x18, _x19) {
    return _ref11.apply(this, arguments);
  };
}());

router.post('/action/deletePost', function () {
  var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var _ref14, fields, boardName, postNumber, password, isThread;

    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.prev = 0;
            _context7.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref14 = _context7.sent;
            fields = _ref14.fields;
            boardName = fields.boardName, postNumber = fields.postNumber, password = fields.password;

            if (_board2.default.board(boardName)) {
              _context7.next = 8;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 8:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context7.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 11:
            _context7.next = 13;
            return (0, _geolocation2.default)(req.ip);

          case 13:
            req.geolocationInfo = _context7.sent;
            _context7.next = 16;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 16:
            _context7.next = 18;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deletePost', Tools.sha1(password));

          case 18:
            _context7.next = 20;
            return ThreadsModel.threadExists(boardName, postNumber);

          case 20:
            isThread = _context7.sent;

            if (!isThread) {
              _context7.next = 26;
              break;
            }

            _context7.next = 24;
            return ThreadsModel.deleteThread(boardName, postNumber);

          case 24:
            _context7.next = 28;
            break;

          case 26:
            _context7.next = 28;
            return PostsModel.deletePost(boardName, postNumber);

          case 28:
            res.json({});
            _context7.next = 34;
            break;

          case 31:
            _context7.prev = 31;
            _context7.t0 = _context7['catch'](0);

            next(_context7.t0);

          case 34:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[0, 31]]);
  }));

  return function (_x20, _x21, _x22) {
    return _ref13.apply(this, arguments);
  };
}());

router.post('/action/deleteFile', function () {
  var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(req, res, next) {
    var _ref16, fields, fileName, password, fileInfo, boardName, postNumber, post;

    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;
            _context8.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref16 = _context8.sent;
            fields = _ref16.fields;
            fileName = fields.fileName, password = fields.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context8.next = 8;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 8:
            _context8.next = 10;
            return FilesModel.getFileInfoByName(fileName);

          case 10:
            fileInfo = _context8.sent;

            if (fileInfo) {
              _context8.next = 13;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 13:
            boardName = fileInfo.boardName, postNumber = fileInfo.postNumber;
            _context8.next = 16;
            return (0, _geolocation2.default)(req.ip);

          case 16:
            req.geolocationInfo = _context8.sent;
            _context8.next = 19;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 19:
            _context8.next = 21;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deleteFile', Tools.sha1(password));

          case 21:
            _context8.next = 23;
            return testParameters(req, boardName, 'deleteFile', { postNumber: postNumber });

          case 23:
            post = _context8.sent;
            _context8.next = 26;
            return FilesModel.deleteFile(fileName);

          case 26:
            res.json({});
            _context8.next = 32;
            break;

          case 29:
            _context8.prev = 29;
            _context8.t0 = _context8['catch'](0);

            next(_context8.t0);

          case 32:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 29]]);
  }));

  return function (_x23, _x24, _x25) {
    return _ref15.apply(this, arguments);
  };
}());

router.post('/action/editFileRating', function () {
  var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, res, next) {
    var _ref18, fields, fileName, rating, password, fileInfo, boardName, postNumber;

    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;
            _context9.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref18 = _context9.sent;
            fields = _ref18.fields;
            fileName = fields.fileName, rating = fields.rating, password = fields.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context9.next = 8;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 8:
            _context9.next = 10;
            return FilesModel.getFileInfoByName(fileName);

          case 10:
            fileInfo = _context9.sent;

            if (fileInfo) {
              _context9.next = 13;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 13:
            boardName = fileInfo.boardName, postNumber = fileInfo.postNumber;
            _context9.next = 16;
            return (0, _geolocation2.default)(req.ip);

          case 16:
            req.geolocationInfo = _context9.sent;
            _context9.next = 19;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 19:
            _context9.next = 21;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editFileRating', Tools.sha1(password));

          case 21:
            _context9.next = 23;
            return FilesModel.editFileRating(fileName, rating);

          case 23:
            res.json({});
            _context9.next = 29;
            break;

          case 26:
            _context9.prev = 26;
            _context9.t0 = _context9['catch'](0);

            next(_context9.t0);

          case 29:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[0, 26]]);
  }));

  return function (_x26, _x27, _x28) {
    return _ref17.apply(this, arguments);
  };
}());

router.post('/action/editAudioTags', function () {
  var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, res, next) {
    var _ref20, fields, fileName, password, fileInfo, boardName, postNumber;

    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.prev = 0;
            _context10.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref20 = _context10.sent;
            fields = _ref20.fields;
            fileName = fields.fileName, password = fields.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context10.next = 8;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 8:
            _context10.next = 10;
            return FilesModel.getFileInfoByName(fileName);

          case 10:
            fileInfo = _context10.sent;

            if (fileInfo) {
              _context10.next = 13;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 13:
            if (Files.isAudioType(fileInfo.mimeType)) {
              _context10.next = 15;
              break;
            }

            throw new Error(Tools.translate('Not an audio file'));

          case 15:
            boardName = fileInfo.boardName, postNumber = fileInfo.postNumber;
            _context10.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocationInfo = _context10.sent;
            _context10.next = 21;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 21:
            _context10.next = 23;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editAudioTags', Tools.sha1(password));

          case 23:
            _context10.next = 25;
            return FilesModel.editAudioTags(fileName, fields);

          case 25:
            res.json({});
            _context10.next = 31;
            break;

          case 28:
            _context10.prev = 28;
            _context10.t0 = _context10['catch'](0);

            next(_context10.t0);

          case 31:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this, [[0, 28]]);
  }));

  return function (_x29, _x30, _x31) {
    return _ref19.apply(this, arguments);
  };
}());

exports.default = router;
//# sourceMappingURL=action-posts.js.map
