'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyFiles = exports.getPostFileCount = exports.editAudioTags = exports.editFileRating = exports.deleteFile = exports.removeFiles = exports.addFilesToPost = exports.getFileInfosByHashes = exports.fileInfoExistsByHash = exports.fileInfoExistsByName = exports.getFileInfoByHash = exports.getFileInfoByName = undefined;

var getFileInfoByName = exports.getFileInfoByName = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(name) {
    var Post, post;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.collection('post');

          case 2:
            Post = _context.sent;
            _context.next = 5;
            return Post.findOne({ 'fileInfos.name': name }, { 'fileInfos.$': 1 });

          case 5:
            post = _context.sent;

            if (post) {
              _context.next = 8;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 8:
            return _context.abrupt('return', post.fileInfos[0]);

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getFileInfoByName(_x) {
    return _ref.apply(this, arguments);
  };
}();

var getFileInfoByHash = exports.getFileInfoByHash = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(hash) {
    var Post, post;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return client.collection('post');

          case 2:
            Post = _context2.sent;
            _context2.next = 5;
            return Post.findOne({ 'fileInfos.hash': hash }, { 'fileInfos.$': 1 });

          case 5:
            post = _context2.sent;

            if (post) {
              _context2.next = 8;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 8:
            return _context2.abrupt('return', post.fileInfos[0]);

          case 9:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getFileInfoByHash(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

var fileInfoExistsByName = exports.fileInfoExistsByName = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(name) {
    var Post, count;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return client.collection('post');

          case 2:
            Post = _context3.sent;
            _context3.next = 5;
            return Post.count({ 'fileInfos.name': name });

          case 5:
            count = _context3.sent;
            return _context3.abrupt('return', count > 0);

          case 7:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function fileInfoExistsByName(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

var fileInfoExistsByHash = exports.fileInfoExistsByHash = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(hash) {
    var Post, count;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return client.collection('post');

          case 2:
            Post = _context4.sent;
            _context4.next = 5;
            return Post.count({ 'fileInfos.hash': hash });

          case 5:
            count = _context4.sent;
            return _context4.abrupt('return', count > 0);

          case 7:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function fileInfoExistsByHash(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

var getFileInfosByHashes = exports.getFileInfosByHashes = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(hashes) {
    var Post, posts, fileInfosAll, fileInfos;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (hashes) {
              _context5.next = 2;
              break;
            }

            return _context5.abrupt('return', []);

          case 2:
            if (!(0, _underscore2.default)(hashes).isArray()) {
              hashes = [hashes];
            }

            if (!(hashes.length <= 0)) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return', []);

          case 5:
            _context5.next = 7;
            return client.collection('post');

          case 7:
            Post = _context5.sent;
            _context5.next = 10;
            return Post.find({
              'fileInfos.hash': { $in: hashes }
            }, { 'fileInfos.$': 1 }).toArray();

          case 10:
            posts = _context5.sent;
            fileInfosAll = (0, _underscore2.default)(posts.map(function (_ref6) {
              var fileInfos = _ref6.fileInfos;
              return fileInfos[0];
            }));
            fileInfos = [];
            return _context5.abrupt('return', hashes.map(function (hash) {
              var fileInfo = fileInfosAll.find(function (fileInfo) {
                return hash === fileInfo.hash;
              });
              if (!fileInfo) {
                throw new Error(Tools.translate('No such file'));
              }
              return fileInfo;
            }));

          case 14:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getFileInfosByHashes(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

var addFilesToPost = exports.addFilesToPost = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(boardName, postNumber, files) {
    var Post, result, post;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return client.collection('post');

          case 2:
            Post = _context6.sent;
            _context6.next = 5;
            return Post.findOneAndUpdate({
              boardName: boardName,
              number: postNumber
            }, {
              $push: {
                fileInfos: { $each: createFileInfos(files, boardName, postNumber) }
              }
            }, {
              projection: { threadNumber: 1 },
              returnOriginal: false
            });

          case 5:
            result = _context6.sent;
            post = result.value;

            if (post) {
              _context6.next = 9;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 9:
            _context6.next = 11;
            return IPC.render(boardName, post.threadNumber, postNumber, 'edit');

          case 11:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function addFilesToPost(_x6, _x7, _x8) {
    return _ref7.apply(this, arguments);
  };
}();

var removeFile = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(_ref9) {
    var boardName = _ref9.boardName,
        name = _ref9.name,
        thumb = _ref9.thumb;
    var path;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            path = __dirname + '/../../public/' + boardName;
            _context7.prev = 1;
            _context7.next = 4;
            return _fs2.default.remove(path + '/src/' + name);

          case 4:
            _context7.next = 9;
            break;

          case 6:
            _context7.prev = 6;
            _context7.t0 = _context7['catch'](1);

            _logger2.default.error(_context7.t0.stack || _context7.t0);

          case 9:
            _context7.prev = 9;
            _context7.next = 12;
            return _fs2.default.remove(path + '/thumb/' + thumb.name);

          case 12:
            _context7.next = 17;
            break;

          case 14:
            _context7.prev = 14;
            _context7.t1 = _context7['catch'](9);

            _logger2.default.error(_context7.t1.stack || _context7.t1);

          case 17:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[1, 6], [9, 14]]);
  }));

  return function removeFile(_x9) {
    return _ref8.apply(this, arguments);
  };
}();

var removeFiles = exports.removeFiles = function () {
  var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(fileInfos) {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return Tools.series(fileInfos, removeFile);

          case 2:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function removeFiles(_x10) {
    return _ref10.apply(this, arguments);
  };
}();

var deleteFile = exports.deleteFile = function () {
  var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(fileName) {
    var Post, result, post;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.next = 2;
            return client.collection('post');

          case 2:
            Post = _context9.sent;
            _context9.next = 5;
            return Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
              $pull: {
                fileInfos: { name: fileName }
              }
            }, {
              projection: {
                boardName: 1,
                number: 1,
                threadNumber: 1,
                'fileInfos.$': 1
              },
              returnOriginal: true
            });

          case 5:
            result = _context9.sent;
            post = result.value;

            if (post) {
              _context9.next = 9;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 9:
            _context9.next = 11;
            return IPC.render(post.boardName, post.threadNumber, post.number, 'edit');

          case 11:
            removeFile(post.fileInfos[0]);

          case 12:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function deleteFile(_x11) {
    return _ref11.apply(this, arguments);
  };
}();

var editFileRating = exports.editFileRating = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(fileName, rating) {
    var Post, result, post;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            _context10.next = 2;
            return client.collection('post');

          case 2:
            Post = _context10.sent;

            if (Tools.FILE_RATINGS.indexOf(rating) < 0) {
              rating = Tools.FILE_RATINGS[0];
            }
            _context10.next = 6;
            return Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
              $set: { 'fileInfos.$.rating': rating }
            }, {
              projection: {
                boardName: 1,
                number: 1,
                threadNumber: 1
              },
              returnOriginal: false
            });

          case 6:
            result = _context10.sent;
            post = result.value;

            if (post) {
              _context10.next = 10;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 10:
            _context10.next = 12;
            return IPC.render(post.boardName, post.threadNumber, post.number, 'edit');

          case 12:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function editFileRating(_x12, _x13) {
    return _ref12.apply(this, arguments);
  };
}();

var editAudioTags = exports.editAudioTags = function () {
  var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(fileName, fields) {
    var Post, extraData, result, post;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return client.collection('post');

          case 2:
            Post = _context11.sent;
            extraData = _audio.AUDIO_TAGS.map(function (tagName) {
              return {
                tagName: tagName,
                value: fields[tagName]
              };
            }).filter(function (_ref14) {
              var value = _ref14.value;

              return value && typeof value === 'string';
            }).reduce(function (acc, _ref15) {
              var tagName = _ref15.tagName,
                  value = _ref15.value;

              acc[tagName] = value;
              return acc;
            }, {});
            _context11.next = 6;
            return Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
              $set: { 'fileInfos.$.extraData': extraData }
            }, {
              projection: {
                boardName: 1,
                number: 1,
                threadNumber: 1
              },
              returnOriginal: false
            });

          case 6:
            result = _context11.sent;
            post = result.value;

            if (post) {
              _context11.next = 10;
              break;
            }

            throw new Error(Tools.translate('No such file'));

          case 10:
            _context11.next = 12;
            return IPC.render(post.boardName, post.threadNumber, post.number, 'edit');

          case 12:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function editAudioTags(_x14, _x15) {
    return _ref13.apply(this, arguments);
  };
}();

var getPostFileCount = exports.getPostFileCount = function () {
  var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName, postNumber) {
    var Post, post;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            _context12.next = 2;
            return client.collection('post');

          case 2:
            Post = _context12.sent;
            _context12.next = 5;
            return Post.findOne({
              boardName: boardName,
              number: postNumber
            }, { fileInfoCount: 1 });

          case 5:
            post = _context12.sent;

            if (post) {
              _context12.next = 8;
              break;
            }

            throw new Error(Tools.translate('No such post'));

          case 8:
            return _context12.abrupt('return', post.fileInfoCount);

          case 9:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function getPostFileCount(_x16, _x17) {
    return _ref16.apply(this, arguments);
  };
}();

var copyFiles = exports.copyFiles = function () {
  var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(fileInfos, sourceBoardName, targetBoardName, transaction) {
    var sourcePath, sourceThumbPath, targetPath, targetThumbPath;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            sourcePath = __dirname + '/../../public/' + sourceBoardName + '/src';
            sourceThumbPath = __dirname + '/../../public/' + sourceBoardName + '/thumb';
            targetPath = __dirname + '/../../public/' + targetBoardName + '/src';
            targetThumbPath = __dirname + '/../../public/' + targetBoardName + '/thumb';
            _context14.next = 6;
            return mkpath(targetPath);

          case 6:
            _context14.next = 8;
            return mkpath(targetThumbPath);

          case 8:
            _context14.next = 10;
            return Tools.series(fileInfos, function () {
              var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(fileInfo) {
                var oldFileName, oldThumbName, baseName, newFilePath, newThumbPath;
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                  while (1) {
                    switch (_context13.prev = _context13.next) {
                      case 0:
                        oldFileName = fileInfo.name;
                        oldThumbName = fileInfo.thumb.name;
                        _context13.next = 4;
                        return IPC.send('fileName');

                      case 4:
                        baseName = _context13.sent;

                        fileInfo.name = fileInfo.name.replace(/^\d+/, baseName);
                        fileInfo.thumb.name = fileInfo.thumb.name.replace(/^\d+/, baseName);
                        newFilePath = targetPath + '/' + fileInfo.name;
                        newThumbPath = targetThumbPath + '/' + fileInfo.thumb.name;

                        transaction.addFile(newFilePath);
                        _context13.next = 12;
                        return _fs2.default.copy(sourcePath + '/' + oldFileName, newFilePath);

                      case 12:
                        transaction.addFile(newThumbPath);
                        _context13.next = 15;
                        return _fs2.default.copy(sourceThumbPath + '/' + oldThumbName, newThumbPath);

                      case 15:
                        return _context13.abrupt('return', fileInfo);

                      case 16:
                      case 'end':
                        return _context13.stop();
                    }
                  }
                }, _callee13, this);
              }));

              return function (_x22) {
                return _ref18.apply(this, arguments);
              };
            }(), true);

          case 10:
            return _context14.abrupt('return', _context14.sent);

          case 11:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function copyFiles(_x18, _x19, _x20, _x21) {
    return _ref17.apply(this, arguments);
  };
}();

exports.createFileInfos = createFileInfos;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _mongodbClientFactory = require('../storage/mongodb-client-factory');

var _mongodbClientFactory2 = _interopRequireDefault(_mongodbClientFactory);

var _audio = require('../file-types/audio');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var client = (0, _mongodbClientFactory2.default)();

function createFileInfo(file, boardName, postNumber) {
  file.boardName = boardName;
  file.postNumber = postNumber;
  return file;
}

function createFileInfos(files, boardName, postNumber) {
  return files.map(function (file) {
    return createFileInfo(file, boardName, postNumber);
  });
}
//# sourceMappingURL=files.js.map
