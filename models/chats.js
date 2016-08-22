'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChatMessages = undefined;

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

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _orderedSet = require('../storage/ordered-set');

var _orderedSet2 = _interopRequireDefault(_orderedSet);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }
//import Hash from '../storage/hash';
//import Key from '../storage/key';

//import Board from '../boards';


//let FileInfos = new Hash(redisClient(), 'fileInfos');
var Chat = new _orderedSet2.default((0, _redisClientFactory2.default)(), 'chat');
var Chats = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'chats', {
  parse: false,
  stringify: false
});
/*let Posts = new Hash(redisClient(), 'posts');
let ReferringPosts = new Hash(redisClient(), 'referringPosts');
let ReferencedPosts = new Hash(redisClient(), 'referencedPosts');
let UserBans = new Key(redisClient(), 'userBans');*/

function createUserHash(user) {
  var sha256 = _crypto2.default.createHash('sha256');
  sha256.update(user.hashpass || user.ip);
  return sha256.digest('hex');
}
//# sourceMappingURL=chats.js.map
