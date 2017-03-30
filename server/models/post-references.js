'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rerenderReferencedPosts = exports.updateReferringPosts = exports.addReferringPosts = exports.removeReferringPosts = undefined;

var removeReferringPosts = exports.removeReferringPosts = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, postNumber) {
    var Post;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.collection('post');

          case 2:
            Post = _context.sent;
            _context.next = 5;
            return Post.updateMany({
              referringPosts: {
                $elemMatch: {
                  boardName: boardName,
                  postNumber: postNumber
                }
              }
            }, {
              $pull: {
                referringPosts: {
                  boardName: boardName,
                  postNumber: postNumber
                }
              }
            });

          case 5:
            return _context.abrupt('return', _context.sent);

          case 6:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function removeReferringPosts(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var addReferringPosts = exports.addReferringPosts = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(referencedPosts, boardName, postNumber, threadNumber) {
    var Post;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('post');

          case 2:
            Post = _context2.sent;
            _context2.next = 5;
            return Tools.series(referencedPosts, function (ref) {
              return Post.updateOne({
                boardName: ref.boardName,
                number: ref.postNumber
              }, {
                $push: {
                  referringPosts: {
                    boardName: boardName,
                    postNumber: postNumber,
                    threadNumber: threadNumber,
                    createdAt: ref.createdAt
                  }
                }
              });
            });

          case 5:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function addReferringPosts(_x3, _x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var updatePostMarkup = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, postNumber) {
    var Post, query, post, oldReferencedPosts, referencedPosts, text, _ref4, matchedCount;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            console.log(Tools.translate('Rendering post text: >>/$[1]/$[2]', '', boardName, postNumber));
            _context3.next = 3;
            return client.collection('post');

          case 3:
            Post = _context3.sent;
            query = {
              boardName: boardName,
              number: postNumber
            };
            _context3.next = 7;
            return Post.findOne(query, {
              threadNumber: 1,
              rawText: 1,
              markup: 1,
              'user.level': 1,
              referencedPosts: 1
            });

          case 7:
            post = _context3.sent;

            if (post) {
              _context3.next = 10;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 10:
            oldReferencedPosts = post.referencedPosts;
            referencedPosts = {};
            _context3.next = 14;
            return (0, _markup2.default)(boardName, post.rawText, {
              markupModes: post.markup,
              referencedPosts: referencedPosts,
              accessLevel: post.user.level
            });

          case 14:
            text = _context3.sent;
            _context3.next = 17;
            return Post.updateOne(query, {
              $set: {
                text: text,
                referencedPosts: (0, _underscore2.default)(referencedPosts).toArray()
              }
            });

          case 17:
            _ref4 = _context3.sent;
            matchedCount = _ref4.matchedCount;

            if (!(matchedCount <= 0)) {
              _context3.next = 21;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 21:
            return _context3.abrupt('return', {
              oldReferencedPosts: oldReferencedPosts,
              newReferencedPosts: referencedPosts
            });

          case 22:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function updatePostMarkup(_x7, _x8) {
    return _ref3.apply(this, arguments);
  };
}();

var updateReferringPosts = exports.updateReferringPosts = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(referringPosts, boardName, postNumber, threadNumber) {
    var pickNumber, pickFunction, refs;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            pickNumber = postNumber || threadNumber;
            pickFunction = postNumber ? pickPostsToRerender : pickThreadsToRerender;
            refs = pickFunction(referringPosts, boardName, pickNumber);
            _context5.next = 5;
            return Tools.series(refs, function () {
              var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(ref) {
                var _ref7, oldReferencedPosts, newReferencedPosts;

                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.prev = 0;
                        _context4.next = 3;
                        return updatePostMarkup(ref.boardName, ref.postNumber);

                      case 3:
                        _ref7 = _context4.sent;
                        oldReferencedPosts = _ref7.oldReferencedPosts;
                        newReferencedPosts = _ref7.newReferencedPosts;

                        oldReferencedPosts = pickFunction(oldReferencedPosts, boardName, pickNumber);
                        _context4.next = 9;
                        return removeReferringPosts(ref.boardName, ref.postNumber);

                      case 9:
                        newReferencedPosts = pickFunction(newReferencedPosts, boardName, pickNumber);
                        _context4.next = 12;
                        return addReferringPosts(newReferencedPosts, ref.boardName, ref.postNumber, ref.threadNumber);

                      case 12:
                        return _context4.abrupt('return', _underscore2.default.extend(oldReferencedPosts, newReferencedPosts));

                      case 15:
                        _context4.prev = 15;
                        _context4.t0 = _context4['catch'](0);

                        _logger2.default.error(_context4.t0.stack || _context4.t0);
                        return _context4.abrupt('return', {});

                      case 19:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this, [[0, 15]]);
              }));

              return function (_x13) {
                return _ref6.apply(this, arguments);
              };
            }(), true);

          case 5:
            refs = _context5.sent;
            return _context5.abrupt('return', (0, _underscore2.default)(_underscore2.default.extend.apply(_underscore2.default, [{}].concat(_toConsumableArray(refs)))).reduce(function (acc, ref) {
              acc[ref.boardName + ':' + ref.threadNumber] = ref;
              return acc;
            }, {}));

          case 7:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function updateReferringPosts(_x9, _x10, _x11, _x12) {
    return _ref5.apply(this, arguments);
  };
}();

var rerenderReferencedPosts = exports.rerenderReferencedPosts = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, threadNumber, newReferencedPosts, oldReferencedPosts) {
    var newRefs, oldRefs;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            newRefs = pickThreadsToRerender(newReferencedPosts, boardName, threadNumber);
            oldRefs = pickThreadsToRerender(oldReferencedPosts, boardName, threadNumber);
            _context6.prev = 2;
            _context6.next = 5;
            return Tools.series(_underscore2.default.extend(newRefs, oldRefs), function (ref) {
              return IPC.render(ref.boardName, ref.threadNumber, ref.threadNumber, 'edit');
            });

          case 5:
            _context6.next = 10;
            break;

          case 7:
            _context6.prev = 7;
            _context6.t0 = _context6['catch'](2);

            _logger2.default.error(_context6.t0.stack || _context6.t0);

          case 10:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[2, 7]]);
  }));

  return function rerenderReferencedPosts(_x14, _x15, _x16, _x17) {
    return _ref8.apply(this, arguments);
  };
}();

exports.replacePostLinks = replacePostLinks;
exports.replacePostReferences = replacePostReferences;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _markup = require('../markup');

var _markup2 = _interopRequireDefault(_markup);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();

function pickPostsToRerender(referencedPosts, boardName, postNumber) {
  return (0, _underscore2.default)(referencedPosts).filter(function (ref) {
    return boardName !== ref.boardName || postNumber !== ref.postNumber;
  }).reduce(function (acc, ref) {
    acc[ref.boardName + ':' + ref.threadNumber] = ref;
    return acc;
  }, {});
}

function pickThreadsToRerender(referencedPosts, boardName, threadNumber) {
  return (0, _underscore2.default)(referencedPosts).filter(function (ref) {
    return boardName !== ref.boardName || threadNumber !== ref.threadNumber;
  }).reduce(function (acc, ref) {
    acc[ref.boardName + ':' + ref.threadNumber] = ref;
    return acc;
  }, {});
}

function replacePostLinks(text, sourceBoardName, referencedPosts, postNumberMap) {
  if (!text) {
    return text;
  }
  referencedPosts.filter(function (ref) {
    return ref.boardName === sourceBoardName;
  }).forEach(function (ref) {
    var newPostNumber = postNumberMap[ref.postNumber];
    var replacement = newPostNumber ? '>>' + newPostNumber : '>>/' + sourceBoardName + '/' + ref.postNumber;
    text = text.replace(new RegExp('>>' + ref.postNumber, 'g'), replacement);
  });
  return text;
}

function replacePostReferences(references, source, target, postNumberMap) {
  var sourceBoardName = source.boardName;
  var sourceThreadNumber = source.threadNumber;
  var targetBoardName = target.boardName;
  var targetThreadNumber = target.threadNumber;
  return references.map(function (ref) {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber],
        createdAt: ref.createdAt
      };
    } else {
      return ref;
    }
  });
}
//# sourceMappingURL=post-references.js.map
