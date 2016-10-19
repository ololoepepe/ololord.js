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
    var ChatMessage, date, messages, chats;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context2.sent;
            date = Tools.now();
            _context2.next = 6;
            return ChatMessage.find({
              $and: [{
                $or: createMessagesQuery(user)
              }, {
                date: { $gt: lastRequestDate }
              }]
            }, {
              _id: 0
            }).sort({ date: 1 }).toArray();

          case 6:
            messages = _context2.sent;
            chats = messages.reduce(function (acc, message) {
              var chat = acc[message.key];
              if (!chat) {
                chat = [];
                acc[message.key] = chat;
              }
              delete message.key;
              var list = [{
                messageUser: message.sender,
                type: 'out'
              }, {
                messageUser: message.receiver,
                type: 'in'
              }];
              delete message.sender;
              delete message.receiver;
              message.date = message.date.toISOString();
              list.filter(function (_ref) {
                var messageUser = _ref.messageUser;
                return usersEqual(user, messageUser);
              }).forEach(function (_ref2) {
                var messageUser = _ref2.messageUser;
                var type = _ref2.type;

                var msg = _underscore2.default.clone(message);
                msg.type = type;
                chat.push(msg);
              });
              return acc;
            }, {});
            return _context2.abrupt('return', {
              lastRequestDate: date.toISOString(),
              chats: chats
            });

          case 9:
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
    var _ref3 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var user = _ref3.user;
    var boardName = _ref3.boardName;
    var postNumber = _ref3.postNumber;
    var chatNumber = _ref3.chatNumber;
    var text = _ref3.text;
    var Post, post, key, ChatMessage, message, isSender, isReceiver, messageSender, messageReceiver, receiver, date;
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
              'user.hashpass': 1
            });

          case 12:
            post = _context3.sent;

            if (post) {
              _context3.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 15:
            chatNumber = Tools.option(chatNumber, 'number', 0, { test: function test(n) {
                return n > 0;
              } });
            _context3.next = 18;
            return getChatNumber(boardName, postNumber, chatNumber);

          case 18:
            chatNumber = _context3.sent;
            key = boardName + ':' + postNumber + ':' + chatNumber;
            _context3.next = 22;
            return client.collection('chatMessage');

          case 22:
            ChatMessage = _context3.sent;
            _context3.next = 25;
            return ChatMessage.findOne({ key: key }, {
              sender: 1,
              receiver: 1
            });

          case 25:
            message = _context3.sent;
            isSender = !message || usersEqual(message.sender, user);
            isReceiver = message && usersEqual(message.receiver, user);

            if (!(!isSender && !isReceiver)) {
              _context3.next = 30;
              break;
            }

            throw new Error(Tools.translate('Somebody is chatting here already'));

          case 30:
            messageSender = message ? message.sender : post.user;
            messageReceiver = message ? message.receiver : post.user;
            receiver = selectUser(user, message ? message.receiver : post.user, isReceiver);
            date = Tools.now();
            _context3.next = 36;
            return ChatMessage.insertOne({
              key: key,
              text: text,
              date: date,
              sender: selectUser(user, message ? message.sender : post.user, isSender),
              receiver: receiver
            });

          case 36:
            return _context3.abrupt('return', {
              message: {
                text: text,
                date: date.toISOString()
              },
              chatNumber: chatNumber,
              receiver: receiver
            });

          case 37:
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
    var _ref4 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var user = _ref4.user;
    var boardName = _ref4.boardName;
    var postNumber = _ref4.postNumber;
    var chatNumber = _ref4.chatNumber;
    var ChatMessage;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context4.sent;
            _context4.next = 5;
            return ChatMessage.deleteMany({
              $and: [createMessagesQuery(user), { key: boardName + ':' + postNumber + ':' + chatNumber }]
            });

          case 5:
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

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();

function createMessagesQuery(user) {
  var query = [{ 'sender.ip': user.ip }, { 'receiver.ip': user.ip }];
  if (user.hashpass) {
    query.push({ 'sender.hashpass': user.hashpass });
    query.push({ 'receiver.hashpass': user.hashpass });
  }
  return query;
}

function usersEqual(user1, user2) {
  return user1.ip === user2.ip || user1.hashpass && user1.hashpass === user2.hashpass;
}

function messageType(message, user) {
  if (usersEqual(user, message.sender)) {
    return 'out';
  } else {
    return 'in';
  }
}

function selectUser(user1, user2, first) {
  return {
    ip: first ? user1.ip : user2.ip,
    hashpass: first ? user1.hashpass : user2.hashpass
  };
}
//# sourceMappingURL=chats.js.map
