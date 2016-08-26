'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initializeUserBansMonitoring = exports.banUser = exports.updatePostBanInfo = exports.checkUserPermissions = exports.checkUserBan = exports.removeUserPostNumber = exports.addUserPostNumber = exports.getUserPostNumbers = exports.setSynchronizationData = exports.getSynchronizationData = exports.removeSuperuser = exports.addSuperuser = exports.unregisterUser = exports.updateRegisteredUser = exports.registerUser = exports.getRegisteredUsers = exports.getRegisteredUser = exports.getRegisteredUserLevelsByIp = exports.getRegisteredUserLevels = exports.getRegisteredUserLevelByIp = exports.getRegisteredUserLevel = exports.getBannedUsers = exports.getBannedUserBans = exports.getUserIP = exports.useCaptcha = exports.setUserCaptchaQuota = exports.getUserCaptchaQuota = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var getUserCaptchaQuota = exports.getUserCaptchaQuota = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, userIp) {
    var board, quota;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context3.next = 3;
              break;
            }

            return _context3.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context3.next = 5;
            return UserCaptchaQuotas.getOne(boardName + ':' + userIp);

          case 5:
            quota = _context3.sent;
            return _context3.abrupt('return', Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } }));

          case 7:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getUserCaptchaQuota(_x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var setUserCaptchaQuota = exports.setUserCaptchaQuota = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, userIp, quota) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            quota = Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } });
            _context4.next = 3;
            return UserCaptchaQuotas.setOne(boardName + ':' + userIp, quota);

          case 3:
            return _context4.abrupt('return', _context4.sent);

          case 4:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function setUserCaptchaQuota(_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var useCaptcha = exports.useCaptcha = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, userIp) {
    var board, key, quota;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            if (!(board.captchaQuota < 1)) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return', 0);

          case 5:
            key = boardName + ':' + userIp;
            _context5.next = 8;
            return UserCaptchaQuotas.incrementBy(key, -1);

          case 8:
            quota = _context5.sent;

            if (!(+quota < 0)) {
              _context5.next = 13;
              break;
            }

            _context5.next = 12;
            return UserCaptchaQuotas.setOne(key, 0);

          case 12:
            return _context5.abrupt('return', _context5.sent);

          case 13:
            return _context5.abrupt('return', Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } }));

          case 14:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function useCaptcha(_x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

var getUserIP = exports.getUserIP = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, postNumber) {
    var post;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return PostsModel.getPost(boardName, postNumber);

          case 2:
            post = _context6.sent;

            if (post) {
              _context6.next = 5;
              break;
            }

            return _context6.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 5:
            return _context6.abrupt('return', post.user.ip);

          case 6:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function getUserIP(_x10, _x11) {
    return ref.apply(this, arguments);
  };
}();

var getBannedUserBans = exports.getBannedUserBans = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(ip, boardNames) {
    var bans;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            if (!boardNames) {
              boardNames = _board2.default.boardNames();
            } else if (!(0, _underscore2.default)(boardNames).isArray()) {
              boardNames = [boardNames];
            }
            _context8.next = 4;
            return Tools.series(boardNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(boardName) {
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        _context7.next = 2;
                        return UserBans.get(ip + ':' + boardName);

                      case 2:
                        return _context7.abrupt('return', _context7.sent);

                      case 3:
                      case 'end':
                        return _context7.stop();
                    }
                  }
                }, _callee7, this);
              }));

              return function (_x14) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 4:
            bans = _context8.sent;
            return _context8.abrupt('return', (0, _underscore2.default)(bans).pick(function (ban) {
              return !!ban;
            }));

          case 6:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function getBannedUserBans(_x12, _x13) {
    return ref.apply(this, arguments);
  };
}();

var getBannedUsers = exports.getBannedUsers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardNames) {
    var ips;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.next = 2;
            return BannedUserIPs.getAll();

          case 2:
            ips = _context10.sent;
            _context10.next = 5;
            return Tools.series(ips, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(ip) {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return getBannedUserBans(ip, boardNames);

                      case 2:
                        return _context9.abrupt('return', _context9.sent);

                      case 3:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x16) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 5:
            return _context10.abrupt('return', _context10.sent);

          case 6:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function getBannedUsers(_x15) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUserLevel = exports.getRegisteredUserLevel = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(hashpass, boardName) {
    var exists, level;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            if (!(!hashpass || !Tools.mayBeHashpass(hashpass))) {
              _context11.next = 2;
              break;
            }

            return _context11.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid hashpass'))));

          case 2:
            if (_board2.default.board(boardName)) {
              _context11.next = 4;
              break;
            }

            return _context11.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 4:
            _context11.next = 6;
            return SuperuserHashes.contains(hashpass);

          case 6:
            exists = _context11.sent;

            if (!exists) {
              _context11.next = 9;
              break;
            }

            return _context11.abrupt('return', 'SUPERUSER');

          case 9:
            _context11.next = 11;
            return RegisteredUserLevels.getOne(boardName, hashpass);

          case 11:
            level = _context11.sent;
            return _context11.abrupt('return', level || null);

          case 13:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function getRegisteredUserLevel(_x17, _x18) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUserLevelByIp = exports.getRegisteredUserLevelByIp = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(ip, boardName) {
    var hashpass;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            ip = Tools.correctAddress(ip);

            if (ip) {
              _context12.next = 3;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid IP address'))));

          case 3:
            _context12.next = 5;
            return RegisteredUserHashes.getOne(ip);

          case 5:
            hashpass = _context12.sent;

            if (hashpass) {
              _context12.next = 8;
              break;
            }

            return _context12.abrupt('return', null);

          case 8:
            _context12.next = 10;
            return getRegisteredUserLevel(hashpass, boardName);

          case 10:
            return _context12.abrupt('return', _context12.sent);

          case 11:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function getRegisteredUserLevelByIp(_x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUserLevels = exports.getRegisteredUserLevels = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(hashpass) {
    var exists, levels;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!(!hashpass || !Tools.mayBeHashpass(hashpass))) {
              _context13.next = 2;
              break;
            }

            return _context13.abrupt('return', {});

          case 2:
            _context13.next = 4;
            return SuperuserHashes.contains(hashpass);

          case 4:
            exists = _context13.sent;

            if (!exists) {
              _context13.next = 7;
              break;
            }

            return _context13.abrupt('return', _board2.default.boardNames().reduce(function (acc, boardName) {
              acc[boardName] = 'SUPERUSER';
              return acc;
            }, {}));

          case 7:
            _context13.next = 9;
            return RegisteredUserLevels.getAll(hashpass);

          case 9:
            levels = _context13.sent;
            return _context13.abrupt('return', levels || {});

          case 11:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function getRegisteredUserLevels(_x21) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUserLevelsByIp = exports.getRegisteredUserLevelsByIp = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(ip) {
    var hashpass;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            ip = Tools.correctAddress(ip);

            if (ip) {
              _context14.next = 3;
              break;
            }

            return _context14.abrupt('return', {});

          case 3:
            _context14.next = 5;
            return RegisteredUserHashes.getOne(ip);

          case 5:
            hashpass = _context14.sent;

            if (hashpass) {
              _context14.next = 8;
              break;
            }

            return _context14.abrupt('return', {});

          case 8:
            _context14.next = 10;
            return getRegisteredUserLevels(hashpass);

          case 10:
            return _context14.abrupt('return', _context14.sent);

          case 11:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function getRegisteredUserLevelsByIp(_x22) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUser = exports.getRegisteredUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(hashpass) {
    var user, levels, ips;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            user = { hashpass: hashpass };
            _context15.next = 3;
            return RegisteredUserLevels.getAll(hashpass);

          case 3:
            levels = _context15.sent;

            if (!(0, _underscore2.default)(levels).isEmpty()) {
              _context15.next = 6;
              break;
            }

            return _context15.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 6:
            user.levels = levels;
            _context15.next = 9;
            return RegisteredUserIPs.getAll(hashpass);

          case 9:
            ips = _context15.sent;

            user.ips = ips || [];
            return _context15.abrupt('return', user);

          case 12:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function getRegisteredUser(_x23) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUsers = exports.getRegisteredUsers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17() {
    var keys;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return RegisteredUserLevels.find();

          case 2:
            keys = _context17.sent;
            _context17.next = 5;
            return Tools.series(keys.map(function (key) {
              return key.split(':')[1];
            }), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(hashpass) {
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        _context16.next = 2;
                        return getRegisteredUser(hashpass);

                      case 2:
                        return _context16.abrupt('return', _context16.sent);

                      case 3:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x24) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 5:
            return _context17.abrupt('return', _context17.sent);

          case 6:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function getRegisteredUsers() {
    return ref.apply(this, arguments);
  };
}();

var processUserIPs = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(ips) {
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context18.next = 4;
              break;
            }

            ips = ips.map(function (ip) {
              return Tools.correctAddress(ip);
            });

            if (!ips.some(function (ip) {
              return !ip;
            })) {
              _context18.next = 4;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid IP address'))));

          case 4:
            return _context18.abrupt('return', ips);

          case 5:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function processUserIPs(_x25) {
    return ref.apply(this, arguments);
  };
}();

var processRegisteredUserData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(levels, ips) {
    var invalidLevel;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            if (!(0, _underscore2.default)(levels).isEmpty()) {
              _context19.next = 2;
              break;
            }

            return _context19.abrupt('return', Promise.reject(new Error(Tools.translate('Access level is not specified for any board'))));

          case 2:
            if (!Object.keys(levels).some(function (boardName) {
              return !_board2.default.board(boardName);
            })) {
              _context19.next = 4;
              break;
            }

            return _context19.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 4:
            invalidLevel = (0, _underscore2.default)(levels).some(function (level) {
              return Tools.compareRegisteredUserLevels(level, 'USER') < 0 || Tools.compareRegisteredUserLevels(level, 'SUPERUSER') >= 0;
            });

            if (!invalidLevel) {
              _context19.next = 7;
              break;
            }

            return _context19.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid access level'))));

          case 7:
            _context19.next = 9;
            return processUserIPs(ips);

          case 9:
            return _context19.abrupt('return', _context19.sent);

          case 10:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function processRegisteredUserData(_x26, _x27) {
    return ref.apply(this, arguments);
  };
}();

var addUserIPs = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(hashpass, ips) {
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            _context21.next = 2;
            return Tools.series(ips, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(ip) {
                return regeneratorRuntime.wrap(function _callee20$(_context20) {
                  while (1) {
                    switch (_context20.prev = _context20.next) {
                      case 0:
                        _context20.next = 2;
                        return RegisteredUserHashes.setOne(ip, hashpass);

                      case 2:
                        _context20.next = 4;
                        return RegisteredUserIPs.addOne(ip, hashpass);

                      case 4:
                      case 'end':
                        return _context20.stop();
                    }
                  }
                }, _callee20, this);
              }));

              return function (_x30) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function addUserIPs(_x28, _x29) {
    return ref.apply(this, arguments);
  };
}();

var removeUserIPs = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(hashpass) {
    var ips;
    return regeneratorRuntime.wrap(function _callee22$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            _context22.next = 2;
            return RegisteredUserIPs.getAll(hashpass);

          case 2:
            ips = _context22.sent;

            if (!(ips && ips.length > 0)) {
              _context22.next = 6;
              break;
            }

            _context22.next = 6;
            return RegisteredUserHashes.deleteSome(ips);

          case 6:
            _context22.next = 8;
            return RegisteredUserIPs.delete(hashpass);

          case 8:
          case 'end':
            return _context22.stop();
        }
      }
    }, _callee22, this);
  }));

  return function removeUserIPs(_x31) {
    return ref.apply(this, arguments);
  };
}();

var registerUser = exports.registerUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(hashpass, levels, ips) {
    var existingUserLevel, existingSuperuserHash;
    return regeneratorRuntime.wrap(function _callee23$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            _context23.next = 2;
            return processRegisteredUserData(levels, ips);

          case 2:
            ips = _context23.sent;
            _context23.next = 5;
            return RegisteredUserLevels.exists(hashpass);

          case 5:
            existingUserLevel = _context23.sent;

            if (!existingUserLevel) {
              _context23.next = 8;
              break;
            }

            return _context23.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered'))));

          case 8:
            _context23.next = 10;
            return SuperuserHashes.contains(hashpass);

          case 10:
            existingSuperuserHash = _context23.sent;

            if (!existingSuperuserHash) {
              _context23.next = 13;
              break;
            }

            return _context23.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered as superuser'))));

          case 13:
            _context23.next = 15;
            return RegisteredUserLevels.setSome(levels, hashpass);

          case 15:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context23.next = 18;
              break;
            }

            _context23.next = 18;
            return addUserIPs(hashpass, ips);

          case 18:
          case 'end':
            return _context23.stop();
        }
      }
    }, _callee23, this);
  }));

  return function registerUser(_x32, _x33, _x34) {
    return ref.apply(this, arguments);
  };
}();

var updateRegisteredUser = exports.updateRegisteredUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(hashpass, levels, ips) {
    var existingUserLevel;
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            _context24.next = 2;
            return processRegisteredUserData(levels, ips);

          case 2:
            ips = _context24.sent;
            _context24.next = 5;
            return RegisteredUserLevels.exists(hashpass);

          case 5:
            existingUserLevel = _context24.sent;

            if (existingUserLevel) {
              _context24.next = 8;
              break;
            }

            return _context24.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 8:
            _context24.next = 10;
            return RegisteredUserLevels.setSome(levels, hashpass);

          case 10:
            _context24.next = 12;
            return removeUserIPs(hashpass);

          case 12:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context24.next = 15;
              break;
            }

            _context24.next = 15;
            return addUserIPs(hashpass, ips);

          case 15:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function updateRegisteredUser(_x35, _x36, _x37) {
    return ref.apply(this, arguments);
  };
}();

var unregisterUser = exports.unregisterUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(hashpass) {
    var count;
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            _context25.next = 2;
            return RegisteredUserLevels.delete(hashpass);

          case 2:
            count = _context25.sent;

            if (!(count <= 0)) {
              _context25.next = 5;
              break;
            }

            return _context25.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 5:
            _context25.next = 7;
            return removeUserIPs(hashpass);

          case 7:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this);
  }));

  return function unregisterUser(_x38) {
    return ref.apply(this, arguments);
  };
}();

var addSuperuser = exports.addSuperuser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(hashpass, ips) {
    var existingUserLevel, count;
    return regeneratorRuntime.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            if (hashpass) {
              _context26.next = 2;
              break;
            }

            return _context26.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid hashpass'))));

          case 2:
            _context26.next = 4;
            return processUserIPs(ips);

          case 4:
            ips = _context26.sent;
            _context26.next = 7;
            return RegisteredUserLevels.exists(hashpass);

          case 7:
            existingUserLevel = _context26.sent;

            if (!existingUserLevel) {
              _context26.next = 10;
              break;
            }

            return _context26.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered'))));

          case 10:
            _context26.next = 12;
            return SuperuserHashes.addOne(hashpass);

          case 12:
            count = _context26.sent;

            if (!(count <= 0)) {
              _context26.next = 15;
              break;
            }

            return _context26.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered'))));

          case 15:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context26.next = 18;
              break;
            }

            _context26.next = 18;
            return addUserIPs(hashpass, ips);

          case 18:
          case 'end':
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function addSuperuser(_x39, _x40) {
    return ref.apply(this, arguments);
  };
}();

var removeSuperuser = exports.removeSuperuser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(password, notHashpass) {
    var count;
    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            if (hashpass) {
              _context27.next = 2;
              break;
            }

            return _context27.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid hashpass'))));

          case 2:
            _context27.next = 4;
            return SuperuserHashes.deleteOne(hashpass);

          case 4:
            count = _context27.sent;

            if (!(count <= 0)) {
              _context27.next = 7;
              break;
            }

            return _context27.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 7:
            _context27.next = 9;
            return removeUserIPs();

          case 9:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function removeSuperuser(_x41, _x42) {
    return ref.apply(this, arguments);
  };
}();

var getSynchronizationData = exports.getSynchronizationData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee28(key) {
    return regeneratorRuntime.wrap(function _callee28$(_context28) {
      while (1) {
        switch (_context28.prev = _context28.next) {
          case 0:
            _context28.next = 2;
            return SynchronizationData.get(key);

          case 2:
            return _context28.abrupt('return', _context28.sent);

          case 3:
          case 'end':
            return _context28.stop();
        }
      }
    }, _callee28, this);
  }));

  return function getSynchronizationData(_x43) {
    return ref.apply(this, arguments);
  };
}();

var setSynchronizationData = exports.setSynchronizationData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee29(key, data) {
    return regeneratorRuntime.wrap(function _callee29$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            _context29.next = 2;
            return SynchronizationData.set(data, key);

          case 2:
            _context29.next = 4;
            return SynchronizationData.expire((0, _config2.default)('server.synchronizationData.ttl'), key);

          case 4:
          case 'end':
            return _context29.stop();
        }
      }
    }, _callee29, this);
  }));

  return function setSynchronizationData(_x44, _x45) {
    return ref.apply(this, arguments);
  };
}();

var getUserPostNumbers = exports.getUserPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee30(ip, boardName) {
    return regeneratorRuntime.wrap(function _callee30$(_context30) {
      while (1) {
        switch (_context30.prev = _context30.next) {
          case 0:
            ip = Tools.correctAddress(ip) || '*';
            boardName = boardName || '*';
            _context30.next = 4;
            return UserPostNumbers.find(ip + ':' + boardName);

          case 4:
            return _context30.abrupt('return', _context30.sent);

          case 5:
          case 'end':
            return _context30.stop();
        }
      }
    }, _callee30, this);
  }));

  return function getUserPostNumbers(_x46, _x47) {
    return ref.apply(this, arguments);
  };
}();

var addUserPostNumber = exports.addUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee31(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee31$(_context31) {
      while (1) {
        switch (_context31.prev = _context31.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context31.next = 3;
            return UserPostNumbers.addOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context31.stop();
        }
      }
    }, _callee31, this);
  }));

  return function addUserPostNumber(_x48, _x49, _x50) {
    return ref.apply(this, arguments);
  };
}();

var removeUserPostNumber = exports.removeUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee32(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee32$(_context32) {
      while (1) {
        switch (_context32.prev = _context32.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context32.next = 3;
            return UserPostNumbers.deleteOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context32.stop();
        }
      }
    }, _callee32, this);
  }));

  return function removeUserPostNumber(_x51, _x52, _x53) {
    return ref.apply(this, arguments);
  };
}();

var checkUserBan = exports.checkUserBan = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee33(ip, boardNames) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var write = _ref.write;
    var geolocationInfo = _ref.geolocationInfo;
    var ban, bans;
    return regeneratorRuntime.wrap(function _callee33$(_context33) {
      while (1) {
        switch (_context33.prev = _context33.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            ban = ipBans[ip];

            if (!(ban && (write || 'NO_ACCESS' === ban.level))) {
              _context33.next = 4;
              break;
            }

            return _context33.abrupt('return', Promise.reject({ ban: ban }));

          case 4:
            if (!boardNames) {
              _context33.next = 11;
              break;
            }

            _context33.next = 7;
            return getBannedUserBans(ip, boardNames);

          case 7:
            bans = _context33.sent;

            ban = (0, _underscore2.default)(bans).find(function (ban) {
              return ban && (write || 'NO_ACCESS' === ban.level);
            });

            if (!ban) {
              _context33.next = 11;
              break;
            }

            return _context33.abrupt('return', Promise.reject({ ban: ban }));

          case 11:
            if (!geolocationInfo) {
              _context33.next = 13;
              break;
            }

            return _context33.abrupt('return', checkGeoBan(geolocationInfo, ip));

          case 13:
          case 'end':
            return _context33.stop();
        }
      }
    }, _callee33, this);
  }));

  return function checkUserBan(_x54, _x55, _x56) {
    return ref.apply(this, arguments);
  };
}();

var checkUserPermissions = exports.checkUserPermissions = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee34(req, boardName, postNumber, permission, password) {
    var board, post, user, threadNumber, thread;
    return regeneratorRuntime.wrap(function _callee34$(_context34) {
      while (1) {
        switch (_context34.prev = _context34.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context34.next = 3;
              break;
            }

            return _context34.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context34.next = 5;
            return PostsModel.getPost(boardName, postNumber);

          case 5:
            post = _context34.sent;

            if (post) {
              _context34.next = 8;
              break;
            }

            return _context34.abrupt('return', Promise.reject(new Error(Tools.translate('Not such post: $[1]', '', '/' + boardName + '/' + postNumber))));

          case 8:
            user = post.user;
            threadNumber = post.threadNumber;

            if (!req.isSuperuser()) {
              _context34.next = 12;
              break;
            }

            return _context34.abrupt('return');

          case 12:
            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), Permissions[permission]()) > 0)) {
              _context34.next = 19;
              break;
            }

            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), 'USER') > 0 && Tools.compareRegisteredUserLevels(req.level(boardName), user.level) > 0)) {
              _context34.next = 15;
              break;
            }

            return _context34.abrupt('return');

          case 15:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context34.next = 17;
              break;
            }

            return _context34.abrupt('return');

          case 17:
            if (!(password && password === user.password)) {
              _context34.next = 19;
              break;
            }

            return _context34.abrupt('return');

          case 19:
            if (board.opModeration) {
              _context34.next = 21;
              break;
            }

            return _context34.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 21:
            _context34.next = 23;
            return Threads.getOne(threadNumber, boardName);

          case 23:
            thread = _context34.sent;

            if (!(thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass))) {
              _context34.next = 26;
              break;
            }

            return _context34.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 26:
            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), user.level) >= 0)) {
              _context34.next = 28;
              break;
            }

            return _context34.abrupt('return');

          case 28:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context34.next = 30;
              break;
            }

            return _context34.abrupt('return');

          case 30:
            if (!(password && password === user.password)) {
              _context34.next = 32;
              break;
            }

            return _context34.abrupt('return');

          case 32:
            return _context34.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 33:
          case 'end':
            return _context34.stop();
        }
      }
    }, _callee34, this);
  }));

  return function checkUserPermissions(_x58, _x59, _x60, _x61, _x62) {
    return ref.apply(this, arguments);
  };
}();

var updatePostBanInfo = exports.updatePostBanInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee35(boardName, postNumber) {
    var post;
    return regeneratorRuntime.wrap(function _callee35$(_context35) {
      while (1) {
        switch (_context35.prev = _context35.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context35.next = 2;
              break;
            }

            return _context35.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 2:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context35.next = 5;
              break;
            }

            return _context35.abrupt('return');

          case 5:
            _context35.next = 7;
            return PostsModel.getPost(boardName, postNumber);

          case 7:
            post = _context35.sent;

            if (post) {
              _context35.next = 10;
              break;
            }

            return _context35.abrupt('return');

          case 10:
            _context35.next = 12;
            return IPC.render(boardName, post.threadNumber, postNumber, 'edit');

          case 12:
          case 'end':
            return _context35.stop();
        }
      }
    }, _callee35, this);
  }));

  return function updatePostBanInfo(_x63, _x64) {
    return ref.apply(this, arguments);
  };
}();

var banUser = exports.banUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee37(ip, newBans) {
    var oldBans;
    return regeneratorRuntime.wrap(function _callee37$(_context37) {
      while (1) {
        switch (_context37.prev = _context37.next) {
          case 0:
            ip = Tools.correctAddress(ip);

            if (ip) {
              _context37.next = 3;
              break;
            }

            return _context37.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid IP address'))));

          case 3:
            _context37.next = 5;
            return UsersModel.getBannedUserBans(userIp);

          case 5:
            oldBans = _context37.sent;
            _context37.next = 8;
            return Tools.series(_board2.default.boardNames(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee36(boardName) {
                var key, ban;
                return regeneratorRuntime.wrap(function _callee36$(_context36) {
                  while (1) {
                    switch (_context36.prev = _context36.next) {
                      case 0:
                        key = ip + ':' + boardName;
                        ban = newBans[boardName];

                        if (!ban) {
                          _context36.next = 15;
                          break;
                        }

                        _context36.next = 5;
                        return UserBans.set(ban, key);

                      case 5:
                        if (!ban.expiresAt) {
                          _context36.next = 8;
                          break;
                        }

                        _context36.next = 8;
                        return UserBans.expire(Math.ceil((+ban.expiresAt - +Tools.now()) / 1000), key);

                      case 8:
                        if (!ban.postNumber) {
                          _context36.next = 13;
                          break;
                        }

                        _context36.next = 11;
                        return UserBanPostNumbers.setOne(key, ban.postNumber);

                      case 11:
                        _context36.next = 13;
                        return updatePostBanInfo(boardName, ban.postNumber);

                      case 13:
                        _context36.next = 24;
                        break;

                      case 15:
                        ban = oldBans[boardName];

                        if (ban) {
                          _context36.next = 18;
                          break;
                        }

                        return _context36.abrupt('return');

                      case 18:
                        _context36.next = 20;
                        return UserBans.delete(key);

                      case 20:
                        if (!ban.postNumber) {
                          _context36.next = 24;
                          break;
                        }

                        UserBanPostNumbers.deleteOne(ban.postNumber, key);
                        _context36.next = 24;
                        return updatePostBanInfo(boardName, ban.postNumber);

                      case 24:
                      case 'end':
                        return _context36.stop();
                    }
                  }
                }, _callee36, this);
              }));

              return function (_x67) {
                return ref.apply(this, arguments);
              };
            }());

          case 8:
            _context37.next = 10;
            return BannedUserIPs[(0, _underscore2.default)(newBans).isEmpty() ? 'deleteOne' : 'addOne'](ip);

          case 10:
          case 'end':
            return _context37.stop();
        }
      }
    }, _callee37, this);
  }));

  return function banUser(_x65, _x66) {
    return ref.apply(this, arguments);
  };
}();

var updateBanOnMessage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee38(message) {
    var ip, boardName, postNumber, keys;
    return regeneratorRuntime.wrap(function _callee38$(_context38) {
      while (1) {
        switch (_context38.prev = _context38.next) {
          case 0:
            _context38.prev = 0;
            ip = Tools.correctAddress(message.split(':').slice(1, -1).join(':'));

            if (ip) {
              _context38.next = 4;
              break;
            }

            throw new Error(Tools.translate('Invalid IP address'));

          case 4:
            boardName = message.split(':').pop();

            if (_board2.default.board(boardName)) {
              _context38.next = 7;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 7:
            _context38.next = 9;
            return UserBanPostNumbers.getOne(message);

          case 9:
            postNumber = _context38.sent;

            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context38.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 13:
            _context38.next = 15;
            return UserBanPostNumbers.deleteOne(message);

          case 15:
            _context38.next = 17;
            return UserBans.find(ip + ':*');

          case 17:
            keys = _context38.sent;

            if (!(!keys || keys.length <= 0)) {
              _context38.next = 21;
              break;
            }

            _context38.next = 21;
            return BannedUserIPs.deleteOne(ip);

          case 21:
            _context38.next = 23;
            return updatePostBanInfo(boardName, postNumber);

          case 23:
            _context38.next = 28;
            break;

          case 25:
            _context38.prev = 25;
            _context38.t0 = _context38['catch'](0);

            Logger.error(_context38.t0.stack || _context38.t0);

          case 28:
          case 'end':
            return _context38.stop();
        }
      }
    }, _callee38, this, [[0, 25]]);
  }));

  return function updateBanOnMessage(_x68) {
    return ref.apply(this, arguments);
  };
}();

var initializeUserBansMonitoring = exports.initializeUserBansMonitoring = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee39() {
    return regeneratorRuntime.wrap(function _callee39$(_context39) {
      while (1) {
        switch (_context39.prev = _context39.next) {
          case 0:
            _context39.next = 2;
            return (0, _redisClientFactory2.default)().config('SET', 'notify-keyspace-events', 'Ex');

          case 2:
            _context39.next = 4;
            return BanExpiresChannel.subscribe(updateBanOnMessage);

          case 4:
          case 'end':
            return _context39.stop();
        }
      }
    }, _callee39, this);
  }));

  return function initializeUserBansMonitoring() {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _fsWatcher = require('../helpers/fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _permissions = require('../helpers/permissions');

var Permissions = _interopRequireWildcard(_permissions);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _channel = require('../storage/channel');

var _channel2 = _interopRequireDefault(_channel);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var BanExpiredChannel = new _channel2.default((0, _redisClientFactory2.default)('BAN_EXPIRED'), '__keyevent@' + (0, _config2.default)('system.redis.db') + '__:expired', {
  parse: false,
  stringify: false
});
var BannedUserIPs = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'bannedUserIps', {
  parse: false,
  stringify: false
});
var RegisteredUserHashes = new _hash2.default((0, _redisClientFactory2.default)(), 'registeredUserHashes', {
  parse: false,
  stringify: false
});
var RegisteredUserIPs = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'registeredUserIps', {
  parse: false,
  stringify: false
});
var RegisteredUserLevels = new _hash2.default((0, _redisClientFactory2.default)(), 'registeredUserLevels', {
  parse: false,
  stringify: false
});
var SuperuserHashes = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'superuserHashes', {
  parse: false,
  stringify: false
});
var SynchronizationData = new _key2.default((0, _redisClientFactory2.default)(), 'synchronizationData');
var Threads = new _hash2.default((0, _redisClientFactory2.default)(), 'threads');
var UserBanPostNumbers = new _hash2.default((0, _redisClientFactory2.default)(), 'userBanPostNumbers', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});
var UserBans = new _key2.default((0, _redisClientFactory2.default)(), 'userBans');
var UserCaptchaQuotas = new _hash2.default((0, _redisClientFactory2.default)(), 'captchaQuotas', {
  parse: function parse(quota) {
    return +quota;
  },
  stringify: function stringify(quota) {
    return quota.toString();
  }
});
var UserPostNumbers = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'userPostNumbers', {
  parse: function parse(number) {
    return +number;
  },
  stringify: function stringify(number) {
    return number.toString();
  }
});

function transformIPBans(bans) {
  return (0, _underscore2.default)(bans).reduce(function (acc, ban, ip) {
    ip = Tools.correctAddress(ip);
    if (ip) {
      acc[ip] = ban;
    }
    return acc;
  }, {});
}

var ipBans = _fsWatcher2.default.createWatchedResource(__dirname + '/../misc/user-bans.json', function (path) {
  return transformIPBans(require(path));
}, function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
    var data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _fs2.default.read(path);

          case 2:
            data = _context.sent;

            ipBans = transformIPBans(JSON.parse(data));

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x) {
    return ref.apply(this, arguments);
  };
}()) || {};

function transformGeoBans(bans) {
  return (0, _underscore2.default)(bans).reduce(function (acc, value, key) {
    if (typeof value === 'string') {
      value = [value];
    }
    if ((0, _underscore2.default)(value).isArray()) {
      value = new Set(value.map(function (ip) {
        return Tools.correctAddress(ip);
      }).filter(function (ip) {
        return !!ip;
      }));
    } else {
      value = !!value;
    }
    acc.set(key.toUpperCase(), value);
    return acc;
  }, new Map());
}

var geoBans = _fsWatcher2.default.createWatchedResource(__dirname + '/../misc/geo-bans.json', function (path) {
  return transformGeoBans(require(path));
}, function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(path) {
    var data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return _fs2.default.read(path);

          case 2:
            data = _context2.sent;

            geoBans = transformGeoBans(JSON.parse(data));

          case 4:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function (_x2) {
    return ref.apply(this, arguments);
  };
}()) || new Map();

function checkGeoBan(geolocationInfo, ip) {
  var def = geoBans.get('*');
  if (def) {
    geolocationInfo = geolocationInfo || {};
  } else if (!geolocationInfo || !geolocationInfo.countryCode) {
    return;
  }
  var countryCode = geolocationInfo.countryCode;
  if (typeof countryCode !== 'string') {
    countryCode = '';
  }
  var user = geoBans.get(countryCode.toUpperCase());
  if (ip && ((typeof user === 'undefined' ? 'undefined' : _typeof(user)) === 'object' && user.has(ip) || (typeof def === 'undefined' ? 'undefined' : _typeof(def)) === 'object' && def.has(ip))) {
    return;
  }
  if (typeof user === 'boolean' && !user) {
    return;
  }
  if (!user && !def) {
    return;
  }
  return Promise.reject(new Error(Tools.translate('Posting is disabled for this country')));
}
//# sourceMappingURL=users.js.map
