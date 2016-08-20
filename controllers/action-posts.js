'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var testParameters = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, mode) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

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
            return board.testParameters(mode, fields, files, fileCount);

          case 19:
            return _context.abrupt('return', post);

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function testParameters(_x, _x2, _x3) {
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

var _markup = require('../core/markup');

var _markup2 = _interopRequireDefault(_markup);

var _files = require('../models/files');

var FilesModel = _interopRequireWildcard(_files);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _postCreationTransaction = require('../storage/post-creation-transaction');

var _postCreationTransaction2 = _interopRequireDefault(_postCreationTransaction);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _files2 = require('../storage/files');

var Files = _interopRequireWildcard(_files2);

var _geolocation = require('../storage/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

router.post('/action/markupText', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _ref2, _ref2$fields, boardName, text, markupMode, signAsOp, tripcode, board, rawText, markupModes, data;

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
            board = _board2.default.board(boardName);

            if (board) {
              _context2.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 13:
            _context2.next = 15;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 15:
            //TODO: Should it really be "write"?
            rawText = text || '';
            _context2.next = 18;
            return testParameters(boardName, 'markupText', { fields: fields });

          case 18:
            markupMode = markupMode || '';
            markupModes = _markup2.default.markupModes(markupMode);
            _context2.next = 22;
            return (0, _markup2.default)(boardName, text, {
              markupModes: markupModes,
              accessLevel: req.level(boardName)
            });

          case 22:
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
            _context2.next = 31;
            break;

          case 28:
            _context2.prev = 28;
            _context2.t0 = _context2['catch'](0);

            next(_context2.t0);

          case 31:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 28]]);
  }));

  return function (_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/createPost', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var transaction, _ref3, _fields, files, boardName, threadNumber, captchaEngine, board, _post, hash, path;

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
            board = _board2.default.board(boardName);

            if (board) {
              _context3.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 13:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 16;
              break;
            }

            throw new Error(Tools.translate('Invalid thread'));

          case 16:
            _context3.next = 18;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 18:
            _context3.next = 20;
            return (0, _geolocation2.default)(req.ip);

          case 20:
            req.geolocation = _context3.sent;
            _context3.next = 23;
            return UsersModel.checkGeoBan(req.geolocation);

          case 23:
            _context3.next = 25;
            return _captcha2.default.checkCaptcha(req.ip, _fields);

          case 25:
            _context3.next = 27;
            return Files.getFiles(_fields, files);

          case 27:
            files = _context3.sent;
            _context3.next = 30;
            return testParameters(boardName, 'createPost', {
              fields: _fields,
              files: files
            });

          case 30:
            transaction = new _postCreationTransaction2.default(boardName);
            _context3.next = 33;
            return Files.processFiles(boardName, files, transaction);

          case 33:
            files = _context3.sent;
            _context3.next = 36;
            return PostsModel.createPost(req, _fields, files, transaction);

          case 36:
            _post = _context3.sent;
            _context3.next = 39;
            return IPC.render(_post.boardName, _post.threadNumber, _post.number, 'create');

          case 39:
            //hasNewPosts.add(c.post.boardName + "/" + c.post.threadNumber); //TODO: pass to main process immediately
            if ('node-captcha-noscript' !== captchaEngine) {
              res.send({
                boardName: _post.boardName,
                postNumber: _post.number
              });
            } else {
              hash = 'post-' + _post.number;
              path = '/' + (0, _config2.default)('site.pathPrefix') + _post.boardName + '/res/' + _post.threadNumber + '.html#' + hash;

              res.redirect(303, path);
            }
            _context3.next = 46;
            break;

          case 42:
            _context3.prev = 42;
            _context3.t0 = _context3['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context3.t0);

          case 46:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[1, 42]]);
  }));

  return function (_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/createThread', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var transaction, _ref4, _fields2, files, boardName, captchaEngine, board, thread, _post2;

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
            board = _board2.default.board(boardName);

            if (board) {
              _context4.next = 12;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 12:
            _context4.next = 14;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 14:
            _context4.next = 16;
            return (0, _geolocation2.default)(req.ip);

          case 16:
            req.geolocation = _context4.sent;
            _context4.next = 19;
            return UsersModel.checkGeoBan(req.geolocation);

          case 19:
            _context4.next = 21;
            return _captcha2.default.checkCaptcha(req.ip, _fields2);

          case 21:
            _context4.next = 23;
            return Files.getFiles(_fields2, files);

          case 23:
            files = _context4.sent;
            _context4.next = 26;
            return testParameters(boardName, 'createThread', {
              fields: _fields2,
              files: files
            });

          case 26:
            transaction = new _postCreationTransaction2.default(boardName);
            _context4.next = 29;
            return ThreadsModel.createThread(req, _fields2, transaction);

          case 29:
            thread = _context4.sent;
            _context4.next = 32;
            return Files.processFiles(boardName, files, transaction);

          case 32:
            files = _context4.sent;
            _context4.next = 35;
            return PostsModel.createPost(req, _fields2, files, transaction, {
              postNumber: thread.number,
              date: new Date(thread.createdAt)
            });

          case 35:
            _post2 = _context4.sent;
            _context4.next = 38;
            return IPC.render(_post2.boardName, _post2.threadNumber, _post2.number, 'create');

          case 38:
            if ('node-captcha-noscript' !== captchaEngine) {
              res.send({
                boardName: thread.boardName,
                threadNumber: thread.number
              });
            } else {
              res.redirect(303, '/' + (0, _config2.default)('site.pathPrefix') + thread.boardName + '/res/' + thread.number + '.html');
            }
            _context4.next = 45;
            break;

          case 41:
            _context4.prev = 41;
            _context4.t0 = _context4['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context4.t0);

          case 45:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[1, 41]]);
  }));

  return function (_x11, _x12, _x13) {
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
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 12:
            _context5.next = 14;
            return (0, _geolocation2.default)(req.ip);

          case 14:
            req.geolocation = _context5.sent;
            _context5.next = 17;
            return UsersModel.checkGeoBan(req.geolocation);

          case 17:
            _context5.next = 19;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editPost');

          case 19:
            _context5.next = 21;
            return testParameters(boardName, 'editPost', {
              fields: _fields3,
              postNumber: postNumber
            });

          case 21:
            _context5.next = 23;
            return PostsModel.editPost(req, _fields3);

          case 23:
            _post3 = _context5.sent;

            IPC.render(boardName, _post3.threadNumber, postNumber, 'edit');
            res.send({
              boardName: _post3.boardName,
              postNumber: _post3.number
            });
            _context5.next = 31;
            break;

          case 28:
            _context5.prev = 28;
            _context5.t0 = _context5['catch'](0);

            next(_context5.t0);

          case 31:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[0, 28]]);
  }));

  return function (_x14, _x15, _x16) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/addFiles', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, res, next) {
    var transaction, _ref6, _fields4, files, boardName, postNumber, board, _post4;

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
            board = _board2.default.board(boardName);

            if (board) {
              _context6.next = 12;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 12:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context6.next = 15;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 15:
            _context6.next = 17;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 17:
            _context6.next = 19;
            return (0, _geolocation2.default)(req.ip);

          case 19:
            req.geolocation = _context6.sent;
            _context6.next = 22;
            return UsersModel.checkGeoBan(req.geolocation);

          case 22:
            _context6.next = 24;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'addFilesToPost');

          case 24:
            _context6.next = 26;
            return PostsModel.getPost(boardName, postNumber);

          case 26:
            _post4 = _context6.sent;

            if (_post4) {
              _context6.next = 29;
              break;
            }

            return _context6.abrupt('return', Promise.reject(Tools.translate('No such post')));

          case 29:
            _context6.next = 31;
            return Files.getFiles(_fields4, files);

          case 31:
            files = _context6.sent;

            if (!(files.length <= 0)) {
              _context6.next = 34;
              break;
            }

            throw new Error(Tools.translate('No file specified'));

          case 34:
            _context6.next = 36;
            return testParameters(boardName, 'addFiles', {
              fields: _fields4,
              files: files,
              postNumber: postNumber
            });

          case 36:
            transaction = new _postCreationTransaction2.default(boardName);
            _context6.next = 39;
            return Files.processFiles(boardName, files, transaction);

          case 39:
            files = _context6.sent;
            _context6.next = 42;
            return FilesModel.addFilesToPost(boardName, postNumber, files, transaction);

          case 42:
            IPC.render(boardName, _post4.threadNumber, postNumber, 'edit');
            res.send({});
            _context6.next = 50;
            break;

          case 46:
            _context6.prev = 46;
            _context6.t0 = _context6['catch'](1);

            if (transaction) {
              transaction.rollback();
            }
            next(_context6.t0);

          case 50:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[1, 46]]);
  }));

  return function (_x17, _x18, _x19) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/deletePost', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var _ref7, _fields5, boardName, postNumber, password, board;

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
            board = _board2.default.board(boardName);

            if (board) {
              _context7.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context7.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 14:
            _context7.next = 16;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 16:
            _context7.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocation = _context7.sent;
            _context7.next = 21;
            return UsersModel.checkGeoBan(req.geolocation);

          case 21:
            _context7.next = 23;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deletePost', Tools.sha1(password));

          case 23:
            _context7.next = 25;
            return PostsModel.deletePost(req, _fields5);

          case 25:
            res.send({});
            _context7.next = 31;
            break;

          case 28:
            _context7.prev = 28;
            _context7.t0 = _context7['catch'](0);

            next(_context7.t0);

          case 31:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[0, 28]]);
  }));

  return function (_x20, _x21, _x22) {
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
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 18:
            _context8.next = 20;
            return (0, _geolocation2.default)(req.ip);

          case 20:
            req.geolocation = _context8.sent;
            _context8.next = 23;
            return UsersModel.checkGeoBan(req.geolocation);

          case 23:
            _context8.next = 25;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'deleteFile', Tools.sha1(password));

          case 25:
            _context8.next = 27;
            return testParameters(boardName, 'deleteFile', { postNumber: postNumber });

          case 27:
            _post5 = _context8.sent;
            _context8.next = 30;
            return FilesModel.deleteFile(fileName);

          case 30:
            IPC.render(boardName, _post5.threadNumber, postNumber, 'edit');
            res.send({});
            _context8.next = 37;
            break;

          case 34:
            _context8.prev = 34;
            _context8.t0 = _context8['catch'](0);

            next(_context8.t0);

          case 37:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 34]]);
  }));

  return function (_x23, _x24, _x25) {
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
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 19:
            _context9.next = 21;
            return (0, _geolocation2.default)(req.ip);

          case 21:
            req.geolocation = _context9.sent;
            _context9.next = 24;
            return UsersModel.checkGeoBan(req.geolocation);

          case 24:
            _context9.next = 26;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editFileRating', Tools.sha1(password));

          case 26:
            _context9.next = 28;
            return FilesModel.editFileRating(fileName, rating);

          case 28:
            IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            res.send({});
            _context9.next = 35;
            break;

          case 32:
            _context9.prev = 32;
            _context9.t0 = _context9['catch'](0);

            next(_context9.t0);

          case 35:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[0, 32]]);
  }));

  return function (_x26, _x27, _x28) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/editAudioTags', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, res, next) {
    var _ref10, fields, fileName, password, fileInfo, boardName, postNumber;

    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.next = 2;
            return Tools.parseForm(req);

          case 2:
            _ref10 = _context10.sent;
            fields = _ref10.fields;
            fileName = fields.fileName;
            password = fields.password;

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
            if (Tools.isAudioType(fileInfo.mimeType)) {
              _context10.next = 15;
              break;
            }

            throw new Error(Tools.translate('Not an audio file'));

          case 15:
            boardName = fileInfo.boardName;
            postNumber = fileInfo.postNumber;
            _context10.next = 19;
            return UsersModel.checkUserBan(req.ip, boardName, { write: true });

          case 19:
            _context10.next = 21;
            return (0, _geolocation2.default)(req.ip);

          case 21:
            req.geolocation = _context10.sent;
            _context10.next = 24;
            return UsersModel.checkGeoBan(req.geolocation);

          case 24:
            _context10.next = 26;
            return UsersModel.checkUserPermissions(req, boardName, postNumber, 'editAudioTags', Tools.sha1(password));

          case 26:
            _context10.next = 28;
            return FilesModel.editAudioTags(fileName, fields);

          case 28:
            IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            res.send({});

          case 30:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function (_x29, _x30, _x31) {
    return ref.apply(this, arguments);
  };
}());

exports.default = router;
//# sourceMappingURL=action-posts.js.map
