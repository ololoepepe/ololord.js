'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getThreadPosts = exports.updateMovedThreadRelatedPosts = exports.markupMovedThreadRelatedPosts = exports.copyPosts = exports.markupPosts = exports.deletePost = exports.editPost = exports.createPost = exports.getPost = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var getPost = exports.getPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, postNumber, options) {
    var board, Post;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 6:
            _context.next = 8;
            return client.collection('post');

          case 8:
            Post = _context.sent;
            _context.next = 11;
            return Post.findOne({
              boardName: boardName,
              number: postNumber
            }, createPostProjection(options));

          case 11:
            return _context.abrupt('return', _context.sent);

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getPost(_x2, _x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var getPostThread = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, threadNumber) {
    var Thread, thread;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context2.sent;
            _context2.next = 5;
            return Thread.findOne({
              boardName: boardName,
              number: threadNumber
            }, {
              closed: 1,
              unbumpable: 1
            });

          case 5:
            thread = _context2.sent;

            if (thread) {
              _context2.next = 8;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 8:
            if (!thread.closed) {
              _context2.next = 10;
              break;
            }

            throw new Error(Tools.translate('Posting is disabled in this thread'));

          case 10:
            return _context2.abrupt('return', thread);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getPostThread(_x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var getPostCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, threadNumber, lastPostNumber) {
    var Post, query;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return client.collection('post');

          case 2:
            Post = _context3.sent;
            query = {
              boardName: boardName,
              threadNumber: threadNumber
            };

            if (lastPostNumber) {
              query.number = { $lt: lastPostNumber };
            }
            _context3.next = 7;
            return Post.count(query);

          case 7:
            return _context3.abrupt('return', _context3.sent);

          case 8:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getPostCount(_x7, _x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

var adjustPostSequenceNumber = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, postNumber, oldPostCount, newPostCount) {
    var Post;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return client.collection('post');

          case 2:
            Post = _context4.sent;
            _context4.next = 5;
            return Post.updateOne({
              boardName: boardName,
              number: postNumber
            }, {
              $inc: { sequenceNumber: newPostCount - oldPostCount }
            });

          case 5:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function adjustPostSequenceNumber(_x10, _x11, _x12, _x13) {
    return ref.apply(this, arguments);
  };
}();

var setThreadUpdateTime = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(boardName, threadNumber, dateTime) {
    var Thread, _ref2, matchedCount;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context5.sent;
            _context5.next = 5;
            return Thread.updateOne({
              boardName: boardName,
              number: threadNumber
            }, {
              $set: { updatedAt: dateTime.toISOString() }
            });

          case 5:
            _ref2 = _context5.sent;
            matchedCount = _ref2.matchedCount;

            if (!(matchedCount <= 0)) {
              _context5.next = 9;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 9:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function setThreadUpdateTime(_x14, _x15, _x16) {
    return ref.apply(this, arguments);
  };
}();

var createPost = exports.createPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(req, fields, files, transaction) {
    var _ref3 = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

    var postNumber = _ref3.postNumber;
    var date = _ref3.date;

    var boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password, board, _ref4, unbumpable, Post, postCount, rawText, markupModes, referencedPosts, accessLevel, extraData, fileInfos, post, postCountNew;

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
            date = date || Tools.now();
            board = getPostBoard(boardName);

            if (postNumber) {
              threadNumber = postNumber;
            }
            _context7.next = 17;
            return getPostThread(boardName, threadNumber);

          case 17:
            _ref4 = _context7.sent;
            unbumpable = _ref4.unbumpable;

            unbumpable = !!unbumpable;
            _context7.next = 22;
            return client.collection('post');

          case 22:
            Post = _context7.sent;
            _context7.next = 25;
            return getPostCount(boardName, threadNumber);

          case 25:
            postCount = _context7.sent;

            if (!(postCount >= board.postLimit)) {
              _context7.next = 28;
              break;
            }

            throw new Error(Tools.translate('Post limit reached'));

          case 28:
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            accessLevel = req.level(boardName) || null;
            _context7.next = 35;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              accessLevel: accessLevel,
              referencedPosts: referencedPosts
            });

          case 35:
            text = _context7.sent;
            _context7.next = 38;
            return board.getPostExtraData(req, fields, files);

          case 38:
            extraData = _context7.sent;

            if (postNumber) {
              _context7.next = 43;
              break;
            }

            _context7.next = 42;
            return BoardsModel.nextPostNumber(boardName);

          case 42:
            postNumber = _context7.sent;

          case 43:
            fileInfos = FilesModel.createFileInfos(files, boardName, postNumber);
            post = {
              boardName: boardName,
              number: postNumber,
              threadNumber: threadNumber,
              sequenceNumber: postCount + 1,
              archived: false,
              name: name || null,
              subject: subject || null,
              rawText: rawText,
              text: text || null,
              markup: markupModes,
              options: createPostOptions(req, sage, tripcode, signAsOp),
              user: createPostUser(req, accessLevel, password),
              geolocation: req.geolocationInfo,
              fileInfos: fileInfos,
              fileInfoCount: fileInfos.length,
              extraData: extraData,
              referencedPosts: (0, _underscore2.default)(referencedPosts).toArray(),
              referringPosts: [],
              createdAt: date.toISOString(),
              updatedAt: null
            };

            transaction.setPostNumber(postNumber);
            _context7.next = 48;
            return Post.insertOne(post);

          case 48:
            _context7.next = 50;
            return getPostCount(boardName, threadNumber, postNumber);

          case 50:
            postCountNew = _context7.sent;

            if (!(postCountNew !== postCount)) {
              _context7.next = 54;
              break;
            }

            _context7.next = 54;
            return adjustPostSequenceNumber(boardName, postNumber, postCount, postCountNew);

          case 54:
            if (!(!sage && postCount < board.bumpLimit && !unbumpable)) {
              _context7.next = 57;
              break;
            }

            _context7.next = 57;
            return setThreadUpdateTime(boardName, threadNumber, date);

          case 57:
            _context7.next = 59;
            return PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);

          case 59:
            _context7.next = 61;
            return IPC.render(boardName, threadNumber, postNumber, 'create');

          case 61:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
              return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                  switch (_context6.prev = _context6.next) {
                    case 0:
                      _context6.next = 2;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts);

                    case 2:
                    case 'end':
                      return _context6.stop();
                  }
                }
              }, _callee6, this);
            }))();
            return _context7.abrupt('return', post);

          case 63:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function createPost(_x17, _x18, _x19, _x20, _x21) {
    return ref.apply(this, arguments);
  };
}();

var editPost = exports.editPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(req, fields) {
    var boardName, postNumber, text, name, subject, sage, markupMode, board, Post, query, post, threadNumber, oldReferencedPosts, date, rawText, markupModes, referencedPosts, extraData, result;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
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
              _context9.next = 10;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 10:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context9.next = 13;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 13:
            _context9.next = 15;
            return client.collection('post');

          case 15:
            Post = _context9.sent;
            query = {
              boardName: boardName,
              number: postNumber
            };
            _context9.next = 19;
            return Post.findOne(query, {
              threadNumber: 1,
              referencedPosts: 1,
              extraData: 1
            });

          case 19:
            post = _context9.sent;

            if (post) {
              _context9.next = 22;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 22:
            threadNumber = post.threadNumber;
            oldReferencedPosts = post.referencedPosts;
            date = Tools.now();
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            _context9.next = 31;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              accessLevel: req.level(boardName),
              referencedPosts: referencedPosts
            });

          case 31:
            text = _context9.sent;
            _context9.next = 34;
            return board.editPostExtraData(req, fields, post.extraData);

          case 34:
            extraData = _context9.sent;
            _context9.next = 37;
            return Post.findOneAndUpdate(query, {
              $set: {
                markup: markupModes,
                name: name || null,
                rawText: rawText,
                subject: subject || null,
                text: text || null,
                referencedPosts: (0, _underscore2.default)(referencedPosts).toArray(),
                updatedAt: date
              }
            }, {
              projection: createPostProjection({
                withFileInfos: true,
                withExtraData: true,
                withReferences: true
              }),
              returnOriginal: false
            });

          case 37:
            result = _context9.sent;

            post = result.value;

            if (post) {
              _context9.next = 41;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 41:
            _context9.next = 43;
            return PostReferencesModel.removeReferringPosts(boardName, postNumber);

          case 43:
            _context9.next = 45;
            return PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);

          case 45:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
              return regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                  switch (_context8.prev = _context8.next) {
                    case 0:
                      _context8.next = 2;
                      return IPC.render(boardName, threadNumber, postNumber, 'edit');

                    case 2:
                      _context8.next = 4;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts, oldReferencedPosts);

                    case 4:
                    case 'end':
                      return _context8.stop();
                  }
                }
              }, _callee8, this);
            }))();
            return _context9.abrupt('return', post);

          case 47:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function editPost(_x23, _x24) {
    return ref.apply(this, arguments);
  };
}();

var deletePost = exports.deletePost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, postNumber) {
    var board, Post, result, post, threadNumber, oldReferencedPosts, referringPosts;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context11.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context11.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 6:
            _context11.next = 8;
            return client.collection('post');

          case 8:
            Post = _context11.sent;
            _context11.next = 11;
            return Post.findOneAndDelete({
              boardName: boardName,
              threadNumber: { $ne: postNumber },
              number: postNumber,
              archived: false
            }, {
              projection: {
                threadNumber: 1,
                referencedPosts: 1,
                referringPosts: 1,
                fileInfos: 1
              }
            });

          case 11:
            result = _context11.sent;
            post = result.value;

            if (post) {
              _context11.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 15:
            threadNumber = post.threadNumber;
            oldReferencedPosts = post.referencedPosts;
            referringPosts = post.referringPosts;
            _context11.next = 20;
            return Post.updateMany({
              boardName: boardName,
              threadNumber: threadNumber,
              number: { $gt: postNumber }
            }, {
              $inc: { sequenceNumber: -1 }
            });

          case 20:
            _context11.next = 22;
            return PostReferencesModel.removeReferringPosts(boardName, postNumber);

          case 22:
            _context11.next = 24;
            return IPC.render(boardName, threadNumber, postNumber, 'edit');

          case 24:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
              var refs;
              return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                  switch (_context10.prev = _context10.next) {
                    case 0:
                      _context10.next = 2;
                      return PostReferencesModel.updateReferringPosts(referringPosts, boardName, postNumber, threadNumber);

                    case 2:
                      refs = _context10.sent;
                      _context10.next = 5;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, refs, oldReferencedPosts);

                    case 5:
                      _context10.next = 7;
                      return FilesModel.removeFiles(post.fileInfos);

                    case 7:
                    case 'end':
                      return _context10.stop();
                  }
                }
              }, _callee10, this);
            }))();

          case 25:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function deletePost(_x25, _x26) {
    return ref.apply(this, arguments);
  };
}();

var markupPosts = exports.markupPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(targets) {
    var Post, posts, refs;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!((typeof targets === 'undefined' ? 'undefined' : _typeof(targets)) !== 'object')) {
              _context13.next = 2;
              break;
            }

            return _context13.abrupt('return');

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
            _context13.next = 6;
            return client.collection('post');

          case 6:
            Post = _context13.sent;
            _context13.next = 9;
            return Tools.series(targets, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(postNumbers, boardName) {
                var posts;
                return regeneratorRuntime.wrap(function _callee12$(_context12) {
                  while (1) {
                    switch (_context12.prev = _context12.next) {
                      case 0:
                        if (!(typeof postNumbers !== 'string' && !(0, _underscore2.default)(postNumbers).isArray())) {
                          _context12.next = 2;
                          break;
                        }

                        return _context12.abrupt('return', []);

                      case 2:
                        if (_board2.default.board(boardName)) {
                          _context12.next = 5;
                          break;
                        }

                        _logger2.default.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
                        return _context12.abrupt('return', []);

                      case 5:
                        _context12.next = 7;
                        return Post.find({ boardName: boardName }, {
                          number: 1,
                          threadNumber: 1
                        });

                      case 7:
                        posts = _context12.sent;

                        posts = posts.map(function (_ref5) {
                          var number = _ref5.number;
                          var threadNumber = _ref5.threadNumber;

                          return {
                            boardName: boardName,
                            postNumber: postNumber,
                            threadNumber: threadNumber
                          };
                        });
                        if ('*' !== postNumbers) {
                          posts = posts.filter(function (_ref6) {
                            var postNumber = _ref6.postNumber;
                            return postNumber.hasOwnProperty(postNumber);
                          });
                        }
                        return _context12.abrupt('return', posts);

                      case 11:
                      case 'end':
                        return _context12.stop();
                    }
                  }
                }, _callee12, this);
              }));

              return function (_x28, _x29) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 9:
            posts = _context13.sent;
            _context13.next = 12;
            return PostReferencesModel.updateReferringPosts(posts);

          case 12:
            refs = _context13.sent;
            _context13.next = 15;
            return PostReferencesModel.rerenderReferencedPosts(undefined, undefined, refs);

          case 15:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function markupPosts(_x27) {
    return ref.apply(this, arguments);
  };
}();

var copyPosts = exports.copyPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(_ref7) {
    var sourceBoardName = _ref7.sourceBoardName;
    var sourceThreadNumber = _ref7.sourceThreadNumber;
    var targetBoardName = _ref7.targetBoardName;
    var initialPostNumber = _ref7.initialPostNumber;
    var sourceBoard, targetBoard, Post, posts, postNumberMap, toRerender, toMarkup;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            sourceBoard = _board2.default.board(sourceBoardName);

            if (sourceBoard) {
              _context15.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            targetBoard = _board2.default.board(targetBoardName);

            if (targetBoard) {
              _context15.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 6:
            _context15.next = 8;
            return client.collection('post');

          case 8:
            Post = _context15.sent;
            _context15.next = 11;
            return Post.find({
              boardName: sourceBoardName,
              threadNumber: sourceThreadNumber
            }, { _id: 0 }).toArray();

          case 11:
            posts = _context15.sent;
            postNumberMap = posts.reduce(function (acc, post, index) {
              acc[post.number] = initialPostNumber + index;
              return acc;
            }, {});
            toRerender = [];
            toMarkup = [];
            _context15.next = 17;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(post) {
                var text, newFileInfos;
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        post.number = postNumberMap[post.number];
                        post.boardName = targetBoardName;
                        post.threadNumber = initialPostNumber;

                        if (!post.rawText) {
                          _context14.next = 9;
                          break;
                        }

                        text = PostReferencesModel.replacePostLinks(post.rawText, sourceBoardName, post.referencedPosts, postNumberMap);

                        if (!(text !== post.rawText)) {
                          _context14.next = 9;
                          break;
                        }

                        _context14.next = 8;
                        return (0, _markup2.default)(targetBoardName, text, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 8:
                        post.text = _context14.sent;

                      case 9:
                        _context14.next = 11;
                        return targetBoard.transformPostExtraData(post.extraData, sourceBoard);

                      case 11:
                        post.extraData = _context14.sent;

                        post.referencedPosts = PostReferencesModel.replacePostReferences(post.referencedPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap, toRerender);
                        post.referringPosts = PostReferencesModel.replacePostReferences(post.referringPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap, toMarkup);
                        _context14.next = 16;
                        return FilesModel.copyFiles(post.fileInfos, sourceBoardName, targetBoardName);

                      case 16:
                        newFileInfos = _context14.sent;

                        post.fileInfos = FilesModel.createFileInfos(newFileInfos, targetBoardName, post.number);
                        return _context14.abrupt('return', post);

                      case 19:
                      case 'end':
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function (_x31) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 17:
            posts = _context15.sent;
            _context15.next = 20;
            return Post.insertMany(posts);

          case 20:
            return _context15.abrupt('return', {
              postNumberMap: postNumberMap,
              toRerender: toRerender,
              toMarkup: toMarkup
            });

          case 21:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function copyPosts(_x30) {
    return ref.apply(this, arguments);
  };
}();

var markupMovedThreadRelatedPosts = exports.markupMovedThreadRelatedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(_ref8) {
    var posts = _ref8.posts;
    var sourceBoardName = _ref8.sourceBoardName;
    var targetBoardName = _ref8.targetBoardName;
    var postNumberMap = _ref8.postNumberMap;
    var Post;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return client.collection('post');

          case 2:
            Post = _context17.sent;
            _context17.next = 5;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(post) {
                var text;
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        _context16.next = 2;
                        return getPost(post.boardName, post.postNumber, { withReferences: true });

                      case 2:
                        post = _context16.sent;

                        if (!(!post || !post.rawText)) {
                          _context16.next = 5;
                          break;
                        }

                        return _context16.abrupt('return');

                      case 5:
                        if (post.rawText) {
                          _context16.next = 7;
                          break;
                        }

                        return _context16.abrupt('return');

                      case 7:
                        text = PostReferencesModel.replaceRelatedPostLinks({
                          text: post.rawText,
                          sourceBoardName: sourceBoardName,
                          targetBoardName: targetBoardName,
                          postBoardName: post.boardName,
                          referencedPosts: post.referencedPosts,
                          postNumberMap: postNumberMap
                        });

                        if (!(text !== post.rawText)) {
                          _context16.next = 12;
                          break;
                        }

                        _context16.next = 11;
                        return (0, _markup2.default)(targetBoardName, text, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 11:
                        text = _context16.sent;

                      case 12:
                        _context16.next = 14;
                        return Post.updateOne({
                          boardName: post.boardName,
                          number: post.number
                        }, {
                          $set: { text: text }
                        });

                      case 14:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x33) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function markupMovedThreadRelatedPosts(_x32) {
    return ref.apply(this, arguments);
  };
}();

var updateMovedThreadRelatedPosts = exports.updateMovedThreadRelatedPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(_ref9) {
    var posts = _ref9.posts;
    var sourceBoardName = _ref9.sourceBoardName;
    var targetBoardName = _ref9.targetBoardName;
    var sourceThreadNumber = _ref9.sourceThreadNumber;
    var targetThreadNumber = _ref9.targetThreadNumber;
    var postNumberMap = _ref9.postNumberMap;
    var Post;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            _context19.next = 2;
            return client.collection('post');

          case 2:
            Post = _context19.sent;
            _context19.next = 5;
            return Tools.series(posts, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(post) {
                var _post, referencedPosts, referringPosts, source, target;

                return regeneratorRuntime.wrap(function _callee18$(_context18) {
                  while (1) {
                    switch (_context18.prev = _context18.next) {
                      case 0:
                        _context18.next = 2;
                        return getPost(post.boardName, post.postNumber, { withReferences: true });

                      case 2:
                        post = _context18.sent;

                        if (post) {
                          _context18.next = 5;
                          break;
                        }

                        return _context18.abrupt('return');

                      case 5:
                        _post = post;
                        referencedPosts = _post.referencedPosts;
                        referringPosts = _post.referringPosts;
                        source = {
                          boardName: sourceBoardName,
                          threadNumber: sourceThreadNumber
                        };
                        target = {
                          boardName: targetBoardName,
                          threadNumber: targetThreadNumber
                        };

                        referencedPosts = PostReferencesModel.replaceRelatedPostReferences(referencedPosts, source, target, postNumberMap);
                        referringPosts = PostReferencesModel.replaceRelatedPostReferences(referringPosts, source, target, postNumberMap);
                        _context18.next = 14;
                        return Post.updateOne({
                          boardName: post.boardName,
                          number: post.number
                        }, {
                          $set: {
                            referencedPosts: referencedPosts,
                            referringPosts: referringPosts
                          }
                        });

                      case 14:
                      case 'end':
                        return _context18.stop();
                    }
                  }
                }, _callee18, this);
              }));

              return function (_x35) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function updateMovedThreadRelatedPosts(_x34) {
    return ref.apply(this, arguments);
  };
}();

var getThreadPosts = exports.getThreadPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(boardName, threadNumber) {
    var _ref10 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var limit = _ref10.limit;
    var offset = _ref10.offset;
    var sort = _ref10.sort;
    var board, Post, cursor, posts;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context20.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context20.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context20.next = 8;
            return client.collection('post');

          case 8:
            Post = _context20.sent;
            cursor = Post.find({
              boardName: boardName,
              threadNumber: threadNumber
            }, createPostProjection({
              withExtraData: true,
              withFileInfos: true,
              withReferences: true
            }));

            if (sort) {
              cursor = cursor.sort({ number: -1 });
            }
            limit = Tools.option(limit, 'number', 0, { test: function test(l) {
                return l > 0;
              } });
            offset = Tools.option(offset, 'number', 0, { test: function test(o) {
                return o > 0;
              } });
            if (limit || offset) {
              cursor = cursor.limit(limit + offset);
            }
            _context20.next = 16;
            return cursor.toArray();

          case 16:
            posts = _context20.sent;

            if (sort) {
              posts.reverse();
            }
            if (limit) {
              if (posts.length > limit) {
                posts.splice(0, posts.length - limit);
              } else if (offset) {
                posts.splice(0, offset);
              }
            }
            return _context20.abrupt('return', posts);

          case 20:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function getThreadPosts(_x36, _x37, _x38) {
    return ref.apply(this, arguments);
  };
}();

exports.createPostUser = createPostUser;

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

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();

function createPostProjection() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var withExtraData = _ref.withExtraData;
  var withFileInfos = _ref.withFileInfos;
  var withReferences = _ref.withReferences;

  var projection = { _id: 0 };
  if (!withExtraData) {
    projection.extraData = 0;
  }
  if (!withFileInfos) {
    projection.fileInfos = 0;
  }
  if (!withReferences) {
    projection.referencedPosts = 0;
    projection.referringPosts = 0;
  }
  return projection;
}

function getPostBoard(boardName) {
  var board = _board2.default.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  if (!board.postingEnabled) {
    throw new Error(Tools.translate('Posting is disabled at this board'));
  }
  return board;
}

function createPostOptions(req, sage, tripcode, signAsOp) {
  return {
    sage: sage,
    showTripcode: !!req.hashpass && 'true' === tripcode,
    signAsOp: 'true' === signAsOp,
    bannedFor: false
  };
}

function createPostUser(req, accessLevel, password) {
  return {
    hashpass: req.hashpass || null,
    ip: req.ip,
    level: accessLevel,
    password: Tools.sha1(password)
  };
}
//# sourceMappingURL=posts.js.map
