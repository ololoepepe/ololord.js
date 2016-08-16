'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.editAudioTags = exports.editFileRating = exports.deleteFile = exports.addFilesToPost = exports.removeFileInfos = exports.removeFileHashes = exports.addFileHashes = exports.addFileInfo = exports.getFileInfosByHashes = exports.fileInfoExistsByHash = exports.fileInfoExistsByName = exports.getFileInfoByHash = exports.getFileInfoByName = undefined;

var getFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(name, hash) {
    var info, fileInfo;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(!name && hash)) {
              _context.next = 5;
              break;
            }

            _context.next = 3;
            return FileHashes.getOne(hash);

          case 3:
            info = _context.sent;

            if (info) {
              name = info.name;
            }

          case 5:
            if (name) {
              _context.next = 7;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('No such file'))));

          case 7:
            fileInfo = FileInfos.getOne(name);

            if (fileInfo) {
              _context.next = 10;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('No such file'))));

          case 10:
            return _context.abrupt('return', fileInfo);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getFileInfo(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var getFileInfoByName = exports.getFileInfoByName = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(name) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return getFileInfo(name);

          case 2:
            return _context2.abrupt('return', _context2.sent);

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getFileInfoByName(_x3) {
    return ref.apply(this, arguments);
  };
}();

var getFileInfoByHash = exports.getFileInfoByHash = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(hash) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getFileInfo(null, hash);

          case 2:
            return _context3.abrupt('return', _context3.sent);

          case 3:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getFileInfoByHash(_x4) {
    return ref.apply(this, arguments);
  };
}();

var fileInfoExistsByName = exports.fileInfoExistsByName = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(name) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return FileInfos.existsOne(name);

          case 2:
            return _context4.abrupt('return', _context4.sent);

          case 3:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function fileInfoExistsByName(_x5) {
    return ref.apply(this, arguments);
  };
}();

var fileInfoExistsByHash = exports.fileInfoExistsByHash = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(hash) {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return FileHashes.exists(hash);

          case 2:
            return _context5.abrupt('return', _context5.sent);

          case 3:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function fileInfoExistsByHash(_x6) {
    return ref.apply(this, arguments);
  };
}();

var getFileInfosByHashes = exports.getFileInfosByHashes = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(hashes) {
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (hashes) {
              _context7.next = 2;
              break;
            }

            return _context7.abrupt('return', []);

          case 2:
            if (!(0, _underscore2.default)(hashes).isArray()) {
              hashes = [hashes];
            }
            _context7.next = 5;
            return Tools.series(hashes, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(hash) {
                var fileInfo;
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return FileHashes.getOne(hash);

                      case 2:
                        fileInfo = _context6.sent;

                        fileInfo.hash = hash;
                        return _context6.abrupt('return', fileInfo);

                      case 5:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x8) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 5:
            return _context7.abrupt('return', _context7.sent);

          case 6:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function getFileInfosByHashes(_x7) {
    return ref.apply(this, arguments);
  };
}();

var addFileInfo = exports.addFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(fileInfo) {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return FileInfos.setOne(fileInfo.name, fileInfo);

          case 2:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function addFileInfo(_x9) {
    return ref.apply(this, arguments);
  };
}();

var addFileHashes = exports.addFileHashes = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(fileInfos) {
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (!(0, _underscore2.default)(fileInfos).isArray()) {
              fileInfos = [fileInfos];
            }
            _context10.next = 3;
            return Tools.series(fileInfos.filter(function (fileInfo) {
              return !!fileInfo;
            }), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(fileInfo) {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return FileHashes.addOne(createFileHash(fileInfo), fileInfo.hash);

                      case 2:
                        return _context9.abrupt('return', _context9.sent);

                      case 3:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x11) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function addFileHashes(_x10) {
    return ref.apply(this, arguments);
  };
}();

var removeFileHashes = exports.removeFileHashes = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(fileInfos) {
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!(0, _underscore2.default)(fileInfos).isArray()) {
              fileInfos = [fileInfos];
            }

            if (!(fileInfos.length <= 0)) {
              _context12.next = 3;
              break;
            }

            return _context12.abrupt('return');

          case 3:
            _context12.next = 5;
            return Tools.series(fileInfos, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(fileInfo) {
                var size;
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.next = 2;
                        return FileHashes.deleteOne(createFileHash(fileInfo), fileInfo.hash);

                      case 2:
                        _context11.next = 4;
                        return FileHashes.count(fileInfo.hash);

                      case 4:
                        size = _context11.sent;

                        if (!(size <= 0)) {
                          _context11.next = 8;
                          break;
                        }

                        _context11.next = 8;
                        return FileHashes.delete(fileInfo.hash);

                      case 8:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x13) {
                return ref.apply(this, arguments);
              };
            }());

          case 5:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function removeFileHashes(_x12) {
    return ref.apply(this, arguments);
  };
}();

var removeFileInfos = exports.removeFileInfos = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(fileInfoNames) {
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!(0, _underscore2.default)(fileInfoNames).isArray()) {
              fileInfos = [fileInfos];
            }

            if (!(ids.length <= 0)) {
              _context13.next = 3;
              break;
            }

            return _context13.abrupt('return', 0);

          case 3:
            _context13.next = 5;
            return FileInfos.deleteSome(fileInfoNames);

          case 5:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function removeFileInfos(_x14) {
    return ref.apply(this, arguments);
  };
}();

var addFilesToPost = exports.addFilesToPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, postNumber, files, transaction) {
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.next = 2;
            return Tools.series(files, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(file) {
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        file.boardName = boardName;
                        file.postNumber = postNumber;
                        _context14.next = 4;
                        return addFileInfo(file);

                      case 4:
                        _context14.next = 6;
                        return PostFileInfoNames.addOne(file.name, boardName + ':' + postNumber);

                      case 6:
                      case 'end':
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function (_x19) {
                return ref.apply(this, arguments);
              };
            }());

          case 2:
            _context15.next = 4;
            return addFileHashes(files);

          case 4:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function addFilesToPost(_x15, _x16, _x17, _x18) {
    return ref.apply(this, arguments);
  };
}();

var deleteFile = exports.deleteFile = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(fileName) {
    var fileInfo, boardName, postNumber, path;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return getFileInfoByName(fileName);

          case 2:
            fileInfo = _context17.sent;
            boardName = fileInfo.boardName;
            postNumber = fileInfo.postNumber;
            _context17.next = 7;
            return PostFileInfoNames.deleteOne(fileName, boardName + ':' + postNumber);

          case 7:
            _context17.next = 9;
            return FileInfos.deleteOne(fileName);

          case 9:
            _context17.next = 11;
            return removeFileHashes(fileInfo);

          case 11:
            path = __dirname + '/../public/' + boardName;

            Tools.series([path + '/src/' + fileInfo.name, path + '/thumb/' + fileInfo.thumb.name], _asyncToGenerator(regeneratorRuntime.mark(function _callee16() {
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
            })));

          case 13:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function deleteFile(_x20) {
    return ref.apply(this, arguments);
  };
}();

var editFileRating = exports.editFileRating = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(fileName, rating) {
    var fileInfo;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            _context18.next = 2;
            return getFileInfoByName(fileName);

          case 2:
            fileInfo = _context18.sent;

            if (Tools.FILE_RATINGS.indexOf(rating) < 0) {
              rating = Tools.FILE_RATINGS[0];
            }
            fileInfo.rating = rating;
            _context18.next = 7;
            return FileInfos.setOne(fileName, fileInfo);

          case 7:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function editFileRating(_x21, _x22) {
    return ref.apply(this, arguments);
  };
}();

var editAudioTags = exports.editAudioTags = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(fileName, fields) {
    var fileInfo;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            _context19.next = 2;
            return getFileInfoByName(fileName);

          case 2:
            fileInfo = _context19.sent;

            _audio.AUDIO_TAGS.forEach(function (tag) {
              var value = fields[tag];
              if (value && typeof value === 'string') {
                fileInfo.extraData[tag] = value;
              } else if (fileInfo.extraData.hasOwnProperty(tag)) {
                delete fileInfo.extraData[tag];
              }
            });
            _context19.next = 6;
            return FileInfos.setOne(fileName, fileInfo);

          case 6:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function editAudioTags(_x23, _x24) {
    return ref.apply(this, arguments);
  };
}();

exports.createFileHash = createFileHash;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _clientFactory = require('../storage/client-factory');

var _clientFactory2 = _interopRequireDefault(_clientFactory);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _audio = require('../thumbnailing/audio');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var FileHashes = new _unorderedSet2.default((0, _clientFactory2.default)(), 'fileHashes');
var FileInfos = new _hash2.default((0, _clientFactory2.default)(), 'fileInfos');
var PostFileInfoNames = new _unorderedSet2.default((0, _clientFactory2.default)(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});

function createFileHash(fileInfo) {
  return {
    name: fileInfo.name,
    thumb: { name: fileInfo.thumb.name },
    size: fileInfo.size,
    boardName: fileInfo.boardName,
    mimeType: fileInfo.mimeType,
    rating: fileInfo.rating
  };
}
//# sourceMappingURL=files.js.map
