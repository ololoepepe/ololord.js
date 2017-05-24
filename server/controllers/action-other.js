'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _captcha = require('../captchas/captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _geolocation = require('../core/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _chats = require('../models/chats');

var ChatsModel = _interopRequireWildcard(_chats);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var router = _express2.default.Router();

router.post('/action/sendChatMessage', function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, res, next) {
    var _ref2, _ref2$fields, _boardName, postNumber, chatNumber, text, result, message, receiver, ip;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref2 = _context.sent;
            _ref2$fields = _ref2.fields;
            _boardName = _ref2$fields.boardName;
            postNumber = _ref2$fields.postNumber;
            chatNumber = _ref2$fields.chatNumber;
            text = _ref2$fields.text;

            if (_board2.default.board(_boardName)) {
              _context.next = 11;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 11:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context.next = 14;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 14:
            if (!(!text || typeof text !== 'string')) {
              _context.next = 16;
              break;
            }

            throw new Error(Tools.translate('Message is empty'));

          case 16:
            _context.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocationInfo = _context.sent;
            _context.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 21:
            _context.next = 23;
            return ChatsModel.addChatMessage({
              user: req,
              boardName: _boardName,
              postNumber: postNumber,
              chatNumber: chatNumber,
              text: text
            });

          case 23:
            result = _context.sent;
            message = result.message, receiver = result.receiver;

            message.type = 'in';
            ip = receiver.hashpass ? null : receiver.ip;

            IPC.send('sendChatMessage', {
              type: 'newChatMessage',
              message: {
                message: message,
                boardName: _boardName,
                postNumber: postNumber,
                chatNumber: result.chatNumber
              },
              ips: ip,
              hashpasses: receiver.hashpass
            });
            res.json({});
            _context.next = 34;
            break;

          case 31:
            _context.prev = 31;
            _context.t0 = _context['catch'](0);

            next(_context.t0);

          case 34:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 31]]);
  }));

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}());

router.post('/action/deleteChatMessages', function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var _ref4, _ref4$fields, _boardName2, postNumber, chatNumber;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref4 = _context2.sent;
            _ref4$fields = _ref4.fields;
            _boardName2 = _ref4$fields.boardName;
            postNumber = _ref4$fields.postNumber;
            chatNumber = _ref4$fields.chatNumber;

            if (_board2.default.board(_boardName2)) {
              _context2.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context2.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 13:
            chatNumber = Tools.option(chatNumber, 'number', 0, { test: function test(n) {
                return n > 0;
              } });

            if (chatNumber) {
              _context2.next = 16;
              break;
            }

            throw new Error(Tools.translate('Invalid chat number'));

          case 16:
            _context2.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocationInfo = _context2.sent;
            _context2.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName2, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 21:
            _context2.next = 23;
            return ChatsModel.deleteChatMessages({
              user: req,
              boardName: _boardName2,
              postNumber: postNumber,
              chatNumber: chatNumber
            });

          case 23:
            res.json({});
            _context2.next = 29;
            break;

          case 26:
            _context2.prev = 26;
            _context2.t0 = _context2['catch'](0);

            next(_context2.t0);

          case 29:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 26]]);
  }));

  return function (_x4, _x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}());

router.post('/action/synchronize', function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var _ref6, _ref6$fields, key, data;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref6 = _context3.sent;
            _ref6$fields = _ref6.fields;
            key = _ref6$fields.key;
            data = _ref6$fields.data;

            if (!(!key || typeof key !== 'string')) {
              _context3.next = 9;
              break;
            }

            throw new Error(Tools.translate('No key specified'));

          case 9:
            _context3.next = 11;
            return (0, _geolocation2.default)(req.ip);

          case 11:
            req.geolocationInfo = _context3.sent;
            _context3.next = 14;
            return UsersModel.checkUserBan(req.ip, boardName, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 14:
            _context3.prev = 14;

            data = JSON.parse(data);
            _context3.next = 21;
            break;

          case 18:
            _context3.prev = 18;
            _context3.t0 = _context3['catch'](14);
            throw new Error(Tools.translate('Failed to parse data'));

          case 21:
            _context3.next = 23;
            return UsersModel.setSynchronizationData(key, data);

          case 23:
            res.json({});
            _context3.next = 29;
            break;

          case 26:
            _context3.prev = 26;
            _context3.t1 = _context3['catch'](0);

            next(_context3.t1);

          case 29:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 26], [14, 18]]);
  }));

  return function (_x7, _x8, _x9) {
    return _ref5.apply(this, arguments);
  };
}());

router.post('/action/search', function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
    var _ref8, _ref8$fields, query, _boardName3, page, phrases, model, result, maxSubjectLength, maxTextLength;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;
            _context4.next = 3;
            return Files.parseForm(req);

          case 3:
            _ref8 = _context4.sent;
            _ref8$fields = _ref8.fields;
            query = _ref8$fields.query;
            _boardName3 = _ref8$fields.boardName;
            page = _ref8$fields.page;

            if (!(!query || typeof query !== 'string')) {
              _context4.next = 10;
              break;
            }

            throw new Error(Tools.translate('Search query is empty'));

          case 10:
            if (!(query.length > (0, _config2.default)('site.maxSearchQueryLength'))) {
              _context4.next = 12;
              break;
            }

            throw new Error(Tools.translate('Search query is too long'));

          case 12:
            if ('*' === _boardName3) {
              _boardName3 = '';
            }

            if (!(_boardName3 && !_board2.default.board(_boardName3))) {
              _context4.next = 15;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 15:
            page = Tools.option(page, 'number', 0, { test: function test(p) {
                return p >= 0;
              } });
            _context4.next = 18;
            return (0, _geolocation2.default)(req.ip);

          case 18:
            req.geolocationInfo = _context4.sent;
            _context4.next = 21;
            return UsersModel.checkUserBan(req.ip, _boardName3, {
              write: true,
              geolocationInfo: req.geolocationInfo
            });

          case 21:
            phrases = query.match(/\w+|"[^"]+"/g) || [];
            model = {
              searchQuery: query,
              phrases: phrases.map(function (phrase) {
                return phrase.replace(/(^\-|^"|"$)/g, '');
              }),
              searchBoard: _boardName3
            };
            _context4.next = 25;
            return PostsModel.findPosts(query, _boardName3, page);

          case 25:
            result = _context4.sent;
            maxSubjectLength = (0, _config2.default)('system.search.maxResultPostSubjectLengh');
            maxTextLength = (0, _config2.default)('system.search.maxResultPostTextLengh');

            model.searchResults = result.posts.map(function (post) {
              var text = (post.plainText || '').replace(/\r*\n+/g, ' ');
              if (text.length > maxTextLength) {
                text = text.substr(0, maxTextLength - 1) + '…';
              }
              var subject = post.subject || text;
              if (subject.length > maxSubjectLength) {
                subject = subject.substr(0, maxSubjectLength - 1) + '…';
              }
              return {
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                archived: post.archived,
                subject: subject,
                text: text
              };
            });
            model.total = result.total;
            model.max = result.max;
            res.json(model);
            _context4.next = 37;
            break;

          case 34:
            _context4.prev = 34;
            _context4.t0 = _context4['catch'](0);

            next(_context4.t0);

          case 37:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 34]]);
  }));

  return function (_x10, _x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}());

_captcha2.default.captchaIDs().forEach(function (id) {
  _captcha2.default.captcha(id).actionRoutes().forEach(function (route) {
    router[route.method]('/action' + route.path, route.handler);
  });
});

_board2.default.boardNames().forEach(function (name) {
  _board2.default.board(name).actionRoutes().forEach(function (route) {
    router[route.method]('/action' + route.path, route.handler);
  });
});

module.exports = router;
//# sourceMappingURL=action-other.js.map
