'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeReferringPosts = exports.storeReferringPosts = exports.storeReferencedPosts = exports.rerenderReferringPosts = exports.removeReferencedPosts = exports.addReferencedPosts = exports.addReferencesToPost = undefined;

var addReferencesToPost = exports.addReferencesToPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(post) {
    var key, referringSource, referencedSource, referringPosts, referencedPosts;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            key = post.boardName + ':' + post.number;
            referringSource = post.archived ? ArchivedReferringPosts : ReferringPosts;
            referencedSource = post.archived ? ArchivedReferencedPosts : ReferencedPosts;
            _context.next = 5;
            return referringSource.getAll(key);

          case 5:
            referringPosts = _context.sent;
            _context.next = 8;
            return referencedSource.getAll(key);

          case 8:
            referencedPosts = _context.sent;

            post.referringPosts = sortedReferences(referringPosts);
            post.referencedPosts = sortedReferences(referencedPosts);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function addReferencesToPost(_x) {
    return ref.apply(this, arguments);
  };
}();

var addReferencedPosts = exports.addReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(post, referencedPosts) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var nogenerate = _ref.nogenerate;
    var archived = _ref.archived;
    var key, referringSource, referencedSource;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            key = post.boardName + ':' + post.number;
            referringSource = post.archived ? ArchivedReferringPosts : ReferringPosts;
            referencedSource = post.archived ? ArchivedReferencedPosts : ReferencedPosts;
            //TODO: Optimise (hmset)

            _context3.next = 5;
            return Tools.series(referencedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(ref, refKey) {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return referencedSource.setOne(refKey, ref, key);

                      case 2:
                        _context2.next = 4;
                        return referringSource.setOne(key, {
                          boardName: post.boardName,
                          postNumber: post.number,
                          threadNumber: post.threadNumber,
                          createdAt: refKey.createdAt
                        }, refKey);

                      case 4:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, this);
              }));

              return function (_x6, _x7) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
            if (!nogenerate) {
              (0, _underscore2.default)(referencedPosts).each(function (ref, refKey) {
                if (ref.boardName !== post.boardName || ref.threadNumber !== post.threadNumber) {
                  IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
                }
              });
            }

          case 6:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function addReferencedPosts(_x2, _x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var removeReferencedPosts = exports.removeReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(_ref2) {
    var boardName = _ref2.boardName;
    var number = _ref2.number;
    var threadNumber = _ref2.threadNumber;
    var archived = _ref2.archived;

    var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var nogenerate = _ref3.nogenerate;
    var key, referencedSource, referringSource, referencedPosts;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            key = boardName + ':' + number;
            referencedSource = archived ? ArchivedReferencedPosts : ReferencedPosts;
            referringSource = archived ? ArchivedReferringPosts : ReferringPosts;
            _context5.next = 5;
            return referencedSource.getAll(key);

          case 5:
            referencedPosts = _context5.sent;
            _context5.next = 8;
            return Tools.series(referencedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(ref, refKey) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.next = 2;
                        return referringSource.deleteOne(key, refKey);

                      case 2:
                        return _context4.abrupt('return', _context4.sent);

                      case 3:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function (_x11, _x12) {
                return ref.apply(this, arguments);
              };
            }());

          case 8:
            if (!nogenerate) {
              (0, _underscore2.default)(referencedPosts).filter(function (ref) {
                return ref.boardName !== boardName || ref.threadNumber !== threadNumber;
              }).forEach(function (ref) {
                IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
              });
            }
            referencedSource.delete(key);

          case 10:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function removeReferencedPosts(_x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

var rerenderReferringPosts = exports.rerenderReferringPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(_ref4) {
    var boardName = _ref4.boardName;
    var number = _ref4.number;
    var threadNumber = _ref4.threadNumber;
    var archived = _ref4.archived;

    var _ref5 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var removingThread = _ref5.removingThread;
    var referringSource, referringPosts;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            referringSource = archived ? ArchivedReferringPosts : ReferringPosts;
            _context7.next = 3;
            return referringSource.getAll(boardName + ':' + number);

          case 3:
            referringPosts = _context7.sent;

            referringPosts = (0, _underscore2.default)(referringPosts).filter(function (ref) {
              return !removingThread || ref.boardName !== boardName || ref.threadNumber !== threadNumber;
            });
            _context7.next = 7;
            return Tools.series(referringPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(ref) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return PostsModel.rerenderPost(ref.boardName, ref.postNumber);

                      case 2:
                        return _context6.abrupt('return', _context6.sent);

                      case 3:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x16) {
                return ref.apply(this, arguments);
              };
            }());

          case 7:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function rerenderReferringPosts(_x13, _x14) {
    return ref.apply(this, arguments);
  };
}();

var storeReferencedPosts = exports.storeReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName, postNumber, referencedPosts) {
    var _ref7 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref7.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            source = archived ? ArchivedReferencedPosts : ReferencedPosts;
            _context9.next = 3;
            return Tools.series(referencedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(ref) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.next = 2;
                        return source.setOne(ref.boardName + ':' + ref.postNumber, ref, boardName + ':' + postNumber);

                      case 2:
                      case 'end':
                        return _context8.stop();
                    }
                  }
                }, _callee8, this);
              }));

              return function (_x22) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function storeReferencedPosts(_x17, _x18, _x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

var storeReferringPosts = exports.storeReferringPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, postNumber, referringPosts) {
    var _ref8 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref8.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            source = archived ? ArchivedReferringPosts : ReferringPosts;
            _context11.next = 3;
            return Tools.series(referringPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(ref) {
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        source.setOne(ref.boardName + ':' + ref.postNumber, ref, boardName + ':' + postNumber);

                      case 1:
                      case 'end':
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function (_x28) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function storeReferringPosts(_x23, _x24, _x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var removeReferencedPosts = exports.removeReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName, postNumber) {
    var _ref9 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref9.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            source = archived ? ArchivedReferencedPosts : ReferencedPosts;

            source.delete(boardName + ':' + postNumber);

          case 2:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function removeReferencedPosts(_x29, _x30, _x31) {
    return ref.apply(this, arguments);
  };
}();

var removeReferringPosts = exports.removeReferringPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(boardName, postNumber) {
    var _ref10 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref10.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            source = archived ? ArchivedReferringPosts : ReferringPosts;

            source.delete(boardName + ':' + postNumber);

          case 2:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function removeReferringPosts(_x33, _x34, _x35) {
    return ref.apply(this, arguments);
  };
}();

exports.replacePostLinks = replacePostLinks;
exports.replaceRelatedPostLinks = replaceRelatedPostLinks;
exports.replacePostReferences = replacePostReferences;
exports.replaceRelatedPostReferences = replaceRelatedPostReferences;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _posts = require('./posts');

var PostsModel = _interopRequireWildcard(_posts);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _sqlClientFactory = require('../storage/sql-client-factory');

var _sqlClientFactory2 = _interopRequireDefault(_sqlClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ArchivedReferringPosts = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedReferringPosts');
var ArchivedReferencedPosts = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedReferencedPosts');
var ReferringPosts = new _hash2.default((0, _redisClientFactory2.default)(), 'referringPosts');
var ReferencedPosts = new _hash2.default((0, _redisClientFactory2.default)(), 'referencedPosts');

function sortedReferences(references) {
  return (0, _underscore2.default)(references).toArray().sort(function (a, b) {
    return a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt) || a.boardName.localeCompare(b.boardName) || a.postNumber - b.postNumber;
  }).map(function (reference) {
    delete reference.createdAt;
    return reference;
  });
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

function replaceRelatedPostLinks(_ref6) {
  var text = _ref6.text;
  var sourceBoardName = _ref6.sourceBoardName;
  var targetBoardName = _ref6.targetBoardName;
  var postBoardName = _ref6.postBoardName;
  var referencedPosts = _ref6.referencedPosts;
  var postNumberMap = _ref6.postNumberMap;

  if (!text) {
    return text;
  }
  referencedPosts.filter(function (ref) {
    return postNumberMap.hasOwnProperty(ref.postNumber);
  }).forEach(function (ref) {
    var replacement = '>>/' + targetBoardName + '/' + postNumberMap[ref.postNumber];
    if (postBoardName === sourceBoardName) {
      text = text.replace(new RegExp('>>' + ref.postNumber, 'g'), replacement);
    }
    text = text.replace(new RegExp('>>/' + sourceBoardName + '/' + ref.postNumber, 'g'), replacement);
  });
  return text;
}

function replacePostReferences(references, source, target, postNumberMap, related) {
  var sourceBoardName = source.boardName;
  var sourceThreadNumber = source.threadNumber;
  var targetBoardName = target.boardName;
  var targetThreadNumber = target.threadNumber;
  return references.map(function (ref) {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber]
      };
    } else {
      related.push(ref);
      return ref;
    }
  });
}

function replaceRelatedPostReferences(references, source, target, postNumberMap) {
  var sourceBoardName = source.boardName;
  var sourceThreadNumber = source.threadNumber;
  var targetBoardName = target.boardName;
  var targetThreadNumber = target.threadNumber;
  return references.map(function (ref) {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber]
      };
    } else {
      return ref;
    }
  });
}
//# sourceMappingURL=post-references.js.map
