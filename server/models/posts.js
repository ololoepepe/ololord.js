'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pushPostToArchive = exports.rerenderMovedThreadRelatedPosts = exports.copyPosts = exports.rebuildSearchIndex = exports.rerenderPosts = exports.deletePost = exports.editPost = exports.removePost = exports.createPost = exports.getPostKeys = exports.getPosts = exports.getPost = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var addDataToPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(board, post) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var withExtraData = _ref.withExtraData;
    var withFileInfos = _ref.withFileInfos;
    var withReferences = _ref.withReferences;
    var ban, extraData;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return UserBans.get(post.user.ip + ':' + post.boardName);

          case 2:
            ban = _context.sent;

            post.bannedFor = !!(ban && ban.postNumber === post.number);

            if (!withExtraData) {
              _context.next = 9;
              break;
            }

            _context.next = 7;
            return board.loadExtraData(post.number, !!post.archived);

          case 7:
            extraData = _context.sent;

            post.extraData = extraData;

          case 9:
            if (!withFileInfos) {
              _context.next = 13;
              break;
            }

            _context.next = 12;
            return FilesModel.getPostFileInfos(post.boardName, post.number, { archived: post.archived });

          case 12:
            post.fileInfos = _context.sent;

          case 13:
            if (!withReferences) {
              _context.next = 16;
              break;
            }

            _context.next = 16;
            return PostReferencesModel.addReferencesToPost(post);

          case 16:
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
              _context2.next = 14;
              break;
            }

            _context2.next = 13;
            return ArchivedPosts.getOne(key);

          case 13:
            post = _context2.sent;

          case 14:
            if (post) {
              _context2.next = 16;
              break;
            }

            return _context2.abrupt('return', post);

          case 16:
            _context2.next = 18;
            return ThreadsModel.getThreadPostNumbers(boardName, post.threadNumber);

          case 18:
            threadPostNumbers = _context2.sent;

            post.sequenceNumber = threadPostNumbers.indexOf(post.number) + 1;
            _context2.next = 22;
            return addDataToPost(board, post, options);

          case 22:
            return _context2.abrupt('return', post);

          case 23:
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
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, postNumbers, options) {
    var board, posts, mayBeArchivedPostNumbers, numbers, archivedPosts, uniqueThreadNumbers, threadsPostNumbers;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

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
              _context5.next = 7;
              break;
            }

            return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 7:
            _context5.next = 9;
            return Posts.getSome(postNumbers.map(function (postNumber) {
              return boardName + ':' + postNumber;
            }));

          case 9:
            posts = _context5.sent;

            posts = (0, _underscore2.default)(posts).toArray();
            mayBeArchivedPostNumbers = posts.map(function (post, index) {
              return {
                post: post,
                index: index
              };
            }).filter(function (post) {
              return !post.post;
            }).map(function (post) {
              return {
                index: post.index,
                postNumber: postNumbers[post.index]
              };
            });

            if (!(mayBeArchivedPostNumbers.length > 0)) {
              _context5.next = 18;
              break;
            }

            numbers = mayBeArchivedPostNumbers.map(function (post) {
              return post.postNumber;
            });
            _context5.next = 16;
            return ArchivedPosts.getSome(numbers.map(function (postNumber) {
              return boardName + ':' + postNumber;
            }));

          case 16:
            archivedPosts = _context5.sent;

            archivedPosts.forEach(function (post, index) {
              posts[mayBeArchivedPostNumbers[index].index] = post;
            });

          case 18:
            if (!(posts.length <= 0)) {
              _context5.next = 20;
              break;
            }

            return _context5.abrupt('return', []);

          case 20:
            uniqueThreadNumbers = (0, _underscore2.default)(posts.map(function (post) {
              return post.threadNumber;
            })).uniq();
            _context5.next = 23;
            return Tools.series(uniqueThreadNumbers, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(threadNumber) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.next = 2;
                        return ThreadsModel.getThreadPostNumbers(boardName, threadNumber);

                      case 2:
                        return _context3.abrupt('return', _context3.sent);

                      case 3:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x11) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 23:
            threadsPostNumbers = _context5.sent;

            threadsPostNumbers = threadsPostNumbers.reduce(function (acc, list, index) {
              acc[uniqueThreadNumbers[index]] = list;
              return acc;
            }, {});
            _context5.next = 27;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(post, index) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        if (post) {
                          _context4.next = 2;
                          break;
                        }

                        return _context4.abrupt('return');

                      case 2:
                        post.sequenceNumber = threadsPostNumbers[post.threadNumber].indexOf(post.number) + 1;
                        _context4.next = 5;
                        return addDataToPost(board, post, options);

                      case 5:
                      case 'end':
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function (_x12, _x13) {
                return ref.apply(this, arguments);
              };
            }());

          case 27:
            return _context5.abrupt('return', posts);

          case 28:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getPosts(_x8, _x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var getPostKeys = exports.getPostKeys = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
    var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var archived = _ref2.archived;
    var nonArchived = _ref2.nonArchived;
    var archivedKeys, nonArchivedKeys;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            archivedKeys = [];
            nonArchivedKeys = [];

            if (!archived) {
              _context6.next = 6;
              break;
            }

            _context6.next = 5;
            return ArchivedPosts.keys();

          case 5:
            archivedKeys = _context6.sent;

          case 6:
            if (!(nonArchived || !archived && !nonArchived)) {
              _context6.next = 10;
              break;
            }

            _context6.next = 9;
            return Posts.keys();

          case 9:
            nonArchivedKeys = _context6.sent;

          case 10:
            return _context6.abrupt('return', nonArchivedKeys.concat(archivedKeys));

          case 11:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function getPostKeys(_x14) {
    return ref.apply(this, arguments);
  };
}();

var createPost = exports.createPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, fields, files, transaction) {
    var _ref3 = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

    var postNumber = _ref3.postNumber;
    var date = _ref3.date;
    var boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password, board, rawText, markupModes, referencedPosts, hashpass, thread, unbumpable, accessLevel, postCount, extraData, plainText, post;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
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
              _context7.next = 15;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 15:
            if (board.postingEnabled) {
              _context7.next = 17;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled at this board'))));

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
            _context7.next = 29;
            return ThreadsModel.getThread(boardName, threadNumber);

          case 29:
            thread = _context7.sent;

            if (thread) {
              _context7.next = 32;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('No such thread'))));

          case 32:
            if (!thread.closed) {
              _context7.next = 34;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('Posting is disabled in this thread'))));

          case 34:
            unbumpable = !!thread.unbumpable;
            accessLevel = req.level(boardName) || null;
            _context7.next = 38;
            return ThreadsModel.getThreadPostCount(boardName, threadNumber);

          case 38:
            postCount = _context7.sent;

            if (!(postCount >= board.postLimit)) {
              _context7.next = 41;
              break;
            }

            return _context7.abrupt('return', Promise.reject(new Error(Tools.translate('Post limit reached'))));

          case 41:
            _context7.next = 43;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              referencedPosts: referencedPosts,
              accessLevel: accessLevel
            });

          case 43:
            text = _context7.sent;
            _context7.next = 46;
            return board.postExtraData(req, fields, files);

          case 46:
            extraData = _context7.sent;

            if (typeof extraData === 'undefined') {
              extraData = null;
            }

            if (postNumber) {
              _context7.next = 52;
              break;
            }

            _context7.next = 51;
            return BoardsModel.nextPostNumber(boardName);

          case 51:
            postNumber = _context7.sent;

          case 52:
            plainText = text ? Renderer.plainText(text, { brToNewline: true }) : null;
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
            _context7.next = 57;
            return Posts.setOne(boardName + ':' + postNumber, post);

          case 57:
            _context7.next = 59;
            return board.storeExtraData(postNumber, extraData, false);

          case 59:
            _context7.next = 61;
            return PostReferencesModel.addReferencedPosts(post, referencedPosts);

          case 61:
            _context7.next = 63;
            return UsersModel.addUserPostNumber(req.ip, boardName, postNumber);

          case 63:
            _context7.next = 65;
            return FilesModel.addFilesToPost(boardName, postNumber, files);

          case 65:
            _context7.next = 67;
            return Search.indexPost({
              boardName: boardName,
              postNumber: postNumber,
              threadNumber: threadNumber,
              plainText: plainText,
              subject: subject
            });

          case 67:
            _context7.next = 69;
            return ThreadsModel.addThreadPostNumber(boardName, threadNumber, postNumber);

          case 69:
            if (!(!sage && postCount < board.bumpLimit && !unbumpable)) {
              _context7.next = 72;
              break;
            }

            _context7.next = 72;
            return ThreadsModel.setThreadUpdateTime(boardName, threadNumber, date.toISOString());

          case 72:
            post.referencedPosts = referencedPosts;
            post.fileInfos = files;
            return _context7.abrupt('return', post);

          case 75:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function createPost(_x16, _x17, _x18, _x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(boardName, postNumber) {
    var _ref4 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var nogenerate = _ref4.nogenerate;
    var post, referencedPosts, text, source;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return getPost(boardName, postNumber);

          case 2:
            post = _context8.sent;

            if (post) {
              _context8.next = 5;
              break;
            }

            return _context8.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 5:
            referencedPosts = {};
            _context8.next = 8;
            return (0, _markup2.default)(boardName, post.rawText, {
              markupModes: post.markup,
              referencedPosts: referencedPosts,
              accessLevel: post.user.level
            });

          case 8:
            text = _context8.sent;

            post.text = text;
            source = post.archived ? ArchivedPosts : Posts;
            _context8.next = 13;
            return source.setOne(boardName + ':' + postNumber, post);

          case 13:
            _context8.next = 15;
            return PostReferencesModel.removeReferencedPosts(post, { nogenerate: nogenerate });

          case 15:
            _context8.next = 17;
            return PostReferencesModel.addReferencedPosts(post, referencedPosts, {
              nogenerate: nogenerate,
              archived: post.archived
            });

          case 17:
            if (!nogenerate) {
              IPC.render(boardName, post.threadNumber, postNumber, 'edit');
            }

          case 18:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function rerenderPost(_x22, _x23, _x24) {
    return ref.apply(this, arguments);
  };
}();

var removePost = exports.removePost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName, postNumber) {
    var _ref5 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var removingThread = _ref5.removingThread;
    var board, key, post, source;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context9.next = 3;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            key = boardName + ':' + postNumber;
            _context9.next = 6;
            return PostsPlannedForDeletion.addOne(key);

          case 6:
            _context9.next = 8;
            return getPost(boardName, postNumber, { withReferences: true });

          case 8:
            post = _context9.sent;
            _context9.next = 11;
            return ThreadsModel.removeThreadPostNumber(boardName, post.threadNumber, postNumber, { archived: post.archived });

          case 11:
            source = post.archived ? ArchivedPosts : Posts;
            _context9.next = 14;
            return source.deleteOne(key);

          case 14:
            _context9.prev = 14;
            _context9.next = 17;
            return PostReferencesModel.rerenderReferringPosts(post, { removingThread: removingThread });

          case 17:
            _context9.next = 22;
            break;

          case 19:
            _context9.prev = 19;
            _context9.t0 = _context9['catch'](14);

            _logger2.default.error(_context9.t0.stack || _context9.t0);

          case 22:
            _context9.prev = 22;
            _context9.next = 25;
            return PostReferencesModel.removeReferencedPosts(post);

          case 25:
            _context9.next = 30;
            break;

          case 27:
            _context9.prev = 27;
            _context9.t1 = _context9['catch'](22);

            _logger2.default.error(_context9.t1.stack || _context9.t1);

          case 30:
            _context9.next = 32;
            return UsersModel.removeUserPostNumber(post.user.ip, boardName, postNumber);

          case 32:
            _context9.next = 34;
            return FilesModel.removePostFileInfos(boardName, postNumber, { archived: post.archived });

          case 34:
            _context9.next = 36;
            return board.removeExtraData(postNumber, !!post.archived);

          case 36:
            _context9.next = 38;
            return Search.removePostIndex(boardName, postNumber);

          case 38:
            _context9.next = 40;
            return PostsPlannedForDeletion.deleteOne(key);

          case 40:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this, [[14, 19], [22, 27]]);
  }));

  return function removePost(_x26, _x27, _x28) {
    return ref.apply(this, arguments);
  };
}();

var editPost = exports.editPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(req, fields) {
    var boardName, postNumber, text, name, subject, sage, markupMode, board, date, rawText, markupModes, referencedPosts, post, key, plainText, extraData, source;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
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
              _context10.next = 10;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context10.next = 13;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 13:
            date = Tools.now();
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            _context10.next = 20;
            return getPost(boardName, postNumber, { withExtraData: true });

          case 20:
            post = _context10.sent;

            if (post) {
              _context10.next = 23;
              break;
            }

            return _context10.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post'))));

          case 23:
            key = boardName + ':' + postNumber;
            _context10.next = 26;
            return (0, _markup2.default)(board.name, rawText, {
              markupModes: markupModes,
              referencedPosts: referencedPosts,
              accessLevel: req.level(board.name)
            });

          case 26:
            text = _context10.sent;
            plainText = text ? Renderer.plainText(text, { brToNewline: true }) : null;
            _context10.next = 30;
            return board.postExtraData(req, fields, null, post);

          case 30:
            extraData = _context10.sent;

            if (post.hasOwnProperty('extraData')) {
              delete post.extraData;
            }
            if (post.hasOwnProperty('bannedFor')) {
              delete post.bannedFor;
            }
            post.markup = markupModes;
            post.name = name || null;
            post.plainText = plainText;
            post.rawText = rawText;
            post.subject = subject || null;
            post.text = text || null;
            post.updatedAt = date.toISOString();
            source = post.archived ? ArchivedPosts : Posts;
            _context10.next = 43;
            return source.setOne(key, post);

          case 43:
            _context10.next = 45;
            return board.removeExtraData(postNumber, !!post.archived);

          case 45:
            _context10.next = 47;
            return board.storeExtraData(postNumber, extraData, !!post.archived);

          case 47:
            _context10.next = 49;
            return PostReferencesModel.removeReferencedPosts(post);

          case 49:
            _context10.next = 51;
            return PostReferencesModel.addReferencedPosts(post, referencedPosts, { archived: post.archived });

          case 51:
            _context10.next = 53;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.plainText = plainText;
              body.subject = subject;
              return body;
            });

          case 53:
            return _context10.abrupt('return', post);

          case 54:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function editPost(_x30, _x31) {
    return ref.apply(this, arguments);
  };
}();

var deletePost = exports.deletePost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(req, _ref6) {
    var boardName = _ref6.boardName;
    var postNumber = _ref6.postNumber;
    var archived = _ref6.archived;
    var board, post, isThread;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context12.next = 3;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context12.next = 6;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid post number'))));

          case 6:
            _context12.next = 8;
            return getPost(boardName, postNumber);

          case 8:
            post = _context12.sent;

            if (post) {
              _context12.next = 11;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('No such post'))));

          case 11:
            isThread = post.threadNumber === post.number;

            archived = 'true' === archived;

            if (!(archived && !isThread)) {
              _context12.next = 15;
              break;
            }

            return _context12.abrupt('return', Promise.reject(new Error(Tools.translate('Deleting posts from archived threads is not allowed'))));

          case 15:
            if (!isThread) {
              _context12.next = 20;
              break;
            }

            _context12.next = 18;
            return ThreadsModel.removeThread(boardName, postNumber, { archived: archived });

          case 18:
            _context12.next = 22;
            break;

          case 20:
            _context12.next = 22;
            return removePost(boardName, postNumber);

          case 22:
            if (!(isThread && archived)) {
              _context12.next = 29;
              break;
            }

            _context12.next = 25;
            return Tools.series(['json', 'html'], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(suffix) {
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.next = 2;
                        return _fs2.default.remove(__dirname + '/../../public/' + boardName + '/arch/' + postNumber + '.' + suffix);

                      case 2:
                        return _context11.abrupt('return', _context11.sent);

                      case 3:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x34) {
                return ref.apply(this, arguments);
              };
            }());

          case 25:
            _context12.next = 27;
            return IPC.renderArchive(boardName);

          case 27:
            _context12.next = 32;
            break;

          case 29:
            if (archived) {
              _context12.next = 32;
              break;
            }

            _context12.next = 32;
            return IPC.render(boardName, post.threadNumber, postNumber, isThread ? 'delete' : 'edit');

          case 32:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function deletePost(_x32, _x33) {
    return ref.apply(this, arguments);
  };
}();

var forEachPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(targets, action) {
    var postKeys;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            if (!((typeof targets === 'undefined' ? 'undefined' : _typeof(targets)) !== 'object')) {
              _context15.next = 2;
              break;
            }

            return _context15.abrupt('return');

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
            _context15.next = 6;
            return getPostKeys({
              archived: true,
              nonArchived: true
            });

          case 6:
            postKeys = _context15.sent;

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
            _context15.next = 10;
            return Tools.series(targets, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(postNumbers, boardName) {
                var set;
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        if (!(typeof postNumbers !== 'string' && !(0, _underscore2.default)(postNumbers).isArray())) {
                          _context14.next = 2;
                          break;
                        }

                        return _context14.abrupt('return');

                      case 2:
                        if (_board2.default.board(boardName)) {
                          _context14.next = 5;
                          break;
                        }

                        _logger2.default.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
                        return _context14.abrupt('return');

                      case 5:
                        set = postKeys.get(boardName);

                        if ('*' === postNumbers) {
                          postNumbers = set ? Array.from(set) : [];
                        } else {
                          postNumbers = set ? postNumbers.filter(function (postNumber) {
                            return set.has(postNumber);
                          }) : [];
                        }
                        _context14.next = 9;
                        return Tools.series(postNumbers, function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(postNumber) {
                            return regeneratorRuntime.wrap(function _callee13$(_context13) {
                              while (1) {
                                switch (_context13.prev = _context13.next) {
                                  case 0:
                                    _context13.prev = 0;
                                    _context13.next = 3;
                                    return action(boardName, postNumber);

                                  case 3:
                                    return _context13.abrupt('return', _context13.sent);

                                  case 6:
                                    _context13.prev = 6;
                                    _context13.t0 = _context13['catch'](0);

                                    _logger2.default.error(_context13.t0.stack || _context13.t0);

                                  case 9:
                                  case 'end':
                                    return _context13.stop();
                                }
                              }
                            }, _callee13, this, [[0, 6]]);
                          }));

                          return function (_x39) {
                            return ref.apply(this, arguments);
                          };
                        }());

                      case 9:
                        return _context14.abrupt('return', _context14.sent);

                      case 10:
                      case 'end':
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function (_x37, _x38) {
                return ref.apply(this, arguments);
              };
            }());

          case 10:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function forEachPost(_x35, _x36) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPosts = exports.rerenderPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(targets) {
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return forEachPost(targets, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(boardName, postNumber) {
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        console.log(Tools.translate('Rendering post: >>/$[1]/$[2]', '', boardName, postNumber));
                        _context16.next = 3;
                        return rerenderPost(boardName, postNumber, { nogenerate: true });

                      case 3:
                        return _context16.abrupt('return', _context16.sent);

                      case 4:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x41, _x42) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            return _context17.abrupt('return', _context17.sent);

          case 3:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function rerenderPosts(_x40) {
    return ref.apply(this, arguments);
  };
}();

var rebuildPostSearchIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(boardName, postNumber) {
    var key, post;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            key = boardName + ':' + postNumber;
            _context18.next = 3;
            return getPost(boardName, postNumber);

          case 3:
            post = _context18.sent;
            _context18.next = 6;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.plainText = post.plainText;
              body.subject = post.subject;
              body.archived = !!post.archived;
              return body;
            });

          case 6:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function rebuildPostSearchIndex(_x43, _x44) {
    return ref.apply(this, arguments);
  };
}();

var rebuildSearchIndex = exports.rebuildSearchIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(targets) {
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            _context20.next = 2;
            return forEachPost(targets || {}, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(boardName, postNumber) {
                return regeneratorRuntime.wrap(function _callee19$(_context19) {
                  while (1) {
                    switch (_context19.prev = _context19.next) {
                      case 0:
                        console.log(Tools.translate('Rebuilding post search index: >>/$[1]/$[2]', '', boardName, postNumber));
                        _context19.next = 3;
                        return rebuildPostSearchIndex(boardName, postNumber);

                      case 3:
                        return _context19.abrupt('return', _context19.sent);

                      case 4:
                      case 'end':
                        return _context19.stop();
                    }
                  }
                }, _callee19, this);
              }));

              return function (_x46, _x47) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            return _context20.abrupt('return', _context20.sent);

          case 3:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function rebuildSearchIndex(_x45) {
    return ref.apply(this, arguments);
  };
}();

var copyPosts = exports.copyPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(_ref7) {
    var sourceBoardName = _ref7.sourceBoardName;
    var postNumbers = _ref7.postNumbers;
    var targetBoardName = _ref7.targetBoardName;
    var initialPostNumber = _ref7.initialPostNumber;
    var targetBoard, posts, postNumberMap, sourcePath, sourceThumbPath, targetPath, targetThumbPath, toUpdate, toRerender;
    return regeneratorRuntime.wrap(function _callee23$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            targetBoard = _board2.default.board(targetBoardName);

            if (targetBoard) {
              _context23.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context23.next = 5;
            return getPosts(sourceBoardName, postNumbers, {
              withFileInfos: true,
              withReferences: true,
              withExtraData: true
            });

          case 5:
            posts = _context23.sent;
            postNumberMap = posts.reduce(function (acc, post, index) {
              acc[post.number] = initialPostNumber + index;
              return acc;
            }, {});
            sourcePath = __dirname + '/../../public/' + sourceBoardName + '/src';
            sourceThumbPath = __dirname + '/../../public/' + sourceBoardName + '/thumb';
            targetPath = __dirname + '/../../public/' + targetBoardName + '/src';
            targetThumbPath = __dirname + '/../../public/' + targetBoardName + '/thumb';
            _context23.next = 13;
            return mkpath(targetPath);

          case 13:
            _context23.next = 15;
            return mkpath(targetThumbPath);

          case 15:
            toUpdate = [];
            toRerender = [];
            _context23.next = 19;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(post) {
                var fileInfos, referencedPosts, referringPosts, extraData, text;
                return regeneratorRuntime.wrap(function _callee22$(_context22) {
                  while (1) {
                    switch (_context22.prev = _context22.next) {
                      case 0:
                        post.number = postNumberMap[post.number];
                        post.boardName = targetBoardName;
                        post.threadNumber = initialPostNumber;
                        fileInfos = post.fileInfos;
                        referencedPosts = post.referencedPosts;
                        referringPosts = post.referringPosts;
                        extraData = post.extraData;

                        delete post.fileInfos;
                        delete post.referencedPosts;
                        delete post.referringPosts;
                        delete post.extraData;
                        if (post.hasOwnProperty('bannedFor')) {
                          delete post.bannedFor;
                        }

                        if (!post.rawText) {
                          _context22.next = 19;
                          break;
                        }

                        text = PostReferencesModel.replacePostLinks(post.rawText, sourceBoardName, referencedPosts, postNumberMap);

                        if (!(text !== post.rawText)) {
                          _context22.next = 19;
                          break;
                        }

                        _context22.next = 17;
                        return (0, _markup2.default)(targetBoardName, text, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 17:
                        post.text = _context22.sent;

                        post.plainText = Renderer.plainText(text, { brToNewline: true });

                      case 19:
                        referencedPosts = PostReferencesModel.replacePostReferences(referencedPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap, toUpdate);
                        referringPosts = PostReferencesModel.replacePostReferences(referringPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap, toRerender);
                        _context22.next = 23;
                        return Tools.series(fileInfos, function () {
                          var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(fileInfo) {
                            var oldFileName, oldThumbName, baseName;
                            return regeneratorRuntime.wrap(function _callee21$(_context21) {
                              while (1) {
                                switch (_context21.prev = _context21.next) {
                                  case 0:
                                    oldFileName = fileInfo.name;
                                    oldThumbName = fileInfo.thumb.name;
                                    _context21.next = 4;
                                    return IPC.send('fileName');

                                  case 4:
                                    baseName = _context21.sent;

                                    fileInfo.name = fileInfo.name.replace(/^\d+/, baseName);
                                    fileInfo.thumb.name = fileInfo.thumb.name.replace(/^\d+/, baseName);
                                    console.log('copying fi', fileInfo);
                                    _context21.next = 10;
                                    return _fs2.default.copy(sourcePath + '/' + oldFileName, targetPath + '/' + fileInfo.name);

                                  case 10:
                                    _context21.next = 12;
                                    return _fs2.default.copy(sourceThumbPath + '/' + oldThumbName, targetThumbPath + '/' + fileInfo.thumb.name);

                                  case 12:
                                  case 'end':
                                    return _context21.stop();
                                }
                              }
                            }, _callee21, this);
                          }));

                          return function (_x50) {
                            return ref.apply(this, arguments);
                          };
                        }());

                      case 23:
                        _context22.next = 25;
                        return FilesModel.addFilesToPost(targetBoardName, post.number, fileInfos);

                      case 25:
                        _context22.next = 27;
                        return PostReferencesModel.storeReferencedPosts(targetBoardName, post.number, referencedPosts);

                      case 27:
                        _context22.next = 29;
                        return PostReferencesModel.storeReferringPosts(targetBoardName, post.number, referringPosts);

                      case 29:
                        _context22.next = 31;
                        return targetBoard.storeExtraData(post.number, extraData, false);

                      case 31:
                        _context22.next = 33;
                        return Posts.setOne(targetBoardName + ':' + post.number, post);

                      case 33:
                        _context22.next = 35;
                        return UsersModel.addUserPostNumber(post.user.ip, targetBoardName, post.number);

                      case 35:
                        _context22.next = 37;
                        return Search.indexPost({
                          boardName: targetBoardName,
                          postNumber: post.number,
                          threadNumber: initialPostNumber,
                          plainText: post.plainText,
                          subject: post.subject
                        });

                      case 37:
                      case 'end':
                        return _context22.stop();
                    }
                  }
                }, _callee22, this);
              }));

              return function (_x49) {
                return ref.apply(this, arguments);
              };
            }());

          case 19:
            return _context23.abrupt('return', {
              postNumberMap: postNumberMap,
              toUpdate: toUpdate,
              toRerender: toRerender
            });

          case 20:
          case 'end':
            return _context23.stop();
        }
      }
    }, _callee23, this);
  }));

  return function copyPosts(_x48) {
    return ref.apply(this, arguments);
  };
}();

var rerenderMovedThreadRelatedPosts = exports.rerenderMovedThreadRelatedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(_ref8) {
    var posts = _ref8.posts;
    var sourceBoardName = _ref8.sourceBoardName;
    var targetBoardName = _ref8.targetBoardName;
    var sourceThreadNumber = _ref8.sourceThreadNumber;
    var targetThreadNumber = _ref8.targetThreadNumber;
    var postNumberMap = _ref8.postNumberMap;
    return regeneratorRuntime.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            console.log('related posts', posts);
            _context25.next = 3;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(post) {
                var _post, referencedPosts, referringPosts, text, source;

                return regeneratorRuntime.wrap(function _callee24$(_context24) {
                  while (1) {
                    switch (_context24.prev = _context24.next) {
                      case 0:
                        _context24.next = 2;
                        return getPost(post.boardName, post.postNumber, { withReferences: true });

                      case 2:
                        post = _context24.sent;

                        if (!(!post || !post.rawText)) {
                          _context24.next = 5;
                          break;
                        }

                        return _context24.abrupt('return');

                      case 5:
                        _post = post;
                        referencedPosts = _post.referencedPosts;
                        referringPosts = _post.referringPosts;

                        delete post.referencedPosts;
                        delete post.referringPosts;
                        if (post.hasOwnProperty('bannedFor')) {
                          delete post.bannedFor;
                        }

                        if (!post.rawText) {
                          _context24.next = 21;
                          break;
                        }

                        text = PostReferencesModel.replaceRelatedPostLinks({
                          text: post.rawText,
                          sourceBoardName: sourceBoardName,
                          targetBoardName: targetBoardName,
                          postBoardName: post.boardName,
                          referencedPosts: referencedPosts,
                          postNumberMap: postNumberMap
                        });

                        if (!(text !== post.rawText)) {
                          _context24.next = 18;
                          break;
                        }

                        _context24.next = 16;
                        return (0, _markup2.default)(targetBoardName, text, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 16:
                        post.text = _context24.sent;

                        post.plainText = Renderer.plainText(text, { brToNewline: true });

                      case 18:
                        source = post.archived ? ArchivedPosts : Posts;
                        _context24.next = 21;
                        return source.setOne(post.boardName + ':' + post.number, post);

                      case 21:
                        referencedPosts = PostReferencesModel.replaceRelatedPostReferences(referencedPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap);
                        console.log('do', referringPosts);
                        referringPosts = PostReferencesModel.replaceRelatedPostReferences(referringPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap);
                        console.log('posle', referringPosts);
                        _context24.next = 27;
                        return PostReferencesModel.removeReferencedPosts(post.boardName, post.number, { archived: post.archived });

                      case 27:
                        _context24.next = 29;
                        return PostReferencesModel.removeReferring(post.boardName, post.number, { archived: post.archived });

                      case 29:
                        _context24.next = 31;
                        return PostReferencesModel.storeReferencedPosts(post.boardName, post.number, referencedPosts, { archived: post.archived });

                      case 31:
                        _context24.next = 33;
                        return PostReferencesModel.storeReferringPosts(post.boardName, post.number, referringPosts, { archived: post.archived });

                      case 33:
                      case 'end':
                        return _context24.stop();
                    }
                  }
                }, _callee24, this);
              }));

              return function (_x52) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
          case 'end':
            return _context25.stop();
        }
      }
    }, _callee25, this);
  }));

  return function rerenderMovedThreadRelatedPosts(_x51) {
    return ref.apply(this, arguments);
  };
}();

var pushPostToArchive = exports.pushPostToArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(boardName, postNumber) {
    var board, key, post, extraData;
    return regeneratorRuntime.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context26.next = 3;
              break;
            }

            return _context26.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

          case 3:
            key = boardName + ':' + postNumber;
            _context26.next = 6;
            return Posts.getOne(key);

          case 6:
            post = _context26.sent;

            post.archived = true;
            _context26.next = 10;
            return ArchivedPosts.setOne(key, post);

          case 10:
            _context26.next = 12;
            return Posts.deleteOne(key);

          case 12:
            _context26.next = 14;
            return board.loadExtraData(postNumber, false);

          case 14:
            extraData = _context26.sent;
            _context26.next = 17;
            return board.storeExtraData(postNumber, extraData, true);

          case 17:
            _context26.next = 19;
            return board.removeExtraData(postNumber, false);

          case 19:
            _context26.next = 21;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.archived = true;
              return body;
            });

          case 21:
            _context26.next = 23;
            return FilesModel.pushPostFileInfosToArchive(boardName, postNumber);

          case 23:
          case 'end':
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function pushPostToArchive(_x53, _x54) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _boards = require('./boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _files = require('./files');

var FilesModel = _interopRequireWildcard(_files);

var _postReferences = require('./post-references');

var PostReferencesModel = _interopRequireWildcard(_postReferences);

var _threads = require('./threads');

var ThreadsModel = _interopRequireWildcard(_threads);

var _users = require('./users');

var UsersModel = _interopRequireWildcard(_users);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

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

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _sqlClientFactory = require('../storage/sql-client-factory');

var _sqlClientFactory2 = _interopRequireDefault(_sqlClientFactory);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var ArchivedPosts = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedPosts');
var Posts = new _hash2.default((0, _redisClientFactory2.default)(), 'posts');
var PostsPlannedForDeletion = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'postsPlannedForDeletion', {
  parse: false,
  stringify: false
});
var UserBans = new _key2.default((0, _redisClientFactory2.default)(), 'userBans');
//# sourceMappingURL=posts.js.map
