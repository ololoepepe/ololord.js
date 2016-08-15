'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deletePost = exports.editPost = exports.removePost = exports.createPost = exports.addReferencedPosts = exports.getPostKeys = exports.getPosts = exports.getPost = undefined;

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
    var boardName, threadNumber, text, markupMode, name, subject, sage, signAsOp, tripcode, password, board, rawText, markupModes, referencedPosts, thread, unbumpable, accessLevel, postCount, extraData, post;
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
            markupModes = Tools.markupModes(markupMode);
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
            post = {
              bannedFor: false,
              boardName: boardName,
              createdAt: date.toISOString(),
              geolocation: req.geolocation,
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
              plainText: text ? Tools.plainText(text, { brToNewline: true }) : null,
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
            _context9.next = 56;
            return Posts.setOne(boardName + ':' + postNumber, post);

          case 56:
            _context9.next = 58;
            return board.storeExtraData(postNumber, extraData);

          case 58:
            _context9.next = 60;
            return addReferencedPosts(post, referencedPosts);

          case 60:
            _context9.next = 62;
            return UsersModel.addUserPostNumber(req.ip, boardName, postNumber);

          case 62:
            _context9.next = 64;
            return Tools.series(files, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(fileInfo) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        file.boardName = boardName;
                        file.postNumber = postNumber;
                        _context8.next = 4;
                        return FilesModel.addFileInfo(fileInfo);

                      case 4:
                        _context8.next = 6;
                        return PostFileInfoNames.addOne(fileInfo.name, boardName + ':' + postNumber);

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

          case 64:
            _context9.next = 66;
            return FilesModel.addFileHashes(files);

          case 66:
            _context9.next = 68;
            return Search.indexPost({
              boardName: boardName,
              postNumber: postNumber,
              threadNumber: threadNumber,
              plainText: plainText,
              subject: subject
            });

          case 68:
            _context9.next = 70;
            return ThreadsModel.addThreadPostNumber(boardName, threadNumber, postNumber);

          case 70:
            if (!(!sage && postCount < board.bumpLimit && !unbumpable)) {
              _context9.next = 73;
              break;
            }

            _context9.next = 73;
            return ThreadsModel.setThreadUpdateTime(boardName, threadNumber, date.toISOString());

          case 73:
            post.referencedPosts = referencedPosts;
            post.fileInfos = files;
            return _context9.abrupt('return', post);

          case 76:
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

    var silent = _ref6.silent;
    var key, post, referencedPosts, text;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            key = boardName + ':' + postNumber;

            if (!silent) {
              console.log(Tools.translate('Rendering post: [$[1]] $[2]', '', boardName, postNumber));
            }
            _context12.next = 4;
            return getPost(boardName, postNumber);

          case 4:
            post = _context12.sent;
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
            return Posts.setOne(post, key);

          case 12:
            _context12.next = 14;
            return removeReferencedPosts(post, { nogenerate: !silent });

          case 14:
            _context12.next = 16;
            return addReferencedPosts(post, referencedPosts, { nogenerate: !silent });

          case 16:
            if (silent) {
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
                        return rerenderPost(ref.boardName, ref.postNumber, true);

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

            Logger.error(_context17.t0.stack || _context17.t0);

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

            Logger.error(_context17.t1.stack || _context17.t1);

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

                        Logger.error(_context16.t0.stack || _context16.t0);

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
    var boardName, postNumber, text, name, subject, sage, markupMode, board, date, rawText, markupModes, referencedPosts, post, result, key, count, plainText, extraData;
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
            markupModes = Tools.markupModes(markupMode);
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
            _context18.next = 25;
            return UsersModel.checkUserPermissions(req, board, post, 'editPost');

          case 25:
            result = _context18.sent;

            if (result) {
              _context18.next = 28;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 28:
            key = boardName + ':' + postNumbers;
            _context18.next = 31;
            return PostFileInfoNames.count(key);

          case 31:
            count = _context18.sent;

            if (!(!rawText && count <= 0)) {
              _context18.next = 34;
              break;
            }

            return _context18.abrupt('return', Promise.reject(new Error(Tools.translate('Both file and comment are missing'))));

          case 34:
            _context18.next = 36;
            return (0, _markup2.default)(board.name, rawText, {
              markupModes: markupModes,
              referencedPosts: referencedPosts,
              accessLevel: req.level(board.name)
            });

          case 36:
            text = _context18.sent;
            plainText = text ? Tools.plainText(text, { brToNewline: true }) : null;
            _context18.next = 40;
            return board.postExtraData(req, fields, null, post);

          case 40:
            extraData = _context18.sent;

            post.markup = markupModes;
            post.name = name || null;
            post.plainText = plainText;
            post.rawText = rawText;
            post.subject = subject || null;
            post.text = text || null;
            post.updatedAt = date.toISOString();
            //delete post.bannedFor; //TODO: WTF?
            _context18.next = 50;
            return Posts.setOne(key, post);

          case 50:
            _context18.next = 52;
            return board.removeExtraData(postNumber);

          case 52:
            _context18.next = 54;
            return board.storeExtraData(postNumber, extraData);

          case 54:
            _context18.next = 56;
            return removeReferencedPosts(post);

          case 56:
            _context18.next = 58;
            return addReferencedPosts(post, referencedPosts);

          case 58:
            _context18.next = 60;
            return Search.updatePostIndex(boardName, postNumber, function (body) {
              body.plainText = plainText;
              body.subject = subject;
              return body;
            });

          case 60:
            return _context18.abrupt('return', post);

          case 61:
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
    var password = _ref10.password;
    var board, post, isThread, result;
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
            return PostsModel.getPost(boardName, postNumber);

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
            _context20.next = 17;
            return UsersModel.checkUserPermissions(req, board, post, 'deletePost', Tools.sha1(password));

          case 17:
            result = _context20.sent;

            if (result) {
              _context20.next = 20;
              break;
            }

            return _context20.abrupt('return', Promise.reject(new Error(Tools.translate('Not enough rights'))));

          case 20:
            if (!isThread) {
              _context20.next = 25;
              break;
            }

            _context20.next = 23;
            return removeThread(boardName, postNumber, { archived: archived });

          case 23:
            _context20.next = 27;
            break;

          case 25:
            _context20.next = 27;
            return removePost(boardName, postNumber);

          case 27:
            if (!(isThread && archived)) {
              _context20.next = 34;
              break;
            }

            _context20.next = 30;
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

          case 30:
            _context20.next = 32;
            return IPC.renderArchive(boardName);

          case 32:
            _context20.next = 37;
            break;

          case 34:
            if (archived) {
              _context20.next = 37;
              break;
            }

            _context20.next = 37;
            return IPC.render(boardName, post.threadNumber, postNumber, isThread ? 'delete' : 'edit');

          case 37:
            return _context20.abrupt('return', {
              boardName: boardName,
              threadNumber: isThread ? 0 : post.threadNumber
            });

          case 38:
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

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _key = require('../storage/key');

var _key2 = _interopRequireDefault(_key);

var _search = require('../storage/search');

var Search = _interopRequireWildcard(_search);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _markup = require('../core/markup');

var _markup2 = _interopRequireDefault(_markup);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

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
var PostsPlannedForDeletion = new _unorderedSet2.default((0, _clientFactory2.default)(), 'postsPlannedForDeletion', {
  parse: false,
  stringify: false
});
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
