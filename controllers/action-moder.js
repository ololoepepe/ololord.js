'use strict';

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

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

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

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _geolocation = require('../storage/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var moment = require("moment");

var Captcha = require("../captchas/captcha");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../core/markup");

var router = _express2.default.Router();

function getBans(fields) {
  var timeOffset = fields.timeOffset;

  var bans = (0, _underscore2.default)(fields).pick(function (value, name) {
    return (/^banBoard_\S+$/.test(name) && 'NONE' !== fields['banLevel_' + value]
    );
  });
  timeOffset = Tools.option(timeOffset, 'number', config('site.timeOffset'), {
    test: function test(o) {
      return o >= -720 && o <= 840;
    } //TODO: magic numbers
  });
  bans = (0, _underscore2.default)(bans).reduce(function (acc, value, name) {
    var expiresAt = fields['banExpires_' + value];
    if (expiresAt) {
      var hours = Math.floor(timeOffset / 60);
      var minutes = Math.abs(timeOffset) % 60;
      var tz = (timeOffset > 0 ? '+' : '') + (Math.abs(hours) < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes; //TODO: use pad function
      expiresAt = +moment(expiresAt + ' ' + tz, 'YYYY/MM/DD HH:mm ZZ'); //TODO: magic numbers
      if (expiresAt < _underscore2.default.now() + Tools.Second) {
        expiresAt = null;
      }
    } else {
      expiresAt = null;
    }
    acc[boardName] = {
      boardName: value,
      expiresAt: expiresAt,
      level: fields['banLevel_' + value],
      reason: fields['banReason_' + value],
      postNumber: Tools.option(fields['banPostNumber_' + value], 'number', null, { test: Tools.testPostNumber })
    };
    return acc;
  }, {});
}

router.post('/action/banUser', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _this = this;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            return _context2.delegateYield(regeneratorRuntime.mark(function _callee() {
              var _ref, fields, userIp, bans, banLevels, oldBans, date, modifiedBanBoards, newBans, levels;

              return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      if (req.isModer()) {
                        _context.next = 2;
                        break;
                      }

                      throw new Error(Tools.translate('Not enough rights'));

                    case 2:
                      _context.next = 4;
                      return Tools.parseForm(req);

                    case 4:
                      _ref = _context.sent;
                      fields = _ref.fields;
                      userIp = fields.userIp;

                      userIp = Tools.correctAddress(userIp);

                      if (ip) {
                        _context.next = 10;
                        break;
                      }

                      throw new Error(Tools.translate('Invalid IP address'));

                    case 10:
                      if (!(userIp === req.ip)) {
                        _context.next = 12;
                        break;
                      }

                      throw new Error(Tools.translate('Not enough rights'));

                    case 12:
                      bans = getBans(fields);
                      banLevels = Tools.BAN_LEVELS.slice(1);

                      bans.each(function (ban) {
                        if (!_board2.default.board(ban.boardName)) {
                          throw new Error(Tools.translate('Invalid board: $[1]', '', ban.boardName));
                        }
                        if (banLevels.indexOf(ban.level) < 0) {
                          throw new Error(Tools.translate('Invalid ban level: $[1]', '', ban.level));
                        }
                      });
                      _context.next = 17;
                      return UsersModel.getBannedUserBans(userIp);

                    case 17:
                      oldBans = _context.sent;
                      date = Tools.now();
                      modifiedBanBoards = new Set();
                      newBans = _board2.default.boardNames().reduce(function (acc, boardName) {
                        if (req.isModer(boardName)) {
                          if (bans.hasOwnProperty(boardName)) {
                            var ban = bans[boardName];
                            ban.createdAt = date;
                            acc[boardName] = ban;
                            modifiedBanBoards.add(boardName);
                          } else if (oldBans.hasOwnProperty(boardName)) {
                            modifiedBanBoards.add(boardName);
                          }
                        } else if (oldBans.hasOwnProperty(boardName)) {
                          acc[boardName] = oldBans[boardName];
                        }
                        return acc;
                      }, {});
                      levels = UsersModel.getRegisteredUserLevelsByIp(userIp);

                      modifiedBanBoards.forEach(function (boardName) {
                        var level = req.level(boardName);
                        if (!req.isSuperuser(boardName) && Tools.compareRegisteredUserLevels(level, levels[boardName]) <= 0) {
                          throw new Error(Tools.translate('Not enough rights'));
                        }
                      });
                      _context.next = 25;
                      return UsersModel.banUser(userIp, newBans);

                    case 25:
                      res.send({});

                    case 26:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _callee, _this);
            })(), 't0', 2);

          case 2:
            _context2.next = 7;
            break;

          case 4:
            _context2.prev = 4;
            _context2.t1 = _context2['catch'](0);

            next(_context2.t1);

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 4]]);
  }));

  return function (_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}());

router.post("/action/delall", function (req, res, next) {
  if (!req.isModer()) return next(Tools.translate("Not enough rights"));
  var c = {};
  Tools.parseForm(req).then(function (result) {
    c.fields = result.fields;
    c.boardNames = Tools.toArray(Tools.filterIn(c.fields, function (boardName, key) {
      return (/^board_\S+$/.test(key)
      );
    }));
    if (c.boardNames.length < 1) return Promise.reject(Tools.translate("No board specified"));
    return UsersModel.checkUserBan(req.ip, c.boardNames, { write: true });
  }).then(function () {
    return Database.delall(req, c.fields.userIp, c.boardNames);
  }).then(function (result) {
    res.send({});
  }).catch(function (err) {
    next(err);
  });
});

router.post('/action/moveThread', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var _ref2, fields, _boardName, threadNumber, targetBoardName, password, geolocationInfo, result;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return Tools.parseForm(req);

          case 3:
            _ref2 = _context3.sent;
            fields = _ref2.fields;
            _boardName = fields.boardName;
            threadNumber = fields.threadNumber;
            targetBoardName = fields.targetBoardName;
            password = fields.password;

            if (!(!_board2.default.board(_boardName) || !_board2.default.board(targetBoardName))) {
              _context3.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            if (!(sourceBoardName == targetBoardName)) {
              _context3.next = 13;
              break;
            }

            throw new Error(Tools.translate('Source and target boards are the same'));

          case 13:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context3.next = 16;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 16:
            if (!(!req.isModer(_boardName) || !req.isModer(targetBoardName))) {
              _context3.next = 18;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 18:
            _context3.next = 20;
            return (0, _geolocation2.default)(req.ip);

          case 20:
            geolocationInfo = _context3.sent;
            _context3.next = 23;
            return UsersModel.checkUserBan(req.ip, [_boardName, targetBoardName], {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 23:
            _context3.next = 25;
            return UsersModel.checkUserPermissions(req, _boardName, threadNumber, 'moveThread', Tools.sha1(password));

          case 25:
            _context3.next = 27;
            return ThreadsModel.moveThread(_boardName, threadNumber, targetBoardName);

          case 27:
            result = _context3.sent;

            res.send(result);
            _context3.next = 34;
            break;

          case 31:
            _context3.prev = 31;
            _context3.t0 = _context3['catch'](0);

            next(_context3.t0);

          case 34:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 31]]);
  }));

  return function (_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}());

router.post("/action/setThreadFixed", function (req, res, next) {
  var c = {};
  Tools.parseForm(req).then(function (result) {
    c.fields = result.fields;
    c.boardName = result.fields.boardName;
    c.threadNumber = +result.fields.threadNumber;
    return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
  }).then(function () {
    return Database.setThreadFixed(req, c.fields);
  }).then(function (result) {
    res.send(result);
  }).catch(function (err) {
    next(err);
  });
});

router.post("/action/setThreadClosed", function (req, res, next) {
  var c = {};
  Tools.parseForm(req).then(function (result) {
    c.fields = result.fields;
    c.boardName = result.fields.boardName;
    c.threadNumber = +result.fields.threadNumber;
    return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
  }).then(function () {
    return Database.setThreadClosed(req, c.fields);
  }).then(function (result) {
    res.send(result);
  }).catch(function (err) {
    next(err);
  });
});

router.post("/action/setThreadUnbumpable", function (req, res, next) {
  var c = {};
  Tools.parseForm(req).then(function (result) {
    c.fields = result.fields;
    c.boardName = result.fields.boardName;
    c.threadNumber = +result.fields.threadNumber;
    return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
  }).then(function () {
    return Database.setThreadUnbumpable(req, c.fields);
  }).then(function (result) {
    res.send(result);
  }).catch(function (err) {
    next(err);
  });
});

module.exports = router;
//# sourceMappingURL=action-moder.js.map
