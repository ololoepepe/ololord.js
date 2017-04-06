'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findPosts = exports.getThreadPosts = exports.copyPosts = exports.markupPosts = exports.deletePost = exports.editPost = exports.createPost = exports.getPost = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var getPost = exports.getPost = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(boardName, postNumber, options) {
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
    return _ref2.apply(this, arguments);
  };
}();

var getPostCount = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, threadNumber, lastPostNumber) {
    var Post, query;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('post');

          case 2:
            Post = _context2.sent;
            query = {
              boardName: boardName,
              threadNumber: threadNumber
            };

            if (lastPostNumber) {
              query.number = { $lt: lastPostNumber };
            }
            _context2.next = 7;
            return Post.count(query);

          case 7:
            return _context2.abrupt('return', _context2.sent);

          case 8:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getPostCount(_x5, _x6, _x7) {
    return _ref3.apply(this, arguments);
  };
}();

var adjustPostSequenceNumber = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, postNumber, oldPostCount, newPostCount) {
    var Post;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return client.collection('post');

          case 2:
            Post = _context3.sent;
            _context3.next = 5;
            return Post.updateOne({
              boardName: boardName,
              number: postNumber
            }, {
              $inc: { sequenceNumber: newPostCount - oldPostCount }
            });

          case 5:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function adjustPostSequenceNumber(_x8, _x9, _x10, _x11) {
    return _ref4.apply(this, arguments);
  };
}();

var setThreadUpdateTime = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, threadNumber, dateTime) {
    var Thread, _ref6, matchedCount;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return client.collection('thread');

          case 2:
            Thread = _context4.sent;
            _context4.next = 5;
            return Thread.updateOne({
              boardName: boardName,
              number: threadNumber
            }, {
              $set: { updatedAt: dateTime.toISOString() }
            });

          case 5:
            _ref6 = _context4.sent;
            matchedCount = _ref6.matchedCount;

            if (!(matchedCount <= 0)) {
              _context4.next = 9;
              break;
            }

            throw new Error(Tools.translate('No such thread'));

          case 9:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function setThreadUpdateTime(_x12, _x13, _x14) {
    return _ref5.apply(this, arguments);
  };
}();

var createPost = exports.createPost = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(req, fields, files, transaction) {
    var _ref8 = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {},
        postNumber = _ref8.postNumber,
        date = _ref8.date,
        unbumpable = _ref8.unbumpable,
        archived = _ref8.archived;

    var boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password, board, Post, postCount, rawText, markupModes, referencedPosts, accessLevel, extraData, fileInfos, post, postCountNew;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            boardName = fields.boardName, threadNumber = fields.threadNumber, text = fields.text, markupMode = fields.markupMode, name = fields.name, subject = fields.subject, sage = fields.sage, signAsOp = fields.signAsOp, tripcode = fields.tripcode, password = fields.password;

            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
            date = date || Tools.now();
            unbumpable = !!unbumpable;
            board = getPostBoard(boardName);

            if (postNumber) {
              threadNumber = postNumber;
            }
            _context6.next = 9;
            return client.collection('post');

          case 9:
            Post = _context6.sent;
            _context6.next = 12;
            return getPostCount(boardName, threadNumber);

          case 12:
            postCount = _context6.sent;

            if (!(postCount >= board.postLimit)) {
              _context6.next = 15;
              break;
            }

            throw new Error(Tools.translate('Post limit reached'));

          case 15:
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};

            sage = 'true' === sage;
            accessLevel = (name ? req.level(boardName) : null) || null;
            _context6.next = 22;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              accessLevel: accessLevel,
              referencedPosts: referencedPosts
            });

          case 22:
            text = _context6.sent;
            _context6.next = 25;
            return board.getPostExtraData(req, fields, files);

          case 25:
            extraData = _context6.sent;

            if (postNumber) {
              _context6.next = 30;
              break;
            }

            _context6.next = 29;
            return BoardsModel.nextPostNumber(boardName);

          case 29:
            postNumber = _context6.sent;

          case 30:
            fileInfos = FilesModel.createFileInfos(files, boardName, postNumber);
            post = {
              boardName: boardName,
              number: postNumber,
              threadNumber: threadNumber,
              sequenceNumber: postCount + 1,
              archived: !!archived,
              name: name || null,
              subject: subject || null,
              rawText: rawText,
              text: text || null,
              plainText: text ? Renderer.plainText(text, { brToNewline: true }) : null,
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

            transaction.addPostNumber(postNumber);
            _context6.next = 35;
            return Post.insertOne(post);

          case 35:
            _context6.next = 37;
            return getPostCount(boardName, threadNumber, postNumber);

          case 37:
            postCountNew = _context6.sent;

            if (!(postCountNew !== postCount)) {
              _context6.next = 41;
              break;
            }

            _context6.next = 41;
            return adjustPostSequenceNumber(boardName, postNumber, postCount, postCountNew);

          case 41:
            if (!(!sage && postCount < board.bumpLimit && !unbumpable)) {
              _context6.next = 44;
              break;
            }

            _context6.next = 44;
            return setThreadUpdateTime(boardName, threadNumber, date);

          case 44:
            _context6.next = 46;
            return PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);

          case 46:
            _context6.next = 48;
            return IPC.render(boardName, threadNumber, postNumber, 'create');

          case 48:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
              return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                  switch (_context5.prev = _context5.next) {
                    case 0:
                      _context5.next = 2;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts);

                    case 2:
                    case 'end':
                      return _context5.stop();
                  }
                }
              }, _callee5, this);
            }))();
            return _context6.abrupt('return', post);

          case 50:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function createPost(_x15, _x16, _x17, _x18) {
    return _ref7.apply(this, arguments);
  };
}();

var editPost = exports.editPost = function () {
  var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(req, fields) {
    var boardName, postNumber, text, name, subject, markupMode, board, Post, query, post, threadNumber, oldReferencedPosts, date, rawText, markupModes, referencedPosts, extraData, result;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            boardName = fields.boardName, postNumber = fields.postNumber, text = fields.text, name = fields.name, subject = fields.subject, markupMode = fields.markupMode;
            board = _board2.default.board(boardName);

            if (board) {
              _context8.next = 4;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 4:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context8.next = 7;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 7:
            _context8.next = 9;
            return client.collection('post');

          case 9:
            Post = _context8.sent;
            query = {
              boardName: boardName,
              number: postNumber
            };
            _context8.next = 13;
            return Post.findOne(query, {
              threadNumber: 1,
              referencedPosts: 1,
              extraData: 1
            });

          case 13:
            post = _context8.sent;

            if (post) {
              _context8.next = 16;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 16:
            threadNumber = post.threadNumber;
            oldReferencedPosts = post.referencedPosts;
            date = Tools.now();
            rawText = text || null;
            markupModes = _markup2.default.markupModes(markupMode);
            referencedPosts = {};
            _context8.next = 24;
            return (0, _markup2.default)(boardName, rawText, {
              markupModes: markupModes,
              accessLevel: req.level(boardName),
              referencedPosts: referencedPosts
            });

          case 24:
            text = _context8.sent;
            _context8.next = 27;
            return board.editPostExtraData(req, fields, post.extraData);

          case 27:
            extraData = _context8.sent;
            _context8.next = 30;
            return Post.findOneAndUpdate(query, {
              $set: {
                markup: markupModes,
                name: name || null,
                rawText: rawText,
                subject: subject || null,
                text: text || null,
                plainText: text ? Renderer.plainText(text, { brToNewline: true }) : null,
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

          case 30:
            result = _context8.sent;

            post = result.value;

            if (post) {
              _context8.next = 34;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 34:
            _context8.next = 36;
            return PostReferencesModel.removeReferringPosts(boardName, postNumber);

          case 36:
            _context8.next = 38;
            return PostReferencesModel.addReferringPosts(referencedPosts, boardName, postNumber, threadNumber);

          case 38:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
              return regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                  switch (_context7.prev = _context7.next) {
                    case 0:
                      _context7.next = 2;
                      return IPC.render(boardName, threadNumber, postNumber, 'edit');

                    case 2:
                      _context7.next = 4;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, referencedPosts, oldReferencedPosts);

                    case 4:
                    case 'end':
                      return _context7.stop();
                  }
                }
              }, _callee7, this);
            }))();
            return _context8.abrupt('return', post);

          case 40:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function editPost(_x20, _x21) {
    return _ref10.apply(this, arguments);
  };
}();

var deletePost = exports.deletePost = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(boardName, postNumber) {
    var board, Post, result, post, threadNumber, oldReferencedPosts, referringPosts;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context10.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });

            if (postNumber) {
              _context10.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid post number'));

          case 6:
            _context10.next = 8;
            return client.collection('post');

          case 8:
            Post = _context10.sent;
            _context10.next = 11;
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
            result = _context10.sent;
            post = result.value;

            if (post) {
              _context10.next = 15;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 15:
            threadNumber = post.threadNumber;
            oldReferencedPosts = post.referencedPosts;
            referringPosts = post.referringPosts;
            _context10.next = 20;
            return Post.updateMany({
              boardName: boardName,
              threadNumber: threadNumber,
              number: { $gt: postNumber }
            }, {
              $inc: { sequenceNumber: -1 }
            });

          case 20:
            _context10.next = 22;
            return PostReferencesModel.removeReferringPosts(boardName, postNumber);

          case 22:
            _context10.next = 24;
            return IPC.render(boardName, threadNumber, postNumber, 'edit');

          case 24:
            _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
              var refs;
              return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                  switch (_context9.prev = _context9.next) {
                    case 0:
                      _context9.next = 2;
                      return PostReferencesModel.updateReferringPosts(referringPosts, boardName, postNumber, threadNumber);

                    case 2:
                      refs = _context9.sent;
                      _context9.next = 5;
                      return PostReferencesModel.rerenderReferencedPosts(boardName, threadNumber, refs, oldReferencedPosts);

                    case 5:
                      _context9.next = 7;
                      return FilesModel.removeFiles(post.fileInfos);

                    case 7:
                    case 'end':
                      return _context9.stop();
                  }
                }
              }, _callee9, this);
            }))();

          case 25:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function deletePost(_x22, _x23) {
    return _ref12.apply(this, arguments);
  };
}();

var markupPosts = exports.markupPosts = function () {
  var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(targets) {
    var Post, posts, refs;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!((typeof targets === 'undefined' ? 'undefined' : _typeof(targets)) !== 'object')) {
              _context12.next = 2;
              break;
            }

            return _context12.abrupt('return');

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
            _context12.next = 6;
            return client.collection('post');

          case 6:
            Post = _context12.sent;
            _context12.next = 9;
            return Tools.series(targets, function () {
              var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(postNumbers, boardName) {
                var posts;
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        if (!(typeof postNumbers !== 'string' && !(0, _underscore2.default)(postNumbers).isArray())) {
                          _context11.next = 2;
                          break;
                        }

                        return _context11.abrupt('return', []);

                      case 2:
                        if (_board2.default.board(boardName)) {
                          _context11.next = 5;
                          break;
                        }

                        _logger2.default.error(new Error(Tools.translate('Invalid board name: $[1]', '', boardName)));
                        return _context11.abrupt('return', []);

                      case 5:
                        _context11.next = 7;
                        return Post.find({ boardName: boardName }, {
                          number: 1,
                          threadNumber: 1
                        }).toArray();

                      case 7:
                        posts = _context11.sent;

                        posts = posts.map(function (_ref16) {
                          var number = _ref16.number,
                              threadNumber = _ref16.threadNumber;

                          return {
                            boardName: boardName,
                            postNumber: number,
                            threadNumber: threadNumber
                          };
                        });
                        if ('*' !== postNumbers) {
                          posts = posts.filter(function (_ref17) {
                            var postNumber = _ref17.postNumber;
                            return postNumbers.indexOf(postNumber) >= 0;
                          });
                        }
                        return _context11.abrupt('return', posts);

                      case 11:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x25, _x26) {
                return _ref15.apply(this, arguments);
              };
            }(), true);

          case 9:
            posts = _context12.sent;
            _context12.next = 12;
            return PostReferencesModel.updateReferringPosts((0, _underscore2.default)(posts).flatten());

          case 12:
            refs = _context12.sent;
            _context12.next = 15;
            return PostReferencesModel.rerenderReferencedPosts(undefined, undefined, refs);

          case 15:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function markupPosts(_x24) {
    return _ref14.apply(this, arguments);
  };
}();

var copyPosts = exports.copyPosts = function () {
  var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(_ref19) {
    var sourceBoardName = _ref19.sourceBoardName,
        sourceThreadNumber = _ref19.sourceThreadNumber,
        targetBoardName = _ref19.targetBoardName,
        initialPostNumber = _ref19.initialPostNumber,
        transaction = _ref19.transaction;
    var sourceBoard, targetBoard, Post, posts, postNumberMap;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            sourceBoard = _board2.default.board(sourceBoardName);

            if (sourceBoard) {
              _context14.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            targetBoard = _board2.default.board(targetBoardName);

            if (targetBoard) {
              _context14.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 6:
            _context14.next = 8;
            return client.collection('post');

          case 8:
            Post = _context14.sent;
            _context14.next = 11;
            return Post.find({
              boardName: sourceBoardName,
              threadNumber: sourceThreadNumber
            }, { _id: 0 }).toArray();

          case 11:
            posts = _context14.sent;
            postNumberMap = posts.reduce(function (acc, post, index) {
              acc[post.number] = initialPostNumber + index;
              return acc;
            }, {});
            _context14.next = 15;
            return Tools.series(posts, function () {
              var _ref20 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(post) {
                var text, newFileInfos;
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                  while (1) {
                    switch (_context13.prev = _context13.next) {
                      case 0:
                        post.number = postNumberMap[post.number];
                        post.boardName = targetBoardName;
                        post.threadNumber = initialPostNumber;

                        if (!post.rawText) {
                          _context13.next = 11;
                          break;
                        }

                        text = PostReferencesModel.replacePostLinks(post.rawText, sourceBoardName, post.referencedPosts, postNumberMap);

                        if (!(text !== post.rawText)) {
                          _context13.next = 11;
                          break;
                        }

                        post.rawText = text;
                        _context13.next = 9;
                        return (0, _markup2.default)(targetBoardName, text, {
                          markupModes: post.markup,
                          accessLevel: post.user.level
                        });

                      case 9:
                        post.text = _context13.sent;

                        post.plainText = Renderer.plainText(post.text, { brToNewline: true });

                      case 11:
                        _context13.next = 13;
                        return targetBoard.transformPostExtraData(post.extraData, sourceBoard);

                      case 13:
                        post.extraData = _context13.sent;

                        post.referencedPosts = PostReferencesModel.replacePostReferences(post.referencedPosts, {
                          boardName: sourceBoardName,
                          threadNumber: post.threadNumber
                        }, {
                          boardName: targetBoardName,
                          threadNumber: initialPostNumber
                        }, postNumberMap);
                        posts.referringPosts = [];
                        _context13.next = 18;
                        return PostReferencesModel.addReferringPosts(post.referencedPosts, targetBoardName, post.number, post.threadNumber);

                      case 18:
                        _context13.next = 20;
                        return FilesModel.copyFiles(post.fileInfos, sourceBoardName, targetBoardName, transaction);

                      case 20:
                        newFileInfos = _context13.sent;

                        post.fileInfos = FilesModel.createFileInfos(newFileInfos, targetBoardName, post.number);
                        transaction.addPostNumber(post.number);
                        _context13.next = 25;
                        return Post.insertOne(post);

                      case 25:
                        return _context13.abrupt('return', post);

                      case 26:
                      case 'end':
                        return _context13.stop();
                    }
                  }
                }, _callee13, this);
              }));

              return function (_x28) {
                return _ref20.apply(this, arguments);
              };
            }(), true);

          case 15:
            posts = _context14.sent;

          case 16:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function copyPosts(_x27) {
    return _ref18.apply(this, arguments);
  };
}();

var getThreadPosts = exports.getThreadPosts = function () {
  var _ref21 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, threadNumber) {
    var _ref22 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        limit = _ref22.limit,
        offset = _ref22.offset,
        sort = _ref22.sort;

    var board, Post, cursor, posts;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            board = _board2.default.board(boardName);

            if (board) {
              _context15.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

            if (threadNumber) {
              _context15.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid thread number'));

          case 6:
            _context15.next = 8;
            return client.collection('post');

          case 8:
            Post = _context15.sent;
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
            _context15.next = 16;
            return cursor.toArray();

          case 16:
            posts = _context15.sent;

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
            return _context15.abrupt('return', posts);

          case 20:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function getThreadPosts(_x29, _x30) {
    return _ref21.apply(this, arguments);
  };
}();

var findPosts = exports.findPosts = function () {
  var _ref23 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(query, boardName, page) {
    var Post, q, limit, score, posts, count;
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            _context16.next = 2;
            return client.collection('post');

          case 2:
            Post = _context16.sent;
            q = {
              $text: { $search: query }
            };

            if (boardName) {
              q.boardName = boardName;
            }
            limit = (0, _config2.default)('system.search.maxResultCount');
            score = { $meta: 'textScore' };
            _context16.next = 9;
            return Post.find(q, {
              boardName: 1,
              number: 1,
              threadNumber: 1,
              archived: 1,
              subject: 1,
              plainText: 1,
              score: score
            }).sort({
              score: score,
              boardName: 1,
              number: 1
            }).skip(page * limit).limit(limit).toArray();

          case 9:
            posts = _context16.sent;
            _context16.next = 12;
            return Post.count(q);

          case 12:
            count = _context16.sent;
            return _context16.abrupt('return', {
              posts: posts,
              max: limit,
              total: count
            });

          case 14:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function findPosts(_x32, _x33, _x34) {
    return _ref23.apply(this, arguments);
  };
}();

exports.createPostUser = createPostUser;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _boards = require('./boards');

var BoardsModel = _interopRequireWildcard(_boards);

var _files = require('./files');

var FilesModel = _interopRequireWildcard(_files);

var _postReferences = require('./post-references');

var PostReferencesModel = _interopRequireWildcard(_postReferences);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var client = (0, _mongodbClientFactory2.default)();

function createPostProjection() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      withExtraData = _ref.withExtraData,
      withFileInfos = _ref.withFileInfos,
      withReferences = _ref.withReferences;

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
