'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkUserPermissions = exports.checkUserBan = exports.removeUserPostNumber = exports.addUserPostNumber = exports.getUserPostNumbers = exports.getSynchronizationData = exports.unregisterUser = exports.updateRegisteredUser = exports.registerUser = exports.getRegisteredUsers = exports.getRegisteredUser = exports.getRegisteredUserLevelsByIp = exports.getRegisteredUserLevels = exports.getRegisteredUserLevelByIp = exports.getRegisteredUserLevel = exports.getBannedUsers = exports.getBannedUserBans = exports.getUserIP = exports.useCaptcha = exports.setUserCaptchaQuota = exports.getUserCaptchaQuota = undefined;

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

          case 12:
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

var processRegisteredUserData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(levels, ips) {
    var invalidLevel;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            if (Tools.hasOwnProperties(levels)) {
              _context18.next = 2;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Access level is not specified for any board'))));

          case 2:
            if (!Object.keys(levels).some(function (boardName) {
              return !_board2.default.board(boardName);
            })) {
              _context18.next = 4;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 4:
            invalidLevel = (0, _underscore2.default)(levels).some(function (level) {
              return Tools.compareRegisteredUserLevels(level, 'USER') < 0 || Tools.compareRegisteredUserLevels(level, 'SUPERUSER') >= 0;
            });

            if (!invalidLevel) {
              _context18.next = 7;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid access level'))));

          case 7:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context18.next = 11;
              break;
            }

            ips = ips.map(function (ip) {
              return Tools.correctAddress(ip);
            });

            if (!ips.some(function (ip) {
              return !ip;
            })) {
              _context18.next = 11;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid IP address'))));

          case 11:
            return _context18.abrupt('return', ips);

          case 12:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function processRegisteredUserData(_x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var registerUser = exports.registerUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(hashpass, levels, ips) {
    var existingUserLevel, existingSuperuserHash;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            _context20.next = 2;
            return processRegisteredUserData(levels, ips);

          case 2:
            ips = _context20.sent;
            _context20.next = 5;
            return RegisteredUserLevels.exists(hashpass);

          case 5:
            existingUserLevel = _context20.sent;

            if (!existingUserLevel) {
              _context20.next = 8;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered'))));

          case 8:
            _context20.next = 10;
            return SuperuserHashes.contains(hashpass);

          case 10:
            existingSuperuserHash = _context20.sent;

            if (!existingSuperuserHash) {
              _context20.next = 13;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('A user with this hashpass is already registered as superuser'))));

          case 13:
            _context20.next = 15;
            return RegisteredUserLevels.setSome(levels, hashpass);

          case 15:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context20.next = 18;
              break;
            }

            _context20.next = 18;
            return Tools.series(ips, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(ip) {
                return regeneratorRuntime.wrap(function _callee19$(_context19) {
                  while (1) {
                    switch (_context19.prev = _context19.next) {
                      case 0:
                        _context19.next = 2;
                        return RegisteredUserHashes.setOne(ip, hashpass);

                      case 2:
                        _context19.next = 4;
                        return RegisteredUserIPs.addOne(ip, hashpass);

                      case 4:
                      case 'end':
                        return _context19.stop();
                    }
                  }
                }, _callee19, this);
              }));

              return function (_x30) {
                return ref.apply(this, arguments);
              };
            }());

          case 18:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function registerUser(_x27, _x28, _x29) {
    return ref.apply(this, arguments);
  };
}();

var updateRegisteredUser = exports.updateRegisteredUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(hashpass, levels, ips) {
    var existingUserLevel, existingIPs;
    return regeneratorRuntime.wrap(function _callee22$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            _context22.next = 2;
            return processRegisteredUserData(levels, ips);

          case 2:
            ips = _context22.sent;
            _context22.next = 5;
            return RegisteredUserLevels.exists(hashpass);

          case 5:
            existingUserLevel = _context22.sent;

            if (existingUserLevel) {
              _context22.next = 8;
              break;
            }

            return _context22.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 8:
            _context22.next = 10;
            return RegisteredUserLevels.setSome(levels, hashpass);

          case 10:
            _context22.next = 12;
            return RegisteredUserIPs.getAll(hashpass);

          case 12:
            existingIPs = _context22.sent;

            if (!(existingIPs && existingIPs.length > 0)) {
              _context22.next = 16;
              break;
            }

            _context22.next = 16;
            return RegisteredUserHashes.deleteSome(ips);

          case 16:
            _context22.next = 18;
            return RegisteredUserIPs.delete(hashpass);

          case 18:
            if (!(0, _underscore2.default)(ips).isArray()) {
              _context22.next = 21;
              break;
            }

            _context22.next = 21;
            return Tools.series(ips, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(ip) {
                return regeneratorRuntime.wrap(function _callee21$(_context21) {
                  while (1) {
                    switch (_context21.prev = _context21.next) {
                      case 0:
                        _context21.next = 2;
                        return RegisteredUserHashes.setOne(ip, hashpass);

                      case 2:
                        _context21.next = 4;
                        return RegisteredUserIPs.addOne(ip, hashpass);

                      case 4:
                      case 'end':
                        return _context21.stop();
                    }
                  }
                }, _callee21, this);
              }));

              return function (_x34) {
                return ref.apply(this, arguments);
              };
            }());

          case 21:
          case 'end':
            return _context22.stop();
        }
      }
    }, _callee22, this);
  }));

  return function updateRegisteredUser(_x31, _x32, _x33) {
    return ref.apply(this, arguments);
  };
}();

var unregisterUser = exports.unregisterUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(hashpass) {
    var count, ips;
    return regeneratorRuntime.wrap(function _callee23$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            _context23.next = 2;
            return RegisteredUserLevels.delete(hashpass);

          case 2:
            count = _context23.sent;

            if (!(count <= 0)) {
              _context23.next = 5;
              break;
            }

            return _context23.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 5:
            _context23.next = 7;
            return RegisteredUserIPs.getAll(hashpass);

          case 7:
            ips = _context23.sent;

            if (!(ips && ips.length > 0)) {
              _context23.next = 11;
              break;
            }

            _context23.next = 11;
            return RegisteredUserHashes.deleteSome(ips);

          case 11:
            _context23.next = 13;
            return RegisteredUserIPs.delete(hashpass);

          case 13:
          case 'end':
            return _context23.stop();
        }
      }
    }, _callee23, this);
  }));

  return function unregisterUser(_x35) {
    return ref.apply(this, arguments);
  };
}();

var getSynchronizationData = exports.getSynchronizationData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(key) {
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            _context24.next = 2;
            return SynchronizationData.get(key);

          case 2:
            return _context24.abrupt('return', _context24.sent);

          case 3:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function getSynchronizationData(_x36) {
    return ref.apply(this, arguments);
  };
}();

var getUserPostNumbers = exports.getUserPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(ip, boardName) {
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            ip = Tools.correctAddress(ip) || '*';
            boardName = boardName || '*';
            _context25.next = 4;
            return UserPostNumbers.find(ip + ':' + boardName);

          case 4:
            return _context25.abrupt('return', _context25.sent);

          case 5:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this);
  }));

  return function getUserPostNumbers(_x37, _x38) {
    return ref.apply(this, arguments);
  };
}();

var addUserPostNumber = exports.addUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context26.next = 3;
            return UserPostNumbers.addOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function addUserPostNumber(_x39, _x40, _x41) {
    return ref.apply(this, arguments);
  };
}();

var removeUserPostNumber = exports.removeUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context27.next = 3;
            return UserPostNumbers.deleteOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function removeUserPostNumber(_x42, _x43, _x44) {
    return ref.apply(this, arguments);
  };
}();

var checkUserBan = exports.checkUserBan = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee28(ip, boardNames) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var write = _ref.write;
    var ban, bans;
    return regeneratorRuntime.wrap(function _callee28$(_context28) {
      while (1) {
        switch (_context28.prev = _context28.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            ban = ipBans[ip];

            if (!(ban && (write || 'NO_ACCESS' === ban.level))) {
              _context28.next = 4;
              break;
            }

            return _context28.abrupt('return', Promise.reject({ ban: ban }));

          case 4:
            _context28.next = 6;
            return getBannedUserBans(ip, boardNames);

          case 6:
            bans = _context28.sent;

            ban = (0, _underscore2.default)(bans).find(function (ban) {
              return ban && (write || 'NO_ACCESS' === ban.level);
            });

            if (!ban) {
              _context28.next = 10;
              break;
            }

            return _context28.abrupt('return', Promise.reject({ ban: ban }));

          case 10:
          case 'end':
            return _context28.stop();
        }
      }
    }, _callee28, this);
  }));

  return function checkUserBan(_x45, _x46, _x47) {
    return ref.apply(this, arguments);
  };
}();

var checkUserPermissions = exports.checkUserPermissions = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee29(req, boardName, postNumber, permission, password) {
    var board, _ref2, user, threadNumber, thread;

    return regeneratorRuntime.wrap(function _callee29$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context29.next = 3;
              break;
            }

            return _context29.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context29.next = 5;
            return PostsModel.getPost(boardName, postNumber);

          case 5:
            _ref2 = _context29.sent;
            user = _ref2.user;
            threadNumber = _ref2.threadNumber;

            if (!req.isSuperuser()) {
              _context29.next = 10;
              break;
            }

            return _context29.abrupt('return');

          case 10:
            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), Permissions[permission]()) > 0)) {
              _context29.next = 17;
              break;
            }

            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), 'USER') > 0 && Tools.compareRegisteredUserLevels(req.level(boardName), user.level) > 0)) {
              _context29.next = 13;
              break;
            }

            return _context29.abrupt('return');

          case 13:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context29.next = 15;
              break;
            }

            return _context29.abrupt('return');

          case 15:
            if (!(password && password === user.password)) {
              _context29.next = 17;
              break;
            }

            return _context29.abrupt('return');

          case 17:
            if (board.opModeration) {
              _context29.next = 19;
              break;
            }

            return _context29.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 19:
            _context29.next = 21;
            return Threads.getOne(threadNumber, boardName);

          case 21:
            thread = _context29.sent;

            if (!(thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass))) {
              _context29.next = 24;
              break;
            }

            return _context29.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 24:
            if (!(Tools.compareRegisteredUserLevels(req.level(boardName), user.level) >= 0)) {
              _context29.next = 26;
              break;
            }

            return _context29.abrupt('return');

          case 26:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context29.next = 28;
              break;
            }

            return _context29.abrupt('return');

          case 28:
            if (!(password && password === user.password)) {
              _context29.next = 30;
              break;
            }

            return _context29.abrupt('return');

          case 30:
            return _context29.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 31:
          case 'end':
            return _context29.stop();
        }
      }
    }, _callee29, this);
  }));

  return function checkUserPermissions(_x49, _x50, _x51, _x52, _x53) {
    return ref.apply(this, arguments);
  };
}();

exports.checkGeoBan = checkGeoBan;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _permissions = require('../helpers/permissions');

var Permissions = _interopRequireWildcard(_permissions);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var BannedUserIPs = new _unorderedSet2.default((0, _clientFactory2.default)(), 'bannedUserIps', {
  parse: false,
  stringify: false
});
var RegisteredUserHashes = new _hash2.default((0, _clientFactory2.default)(), 'registeredUserHashes', {
  parse: false,
  stringify: false
});
var RegisteredUserIPs = new _unorderedSet2.default((0, _clientFactory2.default)(), 'registeredUserIps', {
  parse: false,
  stringify: false
});
var RegisteredUserLevels = new _hash2.default((0, _clientFactory2.default)(), 'registeredUserLevels', {
  parse: false,
  stringify: false
});
var SuperuserHashes = new _unorderedSet2.default((0, _clientFactory2.default)(), 'superuserHashes', {
  parse: false,
  stringify: false
});
var SynchronizationData = new _key2.default((0, _clientFactory2.default)(), 'synchronizationData');
var Threads = new _hash2.default((0, _clientFactory2.default)(), 'threads');
var UserBans = new _key2.default((0, _clientFactory2.default)(), 'userBans');
var UserCaptchaQuotas = new _hash2.default((0, _clientFactory2.default)(), 'captchaQuotas', {
  parse: function parse(quota) {
    return +quota;
  },
  stringify: function stringify(quota) {
    return quota.toString();
  }
});
var UserPostNumbers = new _unorderedSet2.default((0, _clientFactory2.default)(), 'userPostNumbers', {
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

var ipBans = Tools.createWatchedResource(__dirname + '/../misc/user-bans.json', function (path) {
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
    acc.set(key.toUpperCase(), !!value);
    return acc;
  }, new Map());
}

var geoBans = Tools.createWatchedResource(__dirname + '/../misc/geo-bans.json', function (path) {
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
}()) || {};

function checkGeoBan(geolocationInfo) {
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
  if (def) {
    var banned = !user && typeof user === 'boolean';
  } else {
    var banned = user;
  }
  if (banned) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled for this country')));
  }
}
//# sourceMappingURL=users.js.map
