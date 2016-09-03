'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteChatMessages = exports.addChatMessage = exports.getChatMessages = undefined;

var getChatMessages = exports.getChatMessages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(user, lastRequestDate) {
    var hash, date, keys, chats;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            lastRequestDate = +new Date(lastRequestDate) || 0;
            hash = createUserHash(user);
            date = Tools.now().toISOString();
            _context2.next = 5;
            return Chats.getAll(hash);

          case 5:
            keys = _context2.sent;
            _context2.next = 8;
            return Tools.series(keys, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(key) {
                var list;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return Chat.getSomeByScore(lastRequestDate, Infinity, key);

                      case 2:
                        list = _context.sent;
                        return _context.abrupt('return', (list || []).map(function (msg) {
                          return {
                            text: msg.text,
                            date: msg.date,
                            type: hash === msg.senderHash ? 'out' : 'in'
                          };
                        }));

                      case 4:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, this);
              }));

              return function (_x3) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 8:
            chats = _context2.sent;
            return _context2.abrupt('return', {
              lastRequestDate: date,
              chats: (0, _underscore2.default)(chats).pick(function (list) {
                return list.length > 0;
              })
            });

          case 10:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getChatMessages(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var addChatMessage = exports.addChatMessage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var user = _ref.user;
    var boardName = _ref.boardName;
    var postNumber = _ref.postNumber;
    var chatNumber = _ref.chatNumber;
    var text = _ref.text;
    var chatCountKey, key, senderHash, date, post, receiver, receiverHash, messages, members, member, ttl;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context3.next = 2;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 2:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context3.next = 5;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 5:
            if (!(!text || typeof text !== 'string')) {
              _context3.next = 7;
              break;
            }

            throw new Error(Tools.translate('Message is empty'));

          case 7:
            chatNumber = Tools.option(chatNumber, 'number', 0, { test: function test(n) {
                return n > 0;
              } });
            chatCountKey = boardName + ':' + postNumber;

            if (chatNumber) {
              _context3.next = 13;
              break;
            }

            _context3.next = 12;
            return ChatSubchatCount.incrementBy(1, chatCountKey);

          case 12:
            chatNumber = _context3.sent;

          case 13:
            key = boardName + ':' + postNumber + ':' + chatNumber;
            senderHash = createUserHash(user);
            date = Tools.now();
            _context3.next = 18;
            return PostsModel.getPost(boardName, postNumber);

          case 18:
            post = _context3.sent;

            if (post) {
              _context3.next = 21;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 21:
            receiver = post.user;
            receiverHash = createUserHash(receiver);
            _context3.next = 25;
            return Chat.getSome(0, 0, key);

          case 25:
            messages = _context3.sent;

            if (!(messages.length > 0 && messages[0].senderHash !== senderHash && messages[0].receiverHash !== senderHash)) {
              _context3.next = 28;
              break;
            }

            throw new Error(Tools.translate('Somebody is chatting here already'));

          case 28:
            _context3.next = 30;
            return ChatMembers.getAll(key);

          case 30:
            members = _context3.sent;

            if (!(members.length < 2)) {
              _context3.next = 36;
              break;
            }

            _context3.next = 34;
            return ChatMembers.addSome([{
              hash: senderHash,
              ip: user.ip,
              hashpass: user.hashpass
            }, {
              hash: receiverHash,
              ip: receiver.ip,
              hashpass: receiver.hashpass
            }], key);

          case 34:
            _context3.next = 39;
            break;

          case 36:
            if (senderHash === receiverHash) {
              member = (0, _underscore2.default)(members).find(function (member) {
                return member.hash !== senderHash;
              });

              if (member) {
                receiverHash = member.hash;
                receiver = {
                  ip: member.ip,
                  hashpass: member.hashpass
                };
              }
            }
            _context3.next = 39;
            return Chats.addOne(key, senderHash);

          case 39:
            _context3.next = 41;
            return Chats.addOne(key, receiverHash);

          case 41:
            _context3.next = 43;
            return Chat.addOne({
              text: text,
              date: date.toISOString(),
              senderHash: senderHash,
              receiverHash: receiverHash
            }, date.valueOf(), key);

          case 43:
            ttl = (0, _config2.default)('server.chat.ttl') * Tools.SECOND;
            _context3.next = 46;
            return Chats.expire(ttl, senderHash);

          case 46:
            _context3.next = 48;
            return Chats.expire(ttl, receiverHash);

          case 48:
            _context3.next = 50;
            return Chat.expire(ttl, key);

          case 50:
            _context3.next = 52;
            return ChatMembers.expire(ttl, key);

          case 52:
            _context3.next = 54;
            return ChatSubchatCount.expire(ttl, chatCountKey);

          case 54:
            return _context3.abrupt('return', {
              message: {
                text: text,
                date: date.toISOString()
              },
              chatNumber: chatNumber,
              senderHash: senderHash,
              receiverHash: receiverHash,
              receiver: receiver
            });

          case 55:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function addChatMessage(_x4) {
    return ref.apply(this, arguments);
  };
}();

var deleteChatMessages = exports.deleteChatMessages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
    var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var user = _ref2.user;
    var boardName = _ref2.boardName;
    var postNumber = _ref2.postNumber;
    var chatNumber = _ref2.chatNumber;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return Chats.deleteOne(boardName + ':' + postNumber + ':' + chatNumber, createUserHash(user));

          case 2:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function deleteChatMessages(_x6) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _orderedSet = require('../storage/ordered-set');

var _orderedSet2 = _interopRequireDefault(_orderedSet);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Chat = new _orderedSet2.default((0, _redisClientFactory2.default)(), 'chat');
var ChatMembers = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'chatMembers');
var Chats = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'chats', {
  parse: false,
  stringify: false
});
var ChatSubchatCount = new _key2.default((0, _redisClientFactory2.default)(), 'chatSubchatCount');

function createUserHash(user) {
  return Tools.crypto('sha256', user.hashpass || user.ip);
}
//# sourceMappingURL=chats.js.map
