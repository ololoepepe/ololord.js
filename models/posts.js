'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processMovedThreadRelatedPosts = exports.processMovedThreadPosts = exports.rebuildSearchIndex = exports.rerenderPosts = exports.getPostFileCount = exports.deletePost = exports.editPost = exports.removePost = exports.createPost = exports.addReferencedPosts = exports.getPostKeys = exports.getPosts = exports.getPost = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

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

var addReferencedPosts = exports.addReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(post, referencedPosts) {
    var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var nogenerate = _ref2.nogenerate;
    var key;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            key = post.boardName + ':' + post.number;
            //TODO: Optimise (hmset)

            _context7.next = 3;
            return Tools.series(referencedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(ref, refKey) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return ReferencedPosts.setOne(refKey, ref, key);

                      case 2:
                        _context6.next = 4;
                        return ReferringPosts.setOne(key, {
                          boardName: post.boardName,
                          postNumber: post.number,
                          threadNumber: post.threadNumber,
                          createdAt: refKey.createdAt
                        }, refKey);

                      case 4:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x17, _x18) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
            if (!nogenerate) {
              (0, _underscore2.default)(referencedPosts).each(function (ref, refKey) {
                if (ref.boardName !== post.boardName || ref.threadNumber !== post.threadNumber) {
                  IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
                }
              });
            }

          case 4:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function addReferencedPosts(_x13, _x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var createPost = exports.createPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, fields, files, transaction) {
    var _ref3 = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

    var postNumber = _ref3.postNumber;
    var date = _ref3.date;
    var boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password, board, rawText, markupModes, referencedPosts, hashpass, thread, unbumpable, accessLevel, postCount, extraData, plainText, post;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            boardName = fields.boardName;
            threadNumber = fields.threadNumber;
            text = fields.text;
            markupMode = fields.markupMode;
            name = fields.name;
            subject = fields.subject;
            sage = fields.sage;
            signAsOp = fields.signAsOp;
            tripcode = fields.tripcode;
            password = fields.password;

            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
            board = _board2.default.board(boardName);

            if (board) {
              _context9.next = 15;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 15:
            if (board.postingEnabled) {
              _context9.next = 17;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled at this board'))));

          case 17:
            date = date || Tools.now();
            if (postNumber) {
              threadNumber = postNumber;
            }
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            tripcode = 'true' === tripcode;
            signAsOp = 'true' === signAsOp;
            password = Tools.sha1(password);
            hashpass = req.hashpass || null;
            _context9.next = 29;
            return ThreadsModel.getThread(boardName, threadNumber);

          case 29:
            thread = _context9.sent;

            if (thread) {
              _context9.next = 32;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('No such thread'))));

          case 32:
            if (!thread.closed) {
              _context9.next = 34;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled in this thread'))));

          case 34:
            unbumpable = !!thread.unbumpable;
            accessLevel = req.level(boardName) || null;
            _context9.next = 38;
            return ThreadsModel.getThreadPostCount(boardName, threadNumber);

          case 38:
            postCount = _context9.sent;

            if (!(postCount >= board.postLimit)) {
              _context9.next = 41;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Post limit reached'))));

          case 41:
            _context9.next = 43;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              referencedPosts: referencedPosts,
              accessLevel: accessLevel
            });

          case 43:
            text = _context9.sent;
            _context9.next = 46;
            return board.postExtraData(req, fields, files);

          case 46:
            extraData = _context9.sent;

            if (typeof extraData === 'undefined') {
              extraData = null;
            }

            if (postNumber) {
              _context9.next = 52;
              break;
            }

            _context9.next = 51;
            return BoardsModel.nextPostNumber(boardName);

          case 51:
            postNumber = _context9.sent;

          case 52:
            plainText = text ? Tools.plainText(text, { brToNewline: true }) : null;
            post = {
              bannedFor: false,
              boardName: boardName,
              createdAt: date.toISOString(),
              geolocation: req.geolocationInfo,
              markup: markupModes,
              name: name || null,
              number: postNumber,
              options: {
                sage: sage,
                showTripcode: !!req.hashpass && tripcode,
                signAsOp: signAsOp
              },
              rawText: rawText,
              subject: subject || null,
              text: text || null,
              plainText: plainText,
              threadNumber: threadNumber,
              updatedAt: null,
              user: {
                hashpass: hashpass,
                ip: req.ip,
                level: accessLevel,
                password: password
              }
            };

            transaction.setPostNumber(postNumber);
            _context9.next = 57;
            return Posts.setOne(boardName + ':' + postNumber, post);

          case 57:
            _context9.next = 59;
            return board.storeExtraData(postNumber, extraData);

          case 59:
            _context9.next = 61;
            return addReferencedPosts(post, referencedPosts);

          case 61:
            _context9.next = 63;
            return UsersModel.addUserPostNumber(req.ip, boardName, postNumber);

          case 63:
            _context9.next = 65;
            return Tools.series(files, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(file) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        file.boardName = boardName;
                        file.postNumber = postNumber;
                        _context8.next = 4;
                        return FilesModel.addFileInfo(file);

                      case 4:
                        _context8.next = 6;
                        return PostFileInfoNames.addOne(file.name, boardName + ':' + postNumber);

                      case 6:
                      case 'end':
                        return _context8.stop();
                    }
                  }
                }, _callee8, this);
              }));

              return function (_x25) {
                return ref.apply(this, arguments);
              };
            }());

          case 65:
            _context9.next = 67;
            return FilesModel.addFileHashes(files);

          case 67:
            _context9.next = 69;
            return Search.indexPost({
              boardName: boardName,
              postNumber: postNumber,
              threadNumber: threadNumber,
              plainText: plainText,
              subject: subject
            });

          case 69:
            _context9.next = 71;
            return ThreadsModel.addThreadPostNumber(boardName, threadNumber, postNumber);

          case 71:
            if (!(!sage && postCount < board.bumpLimit && !unbumpable)) {
              _context9.next = 74;
              break;
            }

            _context9.next = 74;
            return ThreadsModel.setThreadUpdateTime(boardName, threadNumber, date.toISOString());

          case 74:
            post.referencedPosts = referencedPosts;
            post.fileInfos = files;
            return _context9.abrupt('return', post);

          case 77:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function createPost(_x19, _x20, _x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}();

var removeReferencedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(_ref4) {
    var boardName = _ref4.boardName;
    var number = _ref4.number;
    var threadNumber = _ref4.threadNumber;

    var _ref5 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var nogenerate = _ref5.nogenerate;
    var key, referencedPosts;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            key = boardName + ':' + number;
            _context11.next = 3;
            return ReferencedPosts.getAll(key);

          case 3:
            referencedPosts = _context11.sent;
            _context11.next = 6;
            return Tools.series(referencedPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(ref, refKey) {
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        _context10.next = 2;
                        return ReferringPosts.deleteOne(key, refKey);

                      case 2:
                        return _context10.abrupt('return', _context10.sent);

                      case 3:
                      case 'end':
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function (_x29, _x30) {
                return ref.apply(this, arguments);
              };
            }());

          case 6:
            if (!nogenerate) {
              (0, _underscore2.default)(referencedPosts).filter(function (ref) {
                return ref.boardName !== boardName || ref.threadNumber !== threadNumber;
              }).forEach(function (ref) {
                IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
              });
            }
            ReferencedPosts.delete(key);

          case 8:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function removeReferencedPosts(_x26, _x27) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName, postNumber) {
    var _ref6 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var nogenerate = _ref6.nogenerate;
    var post, referencedPosts, text;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.next = 2;
            return getPost(boardName, postNumber);

          case 2:
            post = _context12.sent;

            if (post) {
              _context12.next = 5;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 5:
            referencedPosts = {};
            _context12.next = 8;
            return (0, _markup2.default)(boardName, post.rawText, {
              markupModes: post.markup,
              referencedPosts: referencedPosts,
              accessLevel: post.user.level
            });

          case 8:
            text = _context12.sent;

            post.text = text;
            _context12.next = 12;
            return Posts.setOne(boardName + ':' + postNumber, post);

          case 12:
            _context12.next = 14;
            return removeReferencedPosts(post, { nogenerate: nogenerate });

          case 14:
            _context12.next = 16;
            return addReferencedPosts(post, referencedPosts, { nogenerate: nogenerate });

          case 16:
            if (!nogenerate) {
              IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            }

          case 17:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function rerenderPost(_x31, _x32, _x33) {
    return ref.apply(this, arguments);
  };
}();

var rerenderReferringPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(_ref7) {
    var boardName = _ref7.boardName;
    var number = _ref7.number;
    var threadNumber = _ref7.threadNumber;

    var _ref8 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var removingThread = _ref8.removingThread;
    var referringPosts;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            referringPosts = ReferringPosts.getAll(boardName + ':' + number);

            referringPosts = (0, _underscore2.default)(referringPosts).filter(function (ref) {
              return !removingThread || ref.boardName !== boardName || ref.threadNumber !== threadNumber;
            });
            _context14.next = 4;
            return Tools.series(referringPosts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(ref) {
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                  while (1) {
                    switch (_context13.prev = _context13.next) {
                      case 0:
                        _context13.next = 2;
                        return rerenderPost(ref.boardName, ref.postNumber);

                      case 2:
                        return _context13.abrupt('return', _context13.sent);

                      case 3:
                      case 'end':
                        return _context13.stop();
                    }
                  }
                }, _callee13, this);
              }));

              return function (_x38) {
                return ref.apply(this, arguments);
              };
            }());

          case 4:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function rerenderReferringPosts(_x35, _x36) {
    return ref.apply(this, arguments);
  };
}();

var removePost = exports.removePost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(boardName, postNumber) {
    var _ref9 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var removingThread = _ref9.removingThread;
    var leaveReferences = _ref9.leaveReferences;
    var leaveFileInfos = _ref9.leaveFileInfos;
    var board, key, post, fileNames, fileInfos, paths;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context17.next = 3;
              break;
            }

            return _context17.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            key = boardName + ':' + postNumber;
            _context17.next = 6;
            return PostsPlannedForDeletion.addOne(key);

          case 6:
            _context17.next = 8;
            return getPost(boardName, postNumber, { withReferences: true });

          case 8:
            post = _context17.sent;
            _context17.next = 11;
            return ThreadsModel.removeThreadPostNumber(boardName, post.threadNumber, postNumber);

          case 11:
            _context17.next = 13;
            return Posts.deleteOne(key);

          case 13:
            if (leaveReferences) {
              _context17.next = 30;
              break;
            }

            _context17.prev = 14;
            _context17.next = 17;
            return rerenderReferringPosts(post, { removingThread: removingThread });

          case 17:
            _context17.next = 22;
            break;

          case 19:
            _context17.prev = 19;
            _context17.t0 = _context17['catch'](14);

            _logger2.default.error(_context17.t0.stack || _context17.t0);

          case 22:
            _context17.prev = 22;
            _context17.next = 25;
            return removeReferencedPosts(post);

          case 25:
            _context17.next = 30;
            break;

          case 27:
            _context17.prev = 27;
            _context17.t1 = _context17['catch'](22);

            _logger2.default.error(_context17.t1.stack || _context17.t1);

          case 30:
            _context17.next = 32;
            return UsersModel.removeUserPostNumber(post.user.ip, boardName, postNumber);

          case 32:
            if (leaveFileInfos) {
              _context17.next = 48;
              break;
            }

            _context17.next = 35;
            return PostFileInfoNames.getAll(key);

          case 35:
            fileNames = _context17.sent;
            _context17.next = 38;
            return Tools.series(fileNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(fileName) {
                return regeneratorRuntime.wrap(function _callee15$(_context15) {
                  while (1) {
                    switch (_context15.prev = _context15.next) {
                      case 0:
                        _context15.next = 2;
                        return FilesModel.getFileInfoByName(fileName);

                      case 2:
                        return _context15.abrupt('return', _context15.sent);

                      case 3:
                      case 'end':
                        return _context15.stop();
                    }
                  }
                }, _callee15, this);
              }));

              return function (_x43) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 38:
            fileInfos = _context17.sent;

            fileInfos = fileInfos.filter(function (fileInfo) {
              return !!fileInfo;
            });
            paths = fileInfos.map(function (fileInfo) {
              return [__dirname + '/../public/' + boardName + '/src/' + fileInfo.name, __dirname + '/../public/' + boardName + '/thumb/' + fileInfo.thumb.name];
            });
            _context17.next = 43;
            return PostFileInfoNames.delete(key);

          case 43:
            _context17.next = 45;
            return FilesModel.removeFileInfos(fileNames);

          case 45:
            _context17.next = 47;
            return FilesModel.removeFileHashes(fileInfos);

          case 47:
            Tools.series((0, _underscore2.default)(paths).flatten(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(path) {
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        _context16.prev = 0;
                        _context16.next = 3;
                        return FS.remove(path);

                      case 3:
                        _context16.next = 8;
                        break;

                      case 5:
                        _context16.prev = 5;
                        _context16.t0 = _context16['catch'](0);

                        _logger2.default.error(_context16.t0.stack || _context16.t0);

                      case 8:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this, [[0, 5]]);
              }));

              return function (_x44) {
                return ref.apply(this, arguments);
              };
            }());

          case 48:
            _context17.next = 50;
            return board.removeExtraData(postNumber);

          case 50:
            _context17.next = 52;
            return Search.removePostIndex(boardName, postNumber);

          case 52:
            _context17.next = 54;
            return PostsPlannedForDeletion.deleteOne(key);

          case 54:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this, [[14, 19], [22, 27]]);
  }));

  return function removePost(_x39, _x40, _x41) {
    return ref.apply(this, arguments);
  };
}();

var editPost = exports.editPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(req, fields) {
    var boardName, postNumber, text, name, subject, sage, markupMode, board, date, rawText, markupModes, referencedPosts, post, key, plainText, extraData;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            boardName = fields.boardName;
            postNumber = fields.postNumber;
            text = fields.text;
            name = fields.name;
            subject = fields.subject;
            sage = fields.sage;
            markupMode = fields.markupMode;
            board = _board2.default.board(boardName);

            if (board) {
              _context18.next = 10;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context18.next = 13;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 13:
            date = Tools.now();
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            _context18.next = 20;
            return getPost(boardName, postNumber, { withExtraData: true });

          case 20:
            post = _context18.sent;

            if (post) {
              _context18.next = 23;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post'))));

          case 23:
            /*
            return db.hget("threads:" + board.name, c.post.threadNumber);
            if (!thread)
                return Promise.reject(Tools.translate("No such thread"));
            */
            key = boardName + ':' + postNumber;
            _context18.next = 26;
            return (0, _markup2.default)(board.name, rawText, {
              markupModes: /*markupModes*/post.markup, //TODO ???
              referencedPosts: referencedPosts,
              accessLevel: req.level(board.name)
            });

          case 26:
            text = _context18.sent;
            plainText = text ? Tools.plainText(text, { brToNewline: true }) : null;
            _context18.next = 30;
            return board.postExtraData(req, fields, null, post);

          case 30:
            extraData = _context18.sent;

            //post.markup = markupModes; //TODO ???
            post.name = name || null;
            post.plainText = plainText;
            post.rawText = rawText;
            post.subject = subject || null;
            post.text = text || null;
            post.updatedAt = date.toISOString();
            //delete post.bannedFor; //TODO: WTF?
            _context18.next = 39;
            return Posts.setOne(key, post);

          case 39:
            _context18.next = 41;
            return board.removeExtraData(postNumber);

          case 41:
            _context18.next = 43;
            return board.storeExtraData(postNumber, extraData);

          case 43:
            _context18.next = 45;
            return removeReferencedPosts(post);

          case 45:
            _context18.next = 47;
            return addReferencedPosts(post, referencedPosts);

          case 47:
            _context18.next = 49;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.plainText = plainText;
              body.subject = subject;
              return body;
            });

          case 49:
            return _context18.abrupt('return', post);

          case 50:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function editPost(_x45, _x46) {
    return ref.apply(this, arguments);
  };
}();

var deletePost = exports.deletePost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(req, _ref10) {
    var boardName = _ref10.boardName;
    var postNumber = _ref10.postNumber;
    var archived = _ref10.archived;
    var board, post, isThread;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context20.next = 3;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context20.next = 6;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 6:
            _context20.next = 8;
            return getPost(boardName, postNumber);

          case 8:
            post = _context20.sent;

            if (post) {
              _context20.next = 11;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 11:
            isThread = post.threadNumber === post.number;

            archived = 'true' === archived;

            if (!(archived && !isThread)) {
              _context20.next = 15;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('Deleting posts from archived threads is not allowed'))));

          case 15:
            if (!isThread) {
              _context20.next = 20;
              break;
            }

            _context20.next = 18;
            return removeThread(boardName, postNumber, { archived: archived });

          case 18:
            _context20.next = 22;
            break;

          case 20:
            _context20.next = 22;
            return removePost(boardName, postNumber);

          case 22:
            if (!(isThread && archived)) {
              _context20.next = 29;
              break;
            }

            _context20.next = 25;
            return Tools.series(['json', 'html'], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(suffix) {
                return regeneratorRuntime.wrap(function _callee19$(_context19) {
                  while (1) {
                    switch (_context19.prev = _context19.next) {
                      case 0:
                        _context19.next = 2;
                        return FS.remove(__dirname + '/../public/' + boardName + '/arch/' + postNumber + '.' + suffix);

                      case 2:
                        return _context19.abrupt('return', _context19.sent);

                      case 3:
                      case 'end':
                        return _context19.stop();
                    }
                  }
                }, _callee19, this);
              }));

              return function (_x49) {
                return ref.apply(this, arguments);
              };
            }());

          case 25:
            _context20.next = 27;
            return IPC.renderArchive(boardName);

          case 27:
            _context20.next = 32;
            break;

          case 29:
            if (archived) {
              _context20.next = 32;
              break;
            }

            _context20.next = 32;
            return IPC.render(boardName, post.threadNumber, postNumber, isThread ? 'delete' : 'edit');

          case 32:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function deletePost(_x47, _x48) {
    return ref.apply(this, arguments);
  };
}();

var getPostFileCount = exports.getPostFileCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            _context21.next = 2;
            return PostFileInfoNames.count(boardName + ':' + postNumber);

          case 2:
            return _context21.abrupt('return', _context21.sent);

          case 3:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function getPostFileCount(_x50, _x51) {
    return ref.apply(this, arguments);
  };
}();

var forEachPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(targets, action) {
    var postKeys;
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            if (!((typeof targets === 'undefined' ? 'undefined' : _typeof(targets)) !== 'object')) {
              _context24.next = 2;
              break;
            }

            return _context24.abrupt('return');

          case 2:
            if ((0, _underscore2.default)(targets).toArray().length <= 0) {
              targets = _board2.default.boardNames();
            }
            if ((0, _underscore2.default)(targets).isArray()) {
              targets = targets.reduce(function (acc, boardName) {
                acc[boardName] = '*';
                return acc;
              }, {});
            }
            _context24.next = 6;
            return Posts.keys();

          case 6:
            postKeys = _context24.sent;

            postKeys = postKeys.reduce(function (acc, key) {
              var _key$split = key.split(':');

              var _key$split2 = _slicedToArray(_key$split, 2);

              var boardName = _key$split2[0];
              var postNumber = _key$split2[1];

              var set = acc.get(boardName);
              if (!set) {
                set = new Set();
                acc.set(boardName, set);
              }
              set.add(+postNumber);
              return acc;
            }, new Map());
            _context24.next = 10;
            return Tools.series(targets, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(postNumbers, boardName) {
                var set;
                return regeneratorRuntime.wrap(function _callee23$(_context23) {
                  while (1) {
                    switch (_context23.prev = _context23.next) {
                      case 0:
                        if (!(typeof postNumbers !== 'string' && !(0, _underscore2.default)(postNumbers).isArray())) {
                          _context23.next = 2;
                          break;
                        }

                        return _context23.abrupt('return');

                      case 2:
                        if (_board2.default.board(boardName)) {
                          _context23.next = 5;
                          break;
                        }

                        _logger2.default.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
                        return _context23.abrupt('return');

                      case 5:
                        set = postKeys.get(boardName);

                        if ('*' === postNumbers) {
                          postNumbers = set ? Array.from(set) : [];
                        } else {
                          postNumbers = set ? postNumbers.filter(function (postNumber) {
                            return set.has(postNumber);
                          }) : [];
                        }
                        _context23.next = 9;
                        return Tools.series(postNumbers, function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(postNumber) {
                            return regeneratorRuntime.wrap(function _callee22$(_context22) {
                              while (1) {
                                switch (_context22.prev = _context22.next) {
                                  case 0:
                                    _context22.prev = 0;
                                    _context22.next = 3;
                                    return action(boardName, postNumber);

                                  case 3:
                                    return _context22.abrupt('return', _context22.sent);

                                  case 6:
                                    _context22.prev = 6;
                                    _context22.t0 = _context22['catch'](0);

                                    _logger2.default.error(_context22.t0.stack || _context22.t0);

                                  case 9:
                                  case 'end':
                                    return _context22.stop();
                                }
                              }
                            }, _callee22, this, [[0, 6]]);
                          }));

                          return function (_x56) {
                            return ref.apply(this, arguments);
                          };
                        }());

                      case 9:
                        return _context23.abrupt('return', _context23.sent);

                      case 10:
                      case 'end':
                        return _context23.stop();
                    }
                  }
                }, _callee23, this);
              }));

              return function (_x54, _x55) {
                return ref.apply(this, arguments);
              };
            }());

          case 10:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function forEachPost(_x52, _x53) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPosts = exports.rerenderPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(targets) {
    return regeneratorRuntime.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            _context26.next = 2;
            return forEachPost(targets, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(boardName, postNumber) {
                return regeneratorRuntime.wrap(function _callee25$(_context25) {
                  while (1) {
                    switch (_context25.prev = _context25.next) {
                      case 0:
                        console.log(Tools.translate('Rendering post: >>/$[1]/$[2]', '', boardName, postNumber));
                        _context25.next = 3;
                        return rerenderPost(boardName, postNumber, { nogenerate: true });

                      case 3:
                        return _context25.abrupt('return', _context25.sent);

                      case 4:
                      case 'end':
                        return _context25.stop();
                    }
                  }
                }, _callee25, this);
              }));

              return function (_x58, _x59) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            return _context26.abrupt('return', _context26.sent);

          case 3:
          case 'end':
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function rerenderPosts(_x57) {
    return ref.apply(this, arguments);
  };
}();

var rebuildPostSearchIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(boardName, postNumber, threads) {
    var key, post, threadNumber, threadKey, thread;
    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            threads = threads || new Map();
            key = boardName + ':' + postNumber;
            _context27.next = 4;
            return getPost(boardName, postNumber);

          case 4:
            post = _context27.sent;
            threadNumber = post.threadNumber;
            threadKey = boardName + ':' + threadNumber;
            thread = threads.get(threadKey);

            if (thread) {
              _context27.next = 15;
              break;
            }

            _context27.next = 11;
            return ThreadsModel.getThread(boardName, threadNumber);

          case 11:
            thread = _context27.sent;

            if (thread) {
              _context27.next = 14;
              break;
            }

            return _context27.abrupt('return', Promise.reject(new Error(Tools.translate('No such thread: >>/$[1]/$[2]', '', boardName, threadNumber))));

          case 14:
            threads.set(threadKey, thread);

          case 15:
            _context27.next = 17;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.plainText = post.plainText;
              body.subject = post.subject;
              body.archived = !!thread.archived;
              return body;
            });

          case 17:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function rebuildPostSearchIndex(_x60, _x61, _x62) {
    return ref.apply(this, arguments);
  };
}();

var rebuildSearchIndex = exports.rebuildSearchIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee29(targets) {
    var threads;
    return regeneratorRuntime.wrap(function _callee29$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            threads = new Map();
            _context29.next = 3;
            return forEachPost(targets || {}, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee28(boardName, postNumber) {
                return regeneratorRuntime.wrap(function _callee28$(_context28) {
                  while (1) {
                    switch (_context28.prev = _context28.next) {
                      case 0:
                        console.log(Tools.translate('Rebuilding post search index: >>/$[1]/$[2]', '', boardName, postNumber));
                        _context28.next = 3;
                        return rebuildPostSearchIndex(boardName, postNumber, threads);

                      case 3:
                        return _context28.abrupt('return', _context28.sent);

                      case 4:
                      case 'end':
                        return _context28.stop();
                    }
                  }
                }, _callee28, this);
              }));

              return function (_x64, _x65) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
            return _context29.abrupt('return', _context29.sent);

          case 4:
          case 'end':
            return _context29.stop();
        }
      }
    }, _callee29, this);
  }));

  return function rebuildSearchIndex(_x63) {
    return ref.apply(this, arguments);
  };
}();

var processMovedThreadPostReferences = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee31(_ref11) {
    var references = _ref11.references;
    var entity = _ref11.entity;
    var sourceBoardName = _ref11.sourceBoardName;
    var targetBoardName = _ref11.targetBoardName;
    var threadNumber = _ref11.threadNumber;
    var postNumberMap = _ref11.postNumberMap;
    var toRerender = _ref11.toRerender;
    var toUpdate = _ref11.toUpdate;
    return regeneratorRuntime.wrap(function _callee31$(_context31) {
      while (1) {
        switch (_context31.prev = _context31.next) {
          case 0:
            _context31.next = 2;
            return Tools.series(references, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee30(ref) {
                var nref;
                return regeneratorRuntime.wrap(function _callee30$(_context30) {
                  while (1) {
                    switch (_context30.prev = _context30.next) {
                      case 0:
                        nref = void 0;

                        if (ref.boardName === sourceBoardName && ref.threadNumber === threadNumber) {
                          nref = {
                            boardName: targetBoardName,
                            threadNumber: post.threadNumber,
                            postNumber: postNumberMap[ref.postNumber]
                          };
                        } else {
                          nref = ref;
                          toUpdate[ref.boardName + ':' + ref.threadNumber] = {
                            boardName: ref.boardName,
                            threadNumber: ref.threadNumber
                          };
                          if (toRerender) {
                            toRerender[ref.boardName + ':' + ref.postNumber] = {
                              boardName: ref.boardName,
                              postNumber: ref.postNumber
                            };
                          }
                        }
                        _context30.next = 4;
                        return entity.deleteOne(ref.boardName + ':' + ref.postNumber, sourceBoardName + ':' + oldPostNumber);

                      case 4:
                        _context30.next = 6;
                        return entity.setOne(nref.boardName + ':' + nref.postNumber, targetBoard.name + ':' + post.number, nref);

                      case 6:
                      case 'end':
                        return _context30.stop();
                    }
                  }
                }, _callee30, this);
              }));

              return function (_x67) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
          case 'end':
            return _context31.stop();
        }
      }
    }, _callee31, this);
  }));

  return function processMovedThreadPostReferences(_x66) {
    return ref.apply(this, arguments);
  };
}();

var processMovedThreadPosts = exports.processMovedThreadPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee34(_ref12) {
    var posts = _ref12.posts;
    var postNumberMap = _ref12.postNumberMap;
    var threadNumber = _ref12.threadNumber;
    var targetBoard = _ref12.targetBoard;
    var sourceBoardName = _ref12.sourceBoardName;
    var sourcePath = _ref12.sourcePath;
    var sourceThumbPath = _ref12.sourceThumbPath;
    var targetPath = _ref12.targetPath;
    var targetThumbPath = _ref12.targetThumbPath;
    var toRerender, toUpdate;
    return regeneratorRuntime.wrap(function _callee34$(_context34) {
      while (1) {
        switch (_context34.prev = _context34.next) {
          case 0:
            toRerender = {};
            toUpdate = {};
            _context34.next = 4;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee33(post) {
                var oldPostNumber, referencedPosts, extraData, referringPosts, fileInfos;
                return regeneratorRuntime.wrap(function _callee33$(_context33) {
                  while (1) {
                    switch (_context33.prev = _context33.next) {
                      case 0:
                        oldPostNumber = post.number;

                        post.number = postNumberMap.get(post.number);
                        post.threadNumber = threadNumber;
                        post.boardName = targetBoard.name;
                        referencedPosts = post.referencedPosts;

                        delete post.referencedPosts;
                        extraData = post.extraData;

                        delete post.extraData;
                        referringPosts = post.referringPosts;

                        delete post.referringPosts;
                        fileInfos = post.fileInfos;

                        delete post.fileInfos;
                        if (post.rawText) {
                          (0, _underscore2.default)(postNumberMap).each(function (newPostNumber, previousPostNumber) {
                            var rx = new RegExp('>>/' + sourceBoardName + '/' + previousPostNumber, 'g');
                            post.rawText = post.rawText.replace(rx, '>>/' + targetBoard.name + '/' + newPostNumber);
                            rx = new RegExp('>>' + previousPostNumber, 'g');
                            post.rawText = post.rawText.replace(rx, '>>' + newPostNumber);
                          });
                          referencedPosts.filter(function (ref) {
                            return ref.boardName === sourceBoardName;
                          }).forEach(function (ref) {
                            var rx = new RegExp('>>' + ref.postNumber, 'g');
                            post.rawText = post.rawText.replace(rx, '>>/' + sourceBoardName + '/' + ref.postNumber);
                          });
                        }

                        if (!post.rawText) {
                          _context33.next = 17;
                          break;
                        }

                        _context33.next = 16;
                        return (0, _markup2.default)(targetBoard.name, post.rawText, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 16:
                        post.text = _context33.sent;

                      case 17:
                        _context33.next = 19;
                        return Posts.setOne(targetBoard.name + ':' + post.number, post);

                      case 19:
                        _context33.next = 21;
                        return targetBoard.storeExtraData(post.number, extraData);

                      case 21:
                        _context33.next = 23;
                        return processMovedThreadPostReferences({
                          references: referencedPosts,
                          entity: ReferencedPosts,
                          sourceBoardName: sourceBoardName,
                          targetBoardName: targetBoard.name,
                          threadNumber: threadNumber,
                          postNumberMap: postNumberMap,
                          toUpdate: toUpdate
                        });

                      case 23:
                        _context33.next = 25;
                        return processMovedThreadPostReferences({
                          references: referringPosts,
                          entity: ReferringPosts,
                          sourceBoardName: sourceBoardName,
                          targetBoardName: targetBoard.name,
                          threadNumber: threadNumber,
                          postNumberMap: postNumberMap,
                          toRerender: toRerender,
                          toUpdate: toUpdate
                        });

                      case 25:
                        _context33.next = 27;
                        return UsersModel.addUserPostNumber(post.user.ip, targetBoard.name, post.number);

                      case 27:
                        _context33.next = 29;
                        return FilesModel.addFilesToPost(targetBoard.name, post.number, fileInfos);

                      case 29:
                        _context33.next = 31;
                        return Tools.series(fileInfos, function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee32(fileInfo) {
                            return regeneratorRuntime.wrap(function _callee32$(_context32) {
                              while (1) {
                                switch (_context32.prev = _context32.next) {
                                  case 0:
                                    _context32.next = 2;
                                    return FS.move(sourcePath + '/' + fileInfo.name, targetPath + '/' + fileInfo.name);

                                  case 2:
                                    _context32.next = 4;
                                    return FS.move(sourceThumbPath + '/' + fileInfo.thumb.name, targetThumbPath + '/' + fileInfo.thumb.name);

                                  case 4:
                                  case 'end':
                                    return _context32.stop();
                                }
                              }
                            }, _callee32, this);
                          }));

                          return function (_x70) {
                            return ref.apply(this, arguments);
                          };
                        }());

                      case 31:
                        _context33.next = 33;
                        return Search.indexPost(targetBoard.name, post.number, threadNumber, post.plainText, post.subject);

                      case 33:
                      case 'end':
                        return _context33.stop();
                    }
                  }
                }, _callee33, this);
              }));

              return function (_x69) {
                return ref.apply(this, arguments);
              };
            }());

          case 4:
            return _context34.abrupt('return', {
              toRerender: toRerender,
              toUpdate: toUpdate
            });

          case 5:
          case 'end':
            return _context34.stop();
        }
      }
    }, _callee34, this);
  }));

  return function processMovedThreadPosts(_x68) {
    return ref.apply(this, arguments);
  };
}();

var processMovedThreadRelatedPosts = exports.processMovedThreadRelatedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee36(_ref13) {
    var posts = _ref13.posts;
    var sourceBoardName = _ref13.sourceBoardName;
    var postNumberMap = _ref13.postNumberMap;
    return regeneratorRuntime.wrap(function _callee36$(_context36) {
      while (1) {
        switch (_context36.prev = _context36.next) {
          case 0:
            _context36.next = 2;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee35(post) {
                return regeneratorRuntime.wrap(function _callee35$(_context35) {
                  while (1) {
                    switch (_context35.prev = _context35.next) {
                      case 0:
                        _context35.next = 2;
                        return PostsModel.getPost(post.boardName, post.postNumber);

                      case 2:
                        post = _context35.sent;

                        if (post.rawText) {
                          _context35.next = 5;
                          break;
                        }

                        return _context35.abrupt('return');

                      case 5:
                        (0, _underscore2.default)(postNumberMap).each(function (newPostNumber, previousPostNumber) {
                          var rx = new RegExp('>>/' + sourceBoardName + '/' + previousPostNumber, 'g');
                          post.rawText = post.rawText.replace(rx, '>>/' + targetBoardName + '/' + newPostNumber);
                          if (post.boardName === sourceBoardName) {
                            rx = new RegExp('>>' + previousPostNumber, 'g');
                            post.rawText = post.rawText.replace(rx, '>>/' + targetBoardName + '/' + newPostNumber);
                          }
                        });
                        _context35.next = 8;
                        return (0, _markup2.default)(post.boardName, post.rawText, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 8:
                        post.text = _context35.sent;
                        _context35.next = 11;
                        return Posts.setOne(post.boardName + ':' + post.number, post);

                      case 11:
                      case 'end':
                        return _context35.stop();
                    }
                  }
                }, _callee35, this);
              }));

              return function (_x72) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
          case 'end':
            return _context36.stop();
        }
      }
    }, _callee36, this);
  }));

  return function processMovedThreadRelatedPosts(_x71) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _boards = require('./boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _files = require('./files');

var FilesModel = _interopRequireWildcard(_files);

var _threads = require('./threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _users = require('./users');

var UsersModel = _interopRequireWildcard(_users);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _search = require('../core/search');

var Search = _interopRequireWildcard(_search);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _markup = require('../markup');

var _markup2 = _interopRequireDefault(_markup);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var FileInfos = new _hash2.default((0, _redisClientFactory2.default)(), 'fileInfos');
var PostFileInfoNames = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});
var Posts = new _hash2.default((0, _redisClientFactory2.default)(), 'posts');
var PostsPlannedForDeletion = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'postsPlannedForDeletion', {
  parse: false,
  stringify: false
});
var ReferringPosts = new _hash2.default((0, _redisClientFactory2.default)(), 'referringPosts');
var ReferencedPosts = new _hash2.default((0, _redisClientFactory2.default)(), 'referencedPosts');
var UserBans = new _key2.default((0, _redisClientFactory2.default)(), 'userBans');

function sortedReferences(references) {
  return (0, _underscore2.default)(references).toArray().sort(function (a, b) {
    return a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt) || a.boardName.localeCompare(b.boardName) || a.postNumber - b.postNumber;
  }).map(function (reference) {
    delete reference.createdAt;
    return reference;
  });
}
//# sourceMappingURL=posts.js.map
