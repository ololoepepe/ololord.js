'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteChatMessages = exports.addChatMessage = exports.getChatMessages = undefined;

var getChatNumber = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, postNumber, chatNumber) {
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
    return _ref.apply(this, arguments);
  };
}();

var selectReceiver = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(key, user, postUser) {
    var ChatMessage, message;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context2.sent;
            _context2.next = 5;
            return ChatMessage.findOne({ key: key }, {
              sender: 1,
              receiver: 1
            });

          case 5:
            message = _context2.sent;

            if (!(message && !usersEqual(message.sender, user) && !usersEqual(message.receiver, user))) {
              _context2.next = 8;
              break;
            }

            throw new Error(Tools.translate('Somebody is chatting here already'));

          case 8:
            if (!(!message || !usersEqual(user, postUser))) {
              _context2.next = 10;
              break;
            }

            return _context2.abrupt('return', cloneUser(postUser));

          case 10:
            return _context2.abrupt('return', usersEqual(user, message.sender) ? message.receiver : message.sender);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function selectReceiver(_x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var getChatMessages = exports.getChatMessages = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(user, lastRequestDate) {
    var ChatMessage, date, messages, chats;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context3.sent;
            date = Tools.now();
            _context3.next = 6;
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
            messages = _context3.sent;
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
              list.filter(function (_ref4) {
                var messageUser = _ref4.messageUser;
                return usersEqual(user, messageUser);
              }).forEach(function (_ref5) {
                var messageUser = _ref5.messageUser,
                    type = _ref5.type;

                var msg = _underscore2.default.clone(message);
                msg.type = type;
                chat.push(msg);
              });
              return acc;
            }, {});
            return _context3.abrupt('return', {
              lastRequestDate: date.toISOString(),
              chats: chats
            });

          case 9:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getChatMessages(_x7, _x8) {
    return _ref3.apply(this, arguments);
  };
}();

var addChatMessage = exports.addChatMessage = function () {
  var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
    var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        user = _ref7.user,
        boardName = _ref7.boardName,
        postNumber = _ref7.postNumber,
        chatNumber = _ref7.chatNumber,
        text = _ref7.text;

    var Post, post, key, receiver, ChatMessage, date;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (_board2.default.board(boardName)) {
              _context4.next = 2;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 2:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context4.next = 5;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 5:
            if (!(!text || typeof text !== 'string')) {
              _context4.next = 7;
              break;
            }

            throw new Error(Tools.translate('Message is empty'));

          case 7:
            _context4.next = 9;
            return client.collection('post');

          case 9:
            Post = _context4.sent;
            _context4.next = 12;
            return Post.findOne({
              boardName: boardName,
              number: postNumber
            }, {
              'user.ip': 1,
              'user.hashpass': 1
            });

          case 12:
            post = _context4.sent;

            if (post) {
              _context4.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 15:
            chatNumber = Tools.option(chatNumber, 'number', 0, { test: function test(n) {
                return n > 0;
              } });
            _context4.next = 18;
            return getChatNumber(boardName, postNumber, chatNumber);

          case 18:
            chatNumber = _context4.sent;
            key = boardName + ':' + postNumber + ':' + chatNumber;
            _context4.next = 22;
            return selectReceiver(key, user, post.user);

          case 22:
            receiver = _context4.sent;
            _context4.next = 25;
            return client.collection('chatMessage');

          case 25:
            ChatMessage = _context4.sent;
            date = Tools.now();
            _context4.next = 29;
            return ChatMessage.insertOne({
              key: key,
              text: text,
              date: date,
              sender: cloneUser(user),
              receiver: receiver
            });

          case 29:
            return _context4.abrupt('return', {
              message: {
                text: text,
                date: date.toISOString()
              },
              chatNumber: chatNumber,
              receiver: receiver
            });

          case 30:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function addChatMessage() {
    return _ref6.apply(this, arguments);
  };
}();

var deleteChatMessages = exports.deleteChatMessages = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
    var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        user = _ref9.user,
        boardName = _ref9.boardName,
        postNumber = _ref9.postNumber,
        chatNumber = _ref9.chatNumber;

    var ChatMessage;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return client.collection('chatMessage');

          case 2:
            ChatMessage = _context5.sent;
            _context5.next = 5;
            return ChatMessage.deleteMany({
              $and: [{ $or: createMessagesQuery(user) }, { key: boardName + ':' + postNumber + ':' + chatNumber }]
            });

          case 5:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function deleteChatMessages() {
    return _ref8.apply(this, arguments);
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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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

function cloneUser(user) {
  return {
    ip: user.ip,
    hashpass: user.hashpass
  };
}
//# sourceMappingURL=chats.js.map
