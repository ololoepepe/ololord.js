'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _geolocation = require('../core/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _threads = require('../models/threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

var MIN_TIME_OFFSET = -720;
var MAX_TIME_OFFSET = 840;
var BAN_EXPIRES_FORMAT = 'YYYY/MM/DD HH:mm ZZ';

function getBans(fields) {
  var timeOffset = fields.timeOffset;

  var bans = (0, _underscore2.default)(fields).pick(function (value, name) {
    return (/^banBoard_\S+$/.test(name) && 'NONE' !== fields['banLevel_' + value]
    );
  });
  timeOffset = Tools.option(timeOffset, 'number', (0, _config2.default)('site.timeOffset'), {
    test: function test(o) {
      return o >= MIN_TIME_OFFSET && o <= MAX_TIME_OFFSET;
    }
  });
  bans = (0, _underscore2.default)(bans).reduce(function (acc, value, name) {
    var expiresAt = fields['banExpires_' + value];
    if (expiresAt) {
      var hours = Math.floor(Math.abs(timeOffset) / 60);
      var minutes = Math.abs(timeOffset) % 60;
      var tz = (timeOffset > 0 ? '+' : '') + Tools.pad(hours, 2, '0') + ':' + Tools.pad(minutes, 2, '0');
      expiresAt = +(0, _moment2.default)(expiresAt + ' ' + tz, BAN_EXPIRES_FORMAT);
      if (expiresAt < _underscore2.default.now() + Tools.SECOND) {
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
                      return Files.parseForm(req);

                    case 4:
                      _ref = _context.sent;
                      fields = _ref.fields;
                      userIp = fields.userIp;

                      userIp = Tools.correctAddress(userIp);

                      if (userIp) {
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
                      res.json({});

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

router.post('/action/delall', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var _ref2, fields, userIp, boardNames, geolocationInfo;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;

            if (req.isModer()) {
              _context3.next = 3;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 3:
            _context3.next = 5;
            return Files.parseForm(req);

          case 5:
            _ref2 = _context3.sent;
            fields = _ref2.fields;
            userIp = fields.userIp;

            userIp = Tools.correctAddress(userIp);

            if (userIp) {
              _context3.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid IP address'));

          case 11:
            if (!(userIp === req.ip)) {
              _context3.next = 13;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 13:
            boardNames = (0, _underscore2.default)(fields).filter(function (boardName, key) {
              return (/^board_\S+$/.test(key)
              );
            });

            if (!(boardNames.length <= 0)) {
              _context3.next = 16;
              break;
            }

            throw new Error(Tools.translate('No board specified'));

          case 16:
            boardNames.forEach(function (boardName) {
              if (!_board2.default.board(boardName)) {
                throw new Error(Tools.translate('Invalid board'));
              }
              if (!req.isModer(boardName)) {
                throw new Error(Tools.translate('Not enough rights'));
              }
            });
            _context3.next = 19;
            return (0, _geolocation2.default)(req.ip);

          case 19:
            geolocationInfo = _context3.sent;
            _context3.next = 22;
            return UsersModel.checkUserBan(req.ip, boardNames, {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 22:
            _context3.next = 24;
            return BoardsModel.delall(req, userIp, boardNames);

          case 24:
            res.json({});
            _context3.next = 30;
            break;

          case 27:
            _context3.prev = 27;
            _context3.t0 = _context3['catch'](0);

            next(_context3.t0);

          case 30:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 27]]);
  }));

  return function (_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/moveThread', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var _ref3, fields, _boardName, threadNumber, targetBoardName, password, geolocationInfo, result;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;
            _context4.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref3 = _context4.sent;
            fields = _ref3.fields;
            _boardName = fields.boardName;
            threadNumber = fields.threadNumber;
            targetBoardName = fields.targetBoardName;
            password = fields.password;

            if (!(!_board2.default.board(_boardName) || !_board2.default.board(targetBoardName))) {
              _context4.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            if (!(sourceBoardName == targetBoardName)) {
              _context4.next = 13;
              break;
            }

            throw new Error(Tools.translate('Source and target boards are the same'));

          case 13:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context4.next = 16;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 16:
            if (!(!req.isModer(_boardName) || !req.isModer(targetBoardName))) {
              _context4.next = 18;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 18:
            _context4.next = 20;
            return (0, _geolocation2.default)(req.ip);

          case 20:
            geolocationInfo = _context4.sent;
            _context4.next = 23;
            return UsersModel.checkUserBan(req.ip, [_boardName, targetBoardName], {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 23:
            _context4.next = 25;
            return UsersModel.checkUserPermissions(req, _boardName, threadNumber, 'moveThread', Tools.sha1(password));

          case 25:
            _context4.next = 27;
            return ThreadsModel.moveThread(_boardName, threadNumber, targetBoardName);

          case 27:
            result = _context4.sent;

            res.json(result);
            _context4.next = 34;
            break;

          case 31:
            _context4.prev = 31;
            _context4.t0 = _context4['catch'](0);

            next(_context4.t0);

          case 34:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 31]]);
  }));

  return function (_x7, _x8, _x9) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/setThreadFixed', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(req, res, next) {
    var _ref4, fields, _boardName2, threadNumber, fixed, password, geolocationInfo;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref4 = _context5.sent;
            fields = _ref4.fields;
            _boardName2 = fields.boardName;
            threadNumber = fields.threadNumber;
            fixed = fields.fixed;
            password = fields.password;

            if (_board2.default.board(_boardName2)) {
              _context5.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context5.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 14:
            if (req.isModer(_boardName2)) {
              _context5.next = 16;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 16:
            _context5.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            geolocationInfo = _context5.sent;
            _context5.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName2, {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 21:
            _context5.next = 23;
            return UsersModel.checkUserPermissions(req, _boardName2, threadNumber, 'setThreadFixed', Tools.sha1(password));

          case 23:
            _context5.next = 25;
            return ThreadsModel.setThreadFixed(_boardName2, threadNumber, 'true' === fixed);

          case 25:
            res.json({});
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

  return function (_x10, _x11, _x12) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/setThreadClosed', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, res, next) {
    var _ref5, fields, _boardName3, threadNumber, closed, password, geolocationInfo;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.prev = 0;
            _context6.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref5 = _context6.sent;
            fields = _ref5.fields;
            _boardName3 = fields.boardName;
            threadNumber = fields.threadNumber;
            closed = fields.closed;
            password = fields.password;

            if (_board2.default.board(_boardName3)) {
              _context6.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context6.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 14:
            if (req.isModer(_boardName3)) {
              _context6.next = 16;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 16:
            _context6.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            geolocationInfo = _context6.sent;
            _context6.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName3, {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 21:
            _context6.next = 23;
            return UsersModel.checkUserPermissions(req, _boardName3, threadNumber, 'setThreadClosed', Tools.sha1(password));

          case 23:
            _context6.next = 25;
            return ThreadsModel.setThreadClosed(_boardName3, threadNumber, 'true' === closed);

          case 25:
            res.json({});
            _context6.next = 31;
            break;

          case 28:
            _context6.prev = 28;
            _context6.t0 = _context6['catch'](0);

            next(_context6.t0);

          case 31:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[0, 28]]);
  }));

  return function (_x13, _x14, _x15) {
    return ref.apply(this, arguments);
  };
}());

router.post('/action/setThreadUnbumpable', function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, res, next) {
    var _ref6, fields, _boardName4, threadNumber, unbumpable, password, geolocationInfo;

    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.prev = 0;
            _context7.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref6 = _context7.sent;
            fields = _ref6.fields;
            _boardName4 = fields.boardName;
            threadNumber = fields.threadNumber;
            unbumpable = fields.unbumpable;
            password = fields.password;

            if (_board2.default.board(_boardName4)) {
              _context7.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context7.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 14:
            if (req.isModer(_boardName4)) {
              _context7.next = 16;
              break;
            }

            throw new Error(Tools.translate('Not enough rights'));

          case 16:
            _context7.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            geolocationInfo = _context7.sent;
            _context7.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName4, {
              write: true,
              geolocationInfo: geolocationInfo
            });

          case 21:
            _context7.next = 23;
            return UsersModel.checkUserPermissions(req, _boardName4, threadNumber, 'setThreadUnbumpable', Tools.sha1(password));

          case 23:
            _context7.next = 25;
            return ThreadsModel.setThreadUnbumpable(_boardName4, threadNumber, 'true' === unbumpable);

          case 25:
            res.json({});
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

  return function (_x16, _x17, _x18) {
    return ref.apply(this, arguments);
  };
}());

exports.default = router;
//# sourceMappingURL=action-moder.js.map
