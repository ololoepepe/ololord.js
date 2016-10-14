'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteChatMessages = exports.addChatMessage = exports.getChatMessages = undefined;

var getChatNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, postNumber, chatNumber) {
    var ChatNumberCounter, key, counter, result, lastChatNumber;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.collection('chatNumberCounter');

          case 2:
            ChatNumberCounter = _context.sent;
            key = boardName + ':' + postNumber;
            _context.next = 6;
            return ChatNumberCounter.findOne({
              _id: key,
              lastChatNumber: { $lte: chatNumber }
            });

          case 6:
            counter = _context.sent;

            if (!counter) {
              _context.next = 9;
              break;
            }

            return _context.abrupt('return', chatNumber);

          case 9:
            _context.next = 11;
            return ChatNumberCounter.findOneAndUpdate({ _id: key }, {
              $inc: { lastChatNumber: 1 }
            }, {
              projection: { lastChatNumber: 1 },
              upsert: true,
              returnOriginal: false
            });

          case 11:
            result = _context.sent;

            if (result) {
              _context.next = 14;
              break;
            }

            return _context.abrupt('return', 0);

          case 14:
            lastChatNumber = result.value.lastChatNumber;
            return _context.abrupt('return', lastChatNumber);

          case 16:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getChatNumber(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var getChatMessages = exports.getChatMessages = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(user, lastRequestDate) {
    var ChatMessage, hash, date, messages, chats;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context2.sent;
            hash = createUserHash(user);
            date = Tools.now();
            _context2.next = 7;
            return ChatMessage.find({
              $or: [{
                senderHash: hash,
                date: { $gt: lastRequestDate }
              }, {
                receiverHash: hash,
                date: { $gt: lastRequestDate }
              }]
            }, {
              _id: 0,
              receiverHash: 0
            }).sort({ date: 1 }).toArray();

          case 7:
            messages = _context2.sent;
            chats = messages.reduce(function (acc, message) {
              message.type = hash === message.senderHash ? 'out' : 'in';
              var chat = acc[message.key];
              if (!chat) {
                chat = [];
                acc[message.key] = chat;
              }
              delete message.key;
              delete message.senderHash;
              message.date = message.date.toISOString();
              chat.push(message);
              return acc;
            }, {});
            return _context2.abrupt('return', {
              lastRequestDate: date.toISOString(),
              chats: chats
            });

          case 10:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getChatMessages(_x4, _x5) {
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
    var Post, post, receiver, receiverHash, senderHash, key, ChatMessage, message, date;
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
            _context3.next = 9;
            return client.collection('post');

          case 9:
            Post = _context3.sent;
            _context3.next = 12;
            return Post.findOne({
              boardName: boardName,
              number: postNumber
            }, {
              'user.ip': 1,
              'user.hash': 1
            });

          case 12:
            post = _context3.sent;

            if (post) {
              _context3.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 15:
            receiver = post.user;
            receiverHash = createUserHash(receiver);
            senderHash = createUserHash(user);

            chatNumber = Tools.option(chatNumber, 'number', 0, { test: function test(n) {
                return n > 0;
              } });
            _context3.next = 21;
            return getChatNumber(boardName, postNumber, chatNumber);

          case 21:
            chatNumber = _context3.sent;
            key = boardName + ':' + postNumber + ':' + chatNumber;
            _context3.next = 25;
            return client.collection('chatMessage');

          case 25:
            ChatMessage = _context3.sent;
            _context3.next = 28;
            return ChatMessage.findOne({ key: key }, {
              senderHash: 1,
              receiverHash: 1
            });

          case 28:
            message = _context3.sent;

            if (!(message && message.senderHash !== senderHash && message.receiverHash !== receiverHash)) {
              _context3.next = 31;
              break;
            }

            throw new Error(Tools.translate('Somebody is chatting here already'));

          case 31:
            date = Tools.now();
            _context3.next = 34;
            return ChatMessage.insertOne({
              key: key,
              text: text,
              date: date,
              senderHash: senderHash,
              receiverHash: receiverHash
            });

          case 34:
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

          case 35:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function addChatMessage(_x6) {
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
    var ChatMessage, key, hash;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context4.sent;
            key = boardName + ':' + postNumber + ':' + chatNumber;
            hash = createUserHash(user);
            _context4.next = 7;
            return ChatMessage.deleteMany({
              $or: [{
                senderHash: hash,
                key: key
              }, {
                receiverHash: hash,
                key: key
              }]
            });

          case 7:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function deleteChatMessages(_x8) {
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

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();

function createUserHash(user) {
  return Tools.crypto('sha256', user.hashpass || user.ip);
}
//# sourceMappingURL=chats.js.map
