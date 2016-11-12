'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var getRegisteredUserData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(fields) {
    var ips, levels;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            ips = Tools.ipList(fields.ips);

            if (!(typeof ips === 'string')) {
              _context.next = 3;
              break;
            }

            throw new Error(ips);

          case 3:
            levels = (0, _underscore2.default)(fields).map(function (value, name) {
              var match = name.match(/^accessLevelBoard_(\S+)$/);
              if (!match || 'NONE' === value) {
                return;
              }
              return {
                boardName: match[1],
                level: value
              };
            }).filter(function (level) {
              return !!level;
            });
            return _context.abrupt('return', {
              levels: levels,
              ips: ips
            });

          case 5:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getRegisteredUserData(_x) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

router.post('/action/registerUser', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _ref, fields, password, _ref2, levels, ips, hashpass;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;

            if (req.isSuperuser()) {
              _context2.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context2.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref = _context2.sent;
            fields = _ref.fields;
            password = fields.password;

            if (password) {
              _context2.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid password'));

          case 10:
            _context2.next = 12;
            return getRegisteredUserData(fields);

          case 12:
            _ref2 = _context2.sent;
            levels = _ref2.levels;
            ips = _ref2.ips;
            hashpass = Tools.mayBeHashpass(password) ? password : Tools.toHashpass(password);
            _context2.next = 18;
            return UsersModel.registerUser(hashpass, levels, ips);

          case 18:
            res.json({ hashpass: hashpass });
            _context2.next = 24;
            break;

          case 21:
            _context2.prev = 21;
            _context2.t0 = _context2['catch'](0);

            next(_context2.t0);

          case 24:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 21]]);
  }));

  return function (_x2, _x3, _x4) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/updateRegisteredUser', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var _ref3, fields, hashpass, _ref4, levels, ips;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;

            if (req.isSuperuser()) {
              _context3.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context3.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref3 = _context3.sent;
            fields = _ref3.fields;
            hashpass = fields.hashpass;

            if (!(!hashpass || !Tools.mayBeHashpass(hashpass))) {
              _context3.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid hashpass'));

          case 10:
            _context3.next = 12;
            return getRegisteredUserData(fields);

          case 12:
            _ref4 = _context3.sent;
            levels = _ref4.levels;
            ips = _ref4.ips;
            _context3.next = 17;
            return UsersModel.updateRegisteredUser(hashpass, levels, ips);

          case 17:
            res.json({});
            _context3.next = 23;
            break;

          case 20:
            _context3.prev = 20;
            _context3.t0 = _context3['catch'](0);

            next(_context3.t0);

          case 23:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 20]]);
  }));

  return function (_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/unregisterUser', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var _ref5, hashpass;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;

            if (req.isSuperuser()) {
              _context4.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context4.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref5 = _context4.sent;
            hashpass = _ref5.fields.hashpass;

            if (!(!hashpass || !Tools.mayBeHashpass(hashpass))) {
              _context4.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid hashpass'));

          case 9:
            _context4.next = 11;
            return UsersModel.unregisterUser(hashpass);

          case 11:
            res.json({});
            _context4.next = 17;
            break;

          case 14:
            _context4.prev = 14;
            _context4.t0 = _context4['catch'](0);

            next(_context4.t0);

          case 17:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 14]]);
  }));

  return function (_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserAddFile', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(req, res, next) {
    var _ref6, _ref6$fields, dir, fileName, isDir, files;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;

            if (req.isSuperuser()) {
              _context5.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context5.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref6 = _context5.sent;
            _ref6$fields = _ref6.fields;
            dir = _ref6$fields.dir;
            fileName = _ref6$fields.fileName;
            isDir = _ref6$fields.isDir;
            files = _ref6.files;

            if (!(!dir || typeof dir !== 'string')) {
              _context5.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid dir'));

          case 13:
            if (!(!fileName || typeof fileName !== 'string')) {
              _context5.next = 15;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 15:
            _context5.next = 17;
            return Files.createFile(dir, fileName, {
              isDir: 'true' === isDir,
              file: (0, _underscore2.default)(files).toArray()[0]
            });

          case 17:
            res.json({});
            _context5.next = 23;
            break;

          case 20:
            _context5.prev = 20;
            _context5.t0 = _context5['catch'](0);

            next(Tools.processError(_context5.t0, true));

          case 23:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[0, 20]]);
  }));

  return function (_x11, _x12, _x13) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserEditFile', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, res, next) {
    var _ref7, _ref7$fields, fileName, content;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.prev = 0;

            if (req.isSuperuser()) {
              _context6.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context6.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref7 = _context6.sent;
            _ref7$fields = _ref7.fields;
            fileName = _ref7$fields.fileName;
            content = _ref7$fields.content;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context6.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 11:
            _context6.next = 13;
            return Files.editFile(fileName, content);

          case 13:
            res.json({});
            _context6.next = 19;
            break;

          case 16:
            _context6.prev = 16;
            _context6.t0 = _context6['catch'](0);

            next(Tools.processError(_context6.t0, false));

          case 19:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[0, 16]]);
  }));

  return function (_x14, _x15, _x16) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserRenameFile', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var _ref8, _ref8$fields, oldFileName, fileName;

    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.prev = 0;

            if (req.isSuperuser()) {
              _context7.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context7.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref8 = _context7.sent;
            _ref8$fields = _ref8.fields;
            oldFileName = _ref8$fields.oldFileName;
            fileName = _ref8$fields.fileName;

            if (!(!oldFileName || typeof oldFileName !== 'string' || !fileName || typeof fileName !== 'string')) {
              _context7.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 11:
            _context7.next = 13;
            return Files.renameFile(oldFileName, fileName);

          case 13:
            res.json({});
            _context7.next = 19;
            break;

          case 16:
            _context7.prev = 16;
            _context7.t0 = _context7['catch'](0);

            next(Tools.processError(_context7.t0));

          case 19:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[0, 16]]);
  }));

  return function (_x17, _x18, _x19) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserDeleteFile', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(req, res, next) {
    var _ref9, fileName;

    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;

            if (req.isSuperuser()) {
              _context8.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context8.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref9 = _context8.sent;
            fileName = _ref9.fields.fileName;

            if (!(!fileName || typeof fileName !== 'string')) {
              _context8.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid file name'));

          case 9:
            _context8.next = 11;
            return Files.deleteFile(fileName);

          case 11:
            res.json({});
            _context8.next = 17;
            break;

          case 14:
            _context8.prev = 14;
            _context8.t0 = _context8['catch'](0);

            next(Tools.processError(_context8.t0));

          case 17:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this, [[0, 14]]);
  }));

  return function (_x20, _x21, _x22) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserRerender', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, res, next) {
    var _ref10, _targets;

    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;

            if (req.isSuperuser()) {
              _context9.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context9.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref10 = _context9.sent;
            _targets = _ref10.fields.targets;

            if (!(typeof _targets !== 'string')) {
              _context9.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid targets'));

          case 9:
            if (!_targets) {
              _context9.next = 14;
              break;
            }

            _context9.next = 12;
            return Renderer.rerender(_targets);

          case 12:
            _context9.next = 16;
            break;

          case 14:
            _context9.next = 16;
            return Renderer.rerender();

          case 16:
            res.json({});
            _context9.next = 22;
            break;

          case 19:
            _context9.prev = 19;
            _context9.t0 = _context9['catch'](0);

            next(Tools.processError(_context9.t0));

          case 22:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[0, 19]]);
  }));

  return function (_x23, _x24, _x25) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserMarkupPosts', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, res, next) {
    var _ref11, _targets2;

    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.prev = 0;

            if (req.isSuperuser()) {
              _context10.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context10.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref11 = _context10.sent;
            _targets2 = _ref11.fields.targets;

            if (!(typeof _targets2 !== 'string')) {
              _context10.next = 9;
              break;
            }

            throw new Error(Tools.translate('Invalid targets'));

          case 9:
            _context10.next = 11;
            return PostsModel.markupPosts(Renderer.targetsFromString(_targets2));

          case 11:
            //TODO: Rerender corresponding pages?
            res.json({});
            _context10.next = 17;
            break;

          case 14:
            _context10.prev = 14;
            _context10.t0 = _context10['catch'](0);

            next(Tools.processError(_context10.t0));

          case 17:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this, [[0, 14]]);
  }));

  return function (_x26, _x27, _x28) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/superuserReload', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(req, res, next) {
    var _ref12, _ref12$fields, boards, templates;

    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.prev = 0;

            if (req.isSuperuser()) {
              _context11.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context11.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref12 = _context11.sent;
            _ref12$fields = _ref12.fields;
            boards = _ref12$fields.boards;
            templates = _ref12$fields.templates;

            if (!(typeof targets !== 'string')) {
              _context11.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid targets'));

          case 11:
            if (!('true' === boards)) {
              _context11.next = 14;
              break;
            }

            _context11.next = 14;
            return IPC.send('reloadBoards');

          case 14:
            if (!('true' === templates)) {
              _context11.next = 17;
              break;
            }

            _context11.next = 17;
            return IPC.send('reloadTemplates');

          case 17:
            res.json({});
            _context11.next = 23;
            break;

          case 20:
            _context11.prev = 20;
            _context11.t0 = _context11['catch'](0);

            next(Tools.processError(_context11.t0));

          case 23:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this, [[0, 20]]);
  }));

  return function (_x29, _x30, _x31) {
    return ref.apply(this, arguments);
  };
}());

exports.default = router;
//# sourceMappingURL=action-manage.js.map
