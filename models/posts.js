'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPostKeys = exports.getPosts = exports.getPost = undefined;

var addDataToPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(board, post) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var withExtraData = _ref.withExtraData;
    var withFileInfos = _ref.withFileInfos;
    var withReferences = _ref.withReferences;
    var key, ban, extraData, fileNames, fileInfos, referringPosts, referencedPosts;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            key = post.boardName + ':' + post.number;
            _context.next = 3;
            return UserBans.get(post.user.ip + ':' + post.boardName);

          case 3:
            ban = _context.sent;

            post.bannedFor = !!(ban && ban.postNumber === post.number);

            if (!withExtraData) {
              _context.next = 10;
              break;
            }

            _context.next = 8;
            return board.loadExtraData(post.number);

          case 8:
            extraData = _context.sent;

            post.extraData = extraData;

          case 10:
            if (!withFileInfos) {
              _context.next = 18;
              break;
            }

            _context.next = 13;
            return PostFileInfoNames.getAll(key);

          case 13:
            fileNames = _context.sent;
            _context.next = 16;
            return FileInfos.getSome(fileNames);

          case 16:
            fileInfos = _context.sent;

            post.fileInfos = fileInfos;

          case 18:
            if (!withReferences) {
              _context.next = 27;
              break;
            }

            _context.next = 21;
            return ReferringPosts.getAll(key);

          case 21:
            referringPosts = _context.sent;
            _context.next = 24;
            return ReferencedPosts.getAll(key);

          case 24:
            referencedPosts = _context.sent;

            post.referringPosts = sortedReferences(referringPosts);
            post.referencedPosts = sortedReferences(referencedPosts);

          case 27:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function addDataToPost(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var getPost = exports.getPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, postNumber, options) {
    var board, key, post, threadPostNumbers;
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
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context2.next = 6;
              break;
            }

            return _context2.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 6:
            key = boardName + ':' + postNumber;
            _context2.next = 9;
            return Posts.getOne(key);

          case 9:
            post = _context2.sent;

            if (post) {
              _context2.next = 12;
              break;
            }

            return _context2.abrupt('return', post);

          case 12:
            _context2.next = 14;
            return ThreadsModel.getThreadPostNumbers(boardName, post.threadNumber);

          case 14:
            threadPostNumbers = _context2.sent;

            post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
            _context2.next = 18;
            return addDataToPost(board, post, options);

          case 18:
            return _context2.abrupt('return', post);

          case 19:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getPost(_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var getPosts = exports.getPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, postNumbers, options) {
    var board, posts, threadPostNumbers;
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
            if (!(0, _underscore2.default)(postNumbers).isArray()) {
              postNumbers = [postNumbers];
            }
            postNumbers = postNumbers.map(function (postNumber) {
              return Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
            });

            if (!postNumbers.some(function (postNumber) {
              return !postNumber;
            })) {
              _context4.next = 7;
              break;
            }

            return _context4.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 7:
            _context4.next = 9;
            return Posts.getSome(postNumbers.map(function (postNumber) {
              return boardName + ':' + postNumber;
            }));

          case 9:
            posts = _context4.sent;

            posts = (0, _underscore2.default)(posts).toArray();

            if (!(posts.length <= 0)) {
              _context4.next = 13;
              break;
            }

            return _context4.abrupt('return', []);

          case 13:
            _context4.next = 15;
            return ThreadsModel.getThreadPostNumbers(boardName, posts[0].threadNumber);

          case 15:
            threadPostNumbers = _context4.sent;
            _context4.next = 18;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(post, index) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        if (post) {
                          _context3.next = 2;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 2:
                        post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
                        _context3.next = 5;
                        return addDataToPost(board, post, options);

                      case 5:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x11, _x12) {
                return ref.apply(this, arguments);
              };
            }());

          case 18:
            return _context4.abrupt('return', posts);

          case 19:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getPosts(_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var getPostKeys = exports.getPostKeys = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return Posts.keys();

          case 2:
            return _context5.abrupt('return', _context5.sent);

          case 3:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getPostKeys() {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _threads = require('./threads');

var ThreadsModel = _interopRequireWildcard(_threads);

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

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var FileInfos = new _hash2.default((0, _clientFactory2.default)(), 'fileInfos');
var PostFileInfoNames = new _unorderedSet2.default((0, _clientFactory2.default)(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
var Posts = new _hash2.default((0, _clientFactory2.default)(), 'posts');
var ReferringPosts = new _hash2.default((0, _clientFactory2.default)(), 'referringPosts');
var ReferencedPosts = new _hash2.default((0, _clientFactory2.default)(), 'referencedPosts');
var UserBans = new _key2.default((0, _clientFactory2.default)(), 'userBans');

function sortedReferences(references) {
  return (0, _underscore2.default)(references).toArray().sort(function (a, b) {
    return a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt) || a.boardName.localeCompare(b.boardName) || a.postNumber - b.postNumber;
  }).map(function (reference) {
    delete reference.createdAt;
    return reference;
  });
}
//# sourceMappingURL=posts.js.map
