'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var testParameters = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, boardName, mode) {
    var _ref = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var fields = _ref.fields;
    var files = _ref.files;
    var postNumber = _ref.postNumber;
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
              _context.next = 17;
              break;
            }

            _context.next = 11;
            return PostsModel.getPostFileCount(boardName, postNumber);

          case 11:
            fileCount = _context.sent;

            if (!(typeof fields.text === 'undefined')) {
              _context.next = 17;
              break;
            }

            _context.next = 15;
            return PostsModel.getPost(boardName, postNumber);

          case 15:
            post = _context.sent;

            fields.text = post.rawText;

          case 17:
            _context.next = 19;
            return board.testParameters({
              req: req,
              mode: mode,
              fields: fields,
              files: files,
              existingFileCount: fileCount
            });

          case 19:
            return _context.abrupt('return', post);

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function testParameters(_x, _x2, _x3, _x4) {
    return ref.apply(this, arguments);
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

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

router.post('/action/markupText', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _ref2, _ref2$fields, boardName, text, markupMode, signAsOp, tripcode, rawText, markupModes, data;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref2 = _context2.sent;
            _ref2$fields = _ref2.fields;
            boardName = _ref2$fields.boardName;
            text = _ref2$fields.text;
            markupMode = _ref2$fields.markupMode;
            signAsOp = _ref2$fields.signAsOp;
            tripcode = _ref2$fields.tripcode;

            if (_board2.default.board(boardName)) {
              _context2.next = 12;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 12:
            _context2.next = 14;
            return (0, _geolocation2.default)(req.ip);

          case 14:
            req.geolocationInfo = _context2.sent;
            _context2.next = 17;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 17:
            rawText = text || '';
            _context2.next = 20;
            return testParameters(req, boardName, 'markupText', { fields: fields });

          case 20:
            markupMode = markupMode || '';
            markupModes = _markup2.default.markupModes(markupMode);
            _context2.next = 24;
            return (0, _markup2.default)(boardName, text, {
              markupModes: markupModes,
              accessLevel: req.level(boardName)
            });

          case 24:
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
              data.tripcode = Tools.generateTripcode(req.hashpass);
            }
            res.json(data);
            _context2.next = 33;
            break;

          case 30:
            _context2.prev = 30;
            _context2.t0 = _context2['catch'](0);

            next(_context2.t0);

          case 33:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 30]]);
  }));

  return function (_x6, _x7, _x8) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/createPost', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var transaction, _ref3, _fields, files, boardName, threadNumber, captchaEngine, _post, hash, path;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            transaction = void 0;
            _context3.prev = 1;
            _context3.next = 4;
            return Tools.parseForm(req);

          case 4:
            _ref3 = _context3.sent;
            _fields = _ref3.fields;
            files = _ref3.files;
            boardName = _fields.boardName;
            threadNumber = _fields.threadNumber;
            captchaEngine = _fields.captchaEngine;

            if (_board2.default.board(boardName)) {
              _context3.next = 12;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 12:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 15;
              break;
            }

            throw new Error(Tools.translate('Invalid thread'));

          case 15:
            _context3.next = 17;
            return (0, _geolocation2.default)(req.ip);

          case 17:
            req.geolocationInfo = _context3.sent;
            _context3.next = 20;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 20:
            _context3.next = 22;
            return _captcha2.default.checkCaptcha(req.ip, _fields);

          case 22:
            _context3.next = 24;
            return Files.getFiles(_fields, files);

          case 24:
            files = _context3.sent;
            _context3.next = 27;
            return testParameters(req, boardName, 'createPost', {
              fields: _fields,
              files: files
            });

          case 27:
            transaction = new _postCreationTransaction2.default(boardName);
            _context3.next = 30;
            return Files.processFiles(boardName, files, transaction);

          case 30:
            files = _context3.sent;
            _context3.next = 33;
            return PostsModel.createPost(req, _fields, files, transaction);

          case 33:
            _post = _context3.sent;
            _context3.next = 36;
            return IPC.render(_post.boardName, _post.threadNumber, _post.number, 'create');

          case 36:
            IPC.send('notifyAboutNewPosts', boardName + '/' + threadNumber);
            if ('node-captcha-noscript' !== captchaEngine) {
              res.json({
                boardName: _post.boardName,
                postNumber: _post.number
              });
            } else {
              hash = 'post-' + _post.number;
              path = '/' + (0, _config2.default)('site.pathPrefix') + _post.boardName + '/res/' + _post.threadNumber + '.html#' + hash;

              res.redirect(303, path);
            }
            _context3.next = 44;
            break;

          case 40:
            _context3.prev = 40;
            _context3.t0 = _context3['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context3.t0);

          case 44:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[1, 40]]);
  }));

  return function (_x9, _x10, _x11) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/createThread', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var transaction, _ref4, _fields2, files, boardName, captchaEngine, thread, _post2;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            transaction = void 0;
            _context4.prev = 1;
            _context4.next = 4;
            return Tools.parseForm(req);

          case 4:
            _ref4 = _context4.sent;
            _fields2 = _ref4.fields;
            files = _ref4.files;
            boardName = _fields2.boardName;
            captchaEngine = _fields2.captchaEngine;

            if (_board2.default.board(boardName)) {
              _context4.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            _context4.next = 13;
            return (0, _geolocation2.default)(req.ip);

          case 13:
            req.geolocationInfo = _context4.sent;
            _context4.next = 16;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 16:
            _context4.next = 18;
            return _captcha2.default.checkCaptcha(req.ip, _fields2);

          case 18:
            _context4.next = 20;
            return Files.getFiles(_fields2, files);

          case 20:
            files = _context4.sent;
            _context4.next = 23;
            return testParameters(req, boardName, 'createThread', {
              fields: _fields2,
              files: files
            });

          case 23:
            transaction = new _postCreationTransaction2.default(boardName);
            _context4.next = 26;
            return ThreadsModel.createThread(req, _fields2, transaction);

          case 26:
            thread = _context4.sent;
            _context4.next = 29;
            return Files.processFiles(boardName, files, transaction);

          case 29:
            files = _context4.sent;
            _context4.next = 32;
            return PostsModel.createPost(req, _fields2, files, transaction, {
              postNumber: thread.number,
              date: new Date(thread.createdAt)
            });

          case 32:
            _post2 = _context4.sent;
            _context4.next = 35;
            return IPC.render(_post2.boardName, _post2.threadNumber, _post2.number, 'create');

          case 35:
            if ('node-captcha-noscript' !== captchaEngine) {
              res.json({
                boardName: thread.boardName,
                threadNumber: thread.number
              });
            } else {
              res.redirect(303, '/' + (0, _config2.default)('site.pathPrefix') + thread.boardName + '/res/' + thread.number + '.html');
            }
            _context4.next = 42;
            break;

          case 38:
            _context4.prev = 38;
            _context4.t0 = _context4['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context4.t0);

          case 42:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[1, 38]]);
  }));

  return function (_x12, _x13, _x14) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/editPost', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(req, res, next) {
    var _ref5, _fields3, boardName, postNumber, _post3;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref5 = _context5.sent;
            _fields3 = _ref5.fields;
            boardName = _fields3.boardName;
            postNumber = _fields3.postNumber;

            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context5.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 10:
            _context5.next = 12;
            return (0, _geolocation2.default)(req.ip);

          case 12:
            req.geolocationInfo = _context5.sent;
            _context5.next = 15;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 15:
            _context5.next = 17;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editPost');

          case 17:
            _context5.next = 19;
            return testParameters(req, boardName, 'editPost', {
              fields: _fields3,
              postNumber: postNumber
            });

          case 19:
            _context5.next = 21;
            return PostsModel.editPost(req, _fields3);

          case 21:
            _post3 = _context5.sent;

            IPC.render(boardName, _post3.threadNumber, postNumber, 'edit');
            res.json({
              boardName: _post3.boardName,
              postNumber: _post3.number
            });
            _context5.next = 29;
            break;

          case 26:
            _context5.prev = 26;
            _context5.t0 = _context5['catch'](0);

            next(_context5.t0);

          case 29:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[0, 26]]);
  }));

  return function (_x15, _x16, _x17) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/addFiles', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, res, next) {
    var transaction, _ref6, _fields4, files, boardName, postNumber, _post4;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            transaction = void 0;
            _context6.prev = 1;
            _context6.next = 4;
            return Tools.parseForm(req);

          case 4:
            _ref6 = _context6.sent;
            _fields4 = _ref6.fields;
            files = _ref6.files;
            boardName = _fields4.boardName;
            postNumber = _fields4.postNumber;

            if (_board2.default.board(boardName)) {
              _context6.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context6.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 14:
            _context6.next = 16;
            return (0, _geolocation2.default)(req.ip);

          case 16:
            req.geolocationInfo = _context6.sent;
            _context6.next = 19;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 19:
            _context6.next = 21;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'addFilesToPost');

          case 21:
            _context6.next = 23;
            return PostsModel.getPost(boardName, postNumber);

          case 23:
            _post4 = _context6.sent;

            if (_post4) {
              _context6.next = 26;
              break;
            }

            return _context6.abrupt('return', Promise.reject(Tools.translate('No such post')));

          case 26:
            _context6.next = 28;
            return Files.getFiles(_fields4, files);

          case 28:
            files = _context6.sent;

            if (!(files.length <= 0)) {
              _context6.next = 31;
              break;
            }

            throw new Error(Tools.translate('No file specified'));

          case 31:
            _context6.next = 33;
            return testParameters(req, boardName, 'addFiles', {
              fields: _fields4,
              files: files,
              postNumber: postNumber
            });

          case 33:
            transaction = new _postCreationTransaction2.default(boardName);
            _context6.next = 36;
            return Files.processFiles(boardName, files, transaction);

          case 36:
            files = _context6.sent;
            _context6.next = 39;
            return FilesModel.addFilesToPost(boardName, postNumber, files, transaction);

          case 39:
            IPC.render(boardName, _post4.threadNumber, postNumber, 'edit');
            res.json({});
            _context6.next = 47;
            break;

          case 43:
            _context6.prev = 43;
            _context6.t0 = _context6['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context6.t0);

          case 47:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[1, 43]]);
  }));

  return function (_x18, _x19, _x20) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/deletePost', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var _ref7, _fields5, boardName, postNumber, password;

    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.prev = 0;
            _context7.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref7 = _context7.sent;
            _fields5 = _ref7.fields;
            boardName = _fields5.boardName;
            postNumber = _fields5.postNumber;
            password = _fields5.password;

            if (_board2.default.board(boardName)) {
              _context7.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context7.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 13:
            _context7.next = 15;
            return (0, _geolocation2.default)(req.ip);

          case 15:
            req.geolocationInfo = _context7.sent;
            _context7.next = 18;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 18:
            _context7.next = 20;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deletePost', Tools.sha1(password));

          case 20:
            _context7.next = 22;
            return PostsModel.deletePost(req, _fields5);

          case 22:
            res.json({});
            _context7.next = 28;
            break;

          case 25:
            _context7.prev = 25;
            _context7.t0 = _context7['catch'](0);

            next(_context7.t0);

          case 28:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[0, 25]]);
  }));

  return function (_x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/deleteFile', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(req, res, next) {
    var _ref8, _fields6, fileName, password, fileInfo, boardName, postNumber, _post5;

    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;
            _context8.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref8 = _context8.sent;
            _fields6 = _ref8.fields;
            fileName = _fields6.fileName;
            password = _fields6.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context8.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 9:
            _context8.next = 11;
            return FilesModel.getFileInfoByName(fileName);

          case 11:
            fileInfo = _context8.sent;

            if (fileInfo) {
              _context8.next = 14;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 14:
            boardName = fileInfo.boardName;
            postNumber = fileInfo.postNumber;
            _context8.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocationInfo = _context8.sent;
            _context8.next = 21;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 21:
            _context8.next = 23;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deleteFile', Tools.sha1(password));

          case 23:
            _context8.next = 25;
            return testParameters(req, boardName, 'deleteFile', { postNumber: postNumber });

          case 25:
            _post5 = _context8.sent;
            _context8.next = 28;
            return FilesModel.deleteFile(fileName);

          case 28:
            IPC.render(boardName, _post5.threadNumber, postNumber, 'edit');
            res.json({});
            _context8.next = 35;
            break;

          case 32:
            _context8.prev = 32;
            _context8.t0 = _context8['catch'](0);

            next(_context8.t0);

          case 35:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 32]]);
  }));

  return function (_x24, _x25, _x26) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/editFileRating', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, res, next) {
    var _ref9, _fields7, fileName, rating, password, fileInfo, boardName, postNumber;

    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;
            _context9.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref9 = _context9.sent;
            _fields7 = _ref9.fields;
            fileName = _fields7.fileName;
            rating = _fields7.rating;
            password = _fields7.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context9.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 10:
            _context9.next = 12;
            return FilesModel.getFileInfoByName(fileName);

          case 12:
            fileInfo = _context9.sent;

            if (fileInfo) {
              _context9.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 15:
            boardName = fileInfo.boardName;
            postNumber = fileInfo.postNumber;
            _context9.next = 19;
            return (0, _geolocation2.default)(req.ip);

          case 19:
            req.geolocationInfo = _context9.sent;
            _context9.next = 22;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 22:
            _context9.next = 24;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editFileRating', Tools.sha1(password));

          case 24:
            _context9.next = 26;
            return FilesModel.editFileRating(fileName, rating);

          case 26:
            IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            res.json({});
            _context9.next = 33;
            break;

          case 30:
            _context9.prev = 30;
            _context9.t0 = _context9['catch'](0);

            next(_context9.t0);

          case 33:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[0, 30]]);
  }));

  return function (_x27, _x28, _x29) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/editAudioTags', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, res, next) {
    var _ref10, _fields8, fileName, password, fileInfo, boardName, postNumber;

    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.prev = 0;
            _context10.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref10 = _context10.sent;
            _fields8 = _ref10.fields;
            fileName = _fields8.fileName;
            password = _fields8.password;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context10.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 9:
            _context10.next = 11;
            return FilesModel.getFileInfoByName(fileName);

          case 11:
            fileInfo = _context10.sent;

            if (fileInfo) {
              _context10.next = 14;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 14:
            if (Files.isAudioType(fileInfo.mimeType)) {
              _context10.next = 16;
              break;
            }

            throw new Error(Tools.translate('Not an audio file'));

          case 16:
            boardName = fileInfo.boardName;
            postNumber = fileInfo.postNumber;
            _context10.next = 20;
            return (0, _geolocation2.default)(req.ip);

          case 20:
            req.geolocationInfo = _context10.sent;
            _context10.next = 23;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 23:
            _context10.next = 25;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editAudioTags', Tools.sha1(password));

          case 25:
            _context10.next = 27;
            return FilesModel.editAudioTags(fileName, _fields8);

          case 27:
            IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            res.json({});
            _context10.next = 34;
            break;

          case 31:
            _context10.prev = 31;
            _context10.t0 = _context10['catch'](0);

            next(_context10.t0);

          case 34:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this, [[0, 31]]);
  }));

  return function (_x30, _x31, _x32) {
    return ref.apply(this, arguments);
  };
}());

exports.default = router;
//# sourceMappingURL=action-posts.js.map
