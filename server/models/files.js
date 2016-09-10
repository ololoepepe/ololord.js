'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pushPostFileInfosToArchive = exports.removePostFileInfos = exports.getPostFileInfos = exports.getPostFileCount = exports.editAudioTags = exports.editFileRating = exports.deleteFile = exports.addFilesToPost = exports.removeFileInfos = exports.removeFileHashes = exports.addFileHashes = exports.addFileInfo = exports.getFileInfosByHashes = exports.fileInfoExistsByHash = exports.fileInfoExistsByName = exports.getFileInfoByHash = exports.getFileInfoByName = undefined;

var getFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(name, hash) {
    var info, fileInfo;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(!name && hash)) {
              _context.next = 9;
              break;
            }

            _context.next = 3;
            return FileHashes.getOne(hash);

          case 3:
            info = _context.sent;

            if (info) {
              _context.next = 8;
              break;
            }

            _context.next = 7;
            return ArchivedFileHashes.getOne(hash);

          case 7:
            info = _context.sent;

          case 8:
            if (info) {
              name = info.name;
            }

          case 9:
            if (name) {
              _context.next = 11;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('No such file'))));

          case 11:
            _context.next = 13;
            return FileInfos.getOne(name);

          case 13:
            fileInfo = _context.sent;

            if (!fileInfo) {
              fileInfo = ArchivedFileInfos.getOne(name);
            }

            if (fileInfo) {
              _context.next = 17;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('No such file'))));

          case 17:
            return _context.abrupt('return', fileInfo);

          case 18:
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
    var exists;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return FileInfos.existsOne(name);

          case 2:
            exists = _context4.sent;

            if (!exists) {
              _context4.next = 5;
              break;
            }

            return _context4.abrupt('return', true);

          case 5:
            _context4.next = 7;
            return ArchivedFileInfos.existsOne(name);

          case 7:
            return _context4.abrupt('return', _context4.sent);

          case 8:
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
    var exists;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return FileHashes.exists(hash);

          case 2:
            exists = _context5.sent;

            if (!exists) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return', true);

          case 5:
            _context5.next = 7;
            return ArchivedFileHashes.exists(hash);

          case 7:
            return _context5.abrupt('return', _context5.sent);

          case 8:
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

                        if (fileInfo) {
                          _context6.next = 7;
                          break;
                        }

                        _context6.next = 6;
                        return ArchivedFileHashes.getOne(hash);

                      case 6:
                        fileInfo = _context6.sent;

                      case 7:
                        if (fileInfo) {
                          fileInfo.hash = hash;
                        }
                        return _context6.abrupt('return', fileInfo);

                      case 9:
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
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var archived = _ref.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            source = archived ? ArchivedFileInfos : FileInfos;
            _context8.next = 3;
            return source.setOne(fileInfo.name, fileInfo);

          case 3:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function addFileInfo(_x9, _x10) {
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
                var source;
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        source = fileInfo.archived ? ArchivedFileHashes : FileHashes;
                        _context9.next = 3;
                        return source.addOne(createFileHash(fileInfo), fileInfo.hash);

                      case 3:
                        return _context9.abrupt('return', _context9.sent);

                      case 4:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x13) {
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

  return function addFileHashes(_x12) {
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
                var source, size;
                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        source = fileInfo.archived ? ArchivedFileHashes : FileHashes;
                        _context11.next = 3;
                        return source.deleteOne(createFileHash(fileInfo), fileInfo.hash);

                      case 3:
                        _context11.next = 5;
                        return source.count(fileInfo.hash);

                      case 5:
                        size = _context11.sent;

                        if (!(size <= 0)) {
                          _context11.next = 9;
                          break;
                        }

                        _context11.next = 9;
                        return source.delete(fileInfo.hash);

                      case 9:
                      case 'end':
                        return _context11.stop();
                    }
                  }
                }, _callee11, this);
              }));

              return function (_x15) {
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

  return function removeFileHashes(_x14) {
    return ref.apply(this, arguments);
  };
}();

var removeFileInfos = exports.removeFileInfos = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(fileInfoNames) {
    var _ref2 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var archived = _ref2.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!(0, _underscore2.default)(fileInfoNames).isArray()) {
              fileInfoNames = [fileInfoNames];
            }

            if (!(fileInfoNames.length <= 0)) {
              _context13.next = 3;
              break;
            }

            return _context13.abrupt('return', 0);

          case 3:
            source = archived ? ArchivedFileInfos : FileInfos;
            _context13.next = 6;
            return source.deleteSome(fileInfoNames);

          case 6:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function removeFileInfos(_x16, _x17) {
    return ref.apply(this, arguments);
  };
}();

var addFilesToPost = exports.addFilesToPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(boardName, postNumber, files) {
    var _ref3 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var archived = _ref3.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            source = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
            _context15.next = 3;
            return Tools.series(files, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(file) {
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        file.boardName = boardName;
                        file.postNumber = postNumber;
                        _context14.next = 4;
                        return addFileInfo(file, { archived: archived });

                      case 4:
                        _context14.next = 6;
                        return source.addOne(file.name, boardName + ':' + postNumber);

                      case 6:
                      case 'end':
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function (_x24) {
                return ref.apply(this, arguments);
              };
            }());

          case 3:
            _context15.next = 5;
            return addFileHashes(files);

          case 5:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function addFilesToPost(_x19, _x20, _x21, _x22) {
    return ref.apply(this, arguments);
  };
}();

var deleteFile = exports.deleteFile = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(fileName) {
    var fileInfo, boardName, postNumber, archived, infosSource, namesSource, path;
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
            archived = fileInfo.archived;
            infosSource = archived ? ArchivedFileInfos : FileInfos;
            namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
            _context17.next = 10;
            return namesSource.deleteOne(fileName, boardName + ':' + postNumber);

          case 10:
            _context17.next = 12;
            return infosSource.deleteOne(fileName);

          case 12:
            _context17.next = 14;
            return removeFileHashes(fileInfo);

          case 14:
            path = __dirname + '/../../public/' + boardName;

            Tools.series([path + '/src/' + fileInfo.name, path + '/thumb/' + fileInfo.thumb.name], _asyncToGenerator(regeneratorRuntime.mark(function _callee16() {
              return regeneratorRuntime.wrap(function _callee16$(_context16) {
                while (1) {
                  switch (_context16.prev = _context16.next) {
                    case 0:
                      _context16.prev = 0;
                      _context16.next = 3;
                      return _fs2.default.remove(path);

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

          case 16:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function deleteFile(_x25) {
    return ref.apply(this, arguments);
  };
}();

var editFileRating = exports.editFileRating = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(fileName, rating) {
    var fileInfo, source;
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
            source = fileInfo.archived ? ArchivedFileInfos : FileInfos;
            _context18.next = 8;
            return source.setOne(fileName, fileInfo);

          case 8:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function editFileRating(_x26, _x27) {
    return ref.apply(this, arguments);
  };
}();

var editAudioTags = exports.editAudioTags = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(fileName, fields) {
    var fileInfo, source;
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
            source = fileInfo.archived ? ArchivedFileInfos : FileInfos;
            _context19.next = 7;
            return source.setOne(fileName, fileInfo);

          case 7:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function editAudioTags(_x28, _x29) {
    return ref.apply(this, arguments);
  };
}();

var getPostFileCount = exports.getPostFileCount = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(boardName, postNumber) {
    var _ref4 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref4.archived;
    var source;
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            source = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
            _context20.next = 3;
            return source.count(boardName + ':' + postNumber);

          case 3:
            return _context20.abrupt('return', _context20.sent);

          case 4:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this);
  }));

  return function getPostFileCount(_x30, _x31, _x32) {
    return ref.apply(this, arguments);
  };
}();

var getPostFileInfos = exports.getPostFileInfos = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(boardName, postNumber) {
    var _ref5 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref5.archived;
    var namesSource, infosSource, fileNames;
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
            infosSource = archived ? ArchivedFileInfos : FileInfos;
            _context21.next = 4;
            return namesSource.getAll(boardName + ':' + postNumber);

          case 4:
            fileNames = _context21.sent;
            _context21.next = 7;
            return infosSource.getSome(fileNames);

          case 7:
            return _context21.abrupt('return', _context21.sent);

          case 8:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function getPostFileInfos(_x34, _x35, _x36) {
    return ref.apply(this, arguments);
  };
}();

var removePostFileInfos = exports.removePostFileInfos = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee24(boardName, postNumber) {
    var _ref6 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var archived = _ref6.archived;
    var key, namesSource, fileNames, fileInfos, paths;
    return regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            key = boardName + ':' + postNumber;
            namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
            _context24.next = 4;
            return namesSource.getAll(key);

          case 4:
            fileNames = _context24.sent;
            _context24.next = 7;
            return Tools.series(fileNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(fileName) {
                return regeneratorRuntime.wrap(function _callee22$(_context22) {
                  while (1) {
                    switch (_context22.prev = _context22.next) {
                      case 0:
                        _context22.next = 2;
                        return getFileInfoByName(fileName);

                      case 2:
                        return _context22.abrupt('return', _context22.sent);

                      case 3:
                      case 'end':
                        return _context22.stop();
                    }
                  }
                }, _callee22, this);
              }));

              return function (_x42) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 7:
            fileInfos = _context24.sent;

            fileInfos = fileInfos.filter(function (fileInfo) {
              return !!fileInfo;
            });
            paths = fileInfos.map(function (fileInfo) {
              return [__dirname + '/../../public/' + boardName + '/src/' + fileInfo.name, __dirname + '/../../public/' + boardName + '/thumb/' + fileInfo.thumb.name];
            });
            _context24.next = 12;
            return namesSource.delete(key);

          case 12:
            _context24.next = 14;
            return removeFileInfos(fileNames, { archived: archived });

          case 14:
            _context24.next = 16;
            return removeFileHashes(fileInfos);

          case 16:
            Tools.series((0, _underscore2.default)(paths).flatten(), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee23(path) {
                return regeneratorRuntime.wrap(function _callee23$(_context23) {
                  while (1) {
                    switch (_context23.prev = _context23.next) {
                      case 0:
                        _context23.prev = 0;
                        _context23.next = 3;
                        return _fs2.default.remove(path);

                      case 3:
                        _context23.next = 8;
                        break;

                      case 5:
                        _context23.prev = 5;
                        _context23.t0 = _context23['catch'](0);

                        Logger.error(_context23.t0.stack || _context23.t0);

                      case 8:
                      case 'end':
                        return _context23.stop();
                    }
                  }
                }, _callee23, this, [[0, 5]]);
              }));

              return function (_x43) {
                return ref.apply(this, arguments);
              };
            }());

          case 17:
          case 'end':
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function removePostFileInfos(_x38, _x39, _x40) {
    return ref.apply(this, arguments);
  };
}();

var pushPostFileInfosToArchive = exports.pushPostFileInfosToArchive = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee27(boardName, postNumber) {
    var key, fileNames, fileInfos;
    return regeneratorRuntime.wrap(function _callee27$(_context27) {
      while (1) {
        switch (_context27.prev = _context27.next) {
          case 0:
            key = boardName + ':' + postNumber;
            _context27.next = 3;
            return PostFileInfoNames.getAll(key);

          case 3:
            fileNames = _context27.sent;
            _context27.next = 6;
            return ArchivedPostFileInfoNames.addSome(fileNames, key);

          case 6:
            _context27.next = 8;
            return PostFileInfoNames.delete(key);

          case 8:
            _context27.next = 10;
            return Tools.series(fileNames, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee25(fileName) {
                return regeneratorRuntime.wrap(function _callee25$(_context25) {
                  while (1) {
                    switch (_context25.prev = _context25.next) {
                      case 0:
                        _context25.next = 2;
                        return getFileInfoByName(fileName);

                      case 2:
                        return _context25.abrupt('return', _context25.sent);

                      case 3:
                      case 'end':
                        return _context25.stop();
                    }
                  }
                }, _callee25, this);
              }));

              return function (_x46) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 10:
            fileInfos = _context27.sent;
            _context27.next = 13;
            return ArchivedFileInfos.setSome(fileInfos);

          case 13:
            _context27.next = 15;
            return FileInfos.deleteSome(fileNames);

          case 15:
            _context27.next = 17;
            return Tools.series(fileInfos, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee26(fileInfo) {
                var fileHash, size;
                return regeneratorRuntime.wrap(function _callee26$(_context26) {
                  while (1) {
                    switch (_context26.prev = _context26.next) {
                      case 0:
                        fileHash = createFileHash(fileInfo);
                        _context26.next = 3;
                        return ArchivedFileHashes.addOne(fileHash, fileInfo.hash);

                      case 3:
                        _context26.next = 5;
                        return FileHashes.deleteOne(fileHash, fileInfo.hash);

                      case 5:
                        _context26.next = 7;
                        return FileHashes.count(fileInfo.hash);

                      case 7:
                        size = _context26.sent;

                        if (!(size <= 0)) {
                          _context26.next = 11;
                          break;
                        }

                        _context26.next = 11;
                        return FileHashes.delete(fileInfo.hash);

                      case 11:
                      case 'end':
                        return _context26.stop();
                    }
                  }
                }, _callee26, this);
              }));

              return function (_x47) {
                return ref.apply(this, arguments);
              };
            }());

          case 17:
          case 'end':
            return _context27.stop();
        }
      }
    }, _callee27, this);
  }));

  return function pushPostFileInfosToArchive(_x44, _x45) {
    return ref.apply(this, arguments);
  };
}();

exports.createFileHash = createFileHash;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _hash = require('../storage/hash');

var _hash2 = _interopRequireDefault(_hash);

var _redisClientFactory = require('../storage/redis-client-factory');

var _redisClientFactory2 = _interopRequireDefault(_redisClientFactory);

var _sqlClientFactory = require('../storage/sql-client-factory');

var _sqlClientFactory2 = _interopRequireDefault(_sqlClientFactory);

var _unorderedSet = require('../storage/unordered-set');

var _unorderedSet2 = _interopRequireDefault(_unorderedSet);

var _audio = require('../file-types/audio');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ArchivedFileHashes = new _unorderedSet2.default((0, _sqlClientFactory2.default)(), 'archivedFileHashes');
var ArchivedFileInfos = new _hash2.default((0, _sqlClientFactory2.default)(), 'archivedFileInfos');
var ArchivedPostFileInfoNames = new _unorderedSet2.default((0, _sqlClientFactory2.default)(), 'archivedPostFileInfoNames', {
  parse: false,
  stringify: false
});
var FileHashes = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'fileHashes');
var FileInfos = new _hash2.default((0, _redisClientFactory2.default)(), 'fileInfos');
var PostFileInfoNames = new _unorderedSet2.default((0, _redisClientFactory2.default)(), 'postFileInfoNames', {
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
