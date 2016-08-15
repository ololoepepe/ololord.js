'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkUserPermissions = exports.checkUserBan = exports.removeUserPostNumber = exports.addUserPostNumber = exports.getUserPostNumbers = exports.getSynchronizationData = exports.getRegisteredUsers = exports.getRegisteredUser = exports.getBannedUsers = exports.getBannedUserBans = exports.getUserIP = exports.useCaptcha = exports.setUserCaptchaQuota = exports.getUserCaptchaQuota = undefined;

var getUserCaptchaQuota = exports.getUserCaptchaQuota = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, userIp) {
    var board, quota;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context2.next = 3;
              break;
            }

            return _context2.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            _context2.next = 5;
            return UserCaptchaQuotas.getOne(boardName + ':' + userIp);

          case 5:
            quota = _context2.sent;
            return _context2.abrupt('return', Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } }));

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getUserCaptchaQuota(_x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var setUserCaptchaQuota = exports.setUserCaptchaQuota = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, userIp, quota) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            quota = Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } });
            _context3.next = 3;
            return UserCaptchaQuotas.setOne(boardName + ':' + userIp, quota);

          case 3:
            return _context3.abrupt('return', _context3.sent);

          case 4:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function setUserCaptchaQuota(_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var useCaptcha = exports.useCaptcha = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, userIp) {
    var board, key, quota;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context4.next = 3;
              break;
            }

            return _context4.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            if (!(board.captchaQuota < 1)) {
              _context4.next = 5;
              break;
            }

            return _context4.abrupt('return', 0);

          case 5:
            key = boardName + ':' + userIp;
            _context4.next = 8;
            return UserCaptchaQuotas.incrementBy(key, -1);

          case 8:
            quota = _context4.sent;

            if (!(+quota < 0)) {
              _context4.next = 13;
              break;
            }

            _context4.next = 12;
            return UserCaptchaQuotas.setOne(key, 0);

          case 12:
            return _context4.abrupt('return', _context4.sent);

          case 13:
            return _context4.abrupt('return', Tools.option(quota, 'number', 0, { test: function test(q) {
                return q >= 0;
              } }));

          case 14:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function useCaptcha(_x7, _x8) {
    return ref.apply(this, arguments);
  };
}();

var getUserIP = exports.getUserIP = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, postNumber) {
    var post;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return PostsModel.getPost(boardName, postNumber);

          case 2:
            post = _context5.sent;

            if (post) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 5:
            return _context5.abrupt('return', post.user.ip);

          case 6:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getUserIP(_x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var getBannedUserBans = exports.getBannedUserBans = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(ip, boardNames) {
    var bans;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            if (!boardNames) {
              boardNames = _board2.default.boardNames();
            } else if (!(0, _underscore2.default)(boardNames).isArray()) {
              boardNames = [boardNames];
            }
            _context7.next = 4;
            return Tools.series(boardNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return UserBans.get(ip + ':' + boardName);

                      case 2:
                        return _context6.abrupt('return', _context6.sent);

                      case 3:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x13) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 4:
            bans = _context7.sent;
            return _context7.abrupt('return', (0, _underscore2.default)(bans).pick(function (ban) {
              return !!ban;
            }));

          case 6:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getBannedUserBans(_x11, _x12) {
    return ref.apply(this, arguments);
  };
}();

var getBannedUsers = exports.getBannedUsers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardNames) {
    var ips;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.next = 2;
            return BannedUserIPs.getAll();

          case 2:
            ips = _context9.sent;
            _context9.next = 5;
            return Tools.series(ips, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(ip) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.next = 2;
                        return getBannedUserBans(ip, boardNames);

                      case 2:
                        return _context8.abrupt('return', _context8.sent);

                      case 3:
                      case 'end':
                        return _context8.stop();
                    }
                  }
                }, _callee8, this);
              }));

              return function (_x15) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 5:
            return _context9.abrupt('return', _context9.sent);

          case 6:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function getBannedUsers(_x14) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUser = exports.getRegisteredUser = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(hashpass) {
    var user, levels, ips;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            user = { hashpass: hashpass };
            _context10.next = 3;
            return RegisteredUserLevels.getAll(hashpass);

          case 3:
            levels = _context10.sent;

            if (!(0, _underscore2.default)(levels).isEmpty()) {
              _context10.next = 6;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('No user with this hashpass'))));

          case 6:
            user.levels = levels;
            _context10.next = 9;
            return RegisteredUserIPs.getAll(hashpass);

          case 9:
            ips = _context10.sent;

            user.ips = ips || [];
            return _context10.abrupt('return', user);

          case 12:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function getRegisteredUser(_x16) {
    return ref.apply(this, arguments);
  };
}();

var getRegisteredUsers = exports.getRegisteredUsers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
    var keys;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.next = 2;
            return RegisteredUserLevels.find();

          case 2:
            keys = _context12.sent;
            _context12.next = 5;
            return Tools.series(keys.map(function (key) {
              return key.split(':')[1];
            }), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(hashpass) {
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.next = 2;
                        return getRegisteredUser(hashpass);

                      case 2:
                        return _context11.abrupt('return', _context11.sent);

                      case 3:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x17) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 5:
            return _context12.abrupt('return', _context12.sent);

          case 6:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function getRegisteredUsers() {
    return ref.apply(this, arguments);
  };
}();

var getSynchronizationData = exports.getSynchronizationData = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(key) {
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return SynchronizationData.get(key);

          case 2:
            return _context13.abrupt('return', _context13.sent);

          case 3:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function getSynchronizationData(_x18) {
    return ref.apply(this, arguments);
  };
}();

var getUserPostNumbers = exports.getUserPostNumbers = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(ip, boardName) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            ip = Tools.correctAddress(ip) || '*';
            boardName = boardName || '*';
            _context14.next = 4;
            return UserPostNumbers.find(ip + ':' + boardName);

          case 4:
            return _context14.abrupt('return', _context14.sent);

          case 5:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function getUserPostNumbers(_x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

var addUserPostNumber = exports.addUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context15.next = 3;
            return UserPostNumbers.addOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function addUserPostNumber(_x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}();

var removeUserPostNumber = exports.removeUserPostNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(ip, boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            _context16.next = 3;
            return UserPostNumbers.deleteOne(postNumber, ip + ':' + boardName);

          case 3:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function removeUserPostNumber(_x24, _x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var checkUserBan = exports.checkUserBan = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(ip, boardNames) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var write = _ref.write;
    var ban, bans;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            ip = Tools.correctAddress(ip);
            ban = ipBans[ip];

            if (!(ban && (write || 'NO_ACCESS' === ban.level))) {
              _context17.next = 4;
              break;
            }

            return _context17.abrupt('return', Promise.reject({ ban: ban }));

          case 4:
            _context17.next = 6;
            return getBannedUserBans(ip, boardNames);

          case 6:
            bans = _context17.sent;

            ban = (0, _underscore2.default)(bans).find(function (ban) {
              return ban && (write || 'NO_ACCESS' === ban.level);
            });

            if (!ban) {
              _context17.next = 10;
              break;
            }

            return _context17.abrupt('return', Promise.reject({ ban: ban }));

          case 10:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function checkUserBan(_x27, _x28, _x29) {
    return ref.apply(this, arguments);
  };
}();

var checkUserPermissions = exports.checkUserPermissions = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(req, board, _ref2, permission, password) {
    var user = _ref2.user;
    var threadNumber = _ref2.threadNumber;
    var thread;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            if (!req.isSuperuser()) {
              _context18.next = 2;
              break;
            }

            return _context18.abrupt('return', true);

          case 2:
            if (typeof board === 'string') {
              board = _board2.default.board(board);
            }

            if (!(Tools.compareRegisteredUserLevels(req.level(board.name), Permissions[permission]()) > 0)) {
              _context18.next = 10;
              break;
            }

            if (!(Tools.compareRegisteredUserLevels(req.level(board.name), user.level) > 0)) {
              _context18.next = 6;
              break;
            }

            return _context18.abrupt('return', true);

          case 6:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context18.next = 8;
              break;
            }

            return _context18.abrupt('return', true);

          case 8:
            if (!(password && password === user.password)) {
              _context18.next = 10;
              break;
            }

            return _context18.abrupt('return', true);

          case 10:
            if (board.opModeration) {
              _context18.next = 12;
              break;
            }

            return _context18.abrupt('return', false);

          case 12:
            _context18.next = 14;
            return Threads.getOne(threadNumber, board.name);

          case 14:
            thread = _context18.sent;

            if (!(thread.user.ip !== req.ip && (!req.hashpass || req.hashpass !== thread.user.hashpass))) {
              _context18.next = 17;
              break;
            }

            return _context18.abrupt('return', false);

          case 17:
            if (!(Tools.compareRegisteredUserLevels(req.level(board.name), user.level) >= 0)) {
              _context18.next = 19;
              break;
            }

            return _context18.abrupt('return', true);

          case 19:
            if (!(req.hashpass && req.hashpass === user.hashpass)) {
              _context18.next = 21;
              break;
            }

            return _context18.abrupt('return', true);

          case 21:
            if (!(password && password === user.password)) {
              _context18.next = 23;
              break;
            }

            return _context18.abrupt('return', true);

          case 23:
            return _context18.abrupt('return', false);

          case 24:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function checkUserPermissions(_x31, _x32, _x33, _x34, _x35) {
    return ref.apply(this, arguments);
  };
}();

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
var RegisteredUserIPs = new _unorderedSet2.default((0, _clientFactory2.default)(), 'registeredUserIps', {
  parse: false,
  stringify: false
});
var RegisteredUserLevels = new _hash2.default((0, _clientFactory2.default)(), 'registeredUserLevels', {
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
//# sourceMappingURL=users.js.map
