'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processFiles = undefined;

var downloadFile = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(url, formFieldName, fields, transaction) {
    var path, proxy, options, result, response, data, file, mimeType;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            path = __dirname + '/../tmp/upload_' + _uuid2.default.v4();

            transaction.addFile(path);
            proxy = Tools.proxy();
            options = { timeout: Tools.Minute }; //TODO: magic number

            if (!/^vk\:\/\//.test(url)) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return (0, _vk2.default)('audio.getById', { audios: url.split('/')[2] });

          case 7:
            result = _context.sent;

            options.url = result.response[0].url;
            _context.next = 12;
            break;

          case 11:
            if (proxy) {
              options = _merge2.default.recursive(options, {
                host: proxy.host,
                port: proxy.port,
                headers: { 'Proxy-Authorization': proxy.auth },
                path: url
              });
            } else {
              optons.url = url;
            }

          case 12:
            _context.next = 14;
            return _http2.default.request(options);

          case 14:
            response = _context.sent;

            if (!(200 !== response.status)) {
              _context.next = 17;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Failed to download file'))));

          case 17:
            _context.next = 19;
            return response.body.read();

          case 19:
            data = _context.sent;

            if (!(data.length < 1)) {
              _context.next = 22;
              break;
            }

            return _context.abrupt('return', Promise.reject(new Error(Tools.translate('File is empty'))));

          case 22:
            _context.next = 24;
            return Tools.writeFile(path, data);

          case 24:
            file = {
              name: url.split('/').pop(),
              size: data.length,
              path: path
            };

            setFileRating(file, formFieldName.substr(9), fields);
            _context.next = 28;
            return Tools.mimeType(path);

          case 28:
            mimeType = _context.sent;

            file.mimeType = mimeType;
            return _context.abrupt('return', file);

          case 31:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function downloadFile(_x, _x2, _x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

var getFiles = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(fields, files, transaction) {
    var downloadedFiles, hashes, fileInfos, existingFiles;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return Tools.series((0, _underscore2.default)(files).pick(function (file) {
              if (file.size < 1) {
                _fs2.default.remove(file.path).catch(function (err) {
                  Logger.error(req, err.stack || err);
                });
                return false;
              }
              return true;
            }), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(file, fileName) {
                var mimeType;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        setFileRating(file, file.fieldName.substr(5), fields);
                        _context2.next = 3;
                        return Tools.mimeType(file.path);

                      case 3:
                        mimeType = _context2.sent;

                        file.mimeType = mimeType;
                        return _context2.abrupt('return', file);

                      case 6:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, this);
              }));

              return function (_x8, _x9) {
                return ref.apply(this, arguments);
              };
            }(), {});

          case 2:
            files = _context4.sent;
            downloadedFiles = Tools.series((0, _underscore2.default)(fields).pick(function (_1, key) {
              return (/^file_url_\S+$/.test(key)
              );
            }), function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(url, formFieldName) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.next = 2;
                        return downloadFile(url, formFieldName, fields, transaction);

                      case 2:
                        return _context3.abrupt('return', _context3.sent);

                      case 3:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x10, _x11) {
                return ref.apply(this, arguments);
              };
            }(), true);

            files.concat(downloadedFiles);
            hashes = typeof fields.fileHashes === 'string' ? fields.fileHashes.split(',') : [];
            _context4.next = 8;
            return FilesModel.getFileInfosByHashes(hashes);

          case 8:
            fileInfos = _context4.sent;
            existingFiles = fileInfos.map(function (fileInfo, index) {
              var fi = {
                name: fileInfo.name,
                thumbName: fileInfo.thumb.name,
                size: fileInfo.size,
                boardName: fileInfo.boardName,
                mimeType: fileInfo.mimeType,
                rating: fileInfo.rating,
                copy: true
              };
              setFileRating(fi, hashes[index], fields);
              return fi;
            });
            return _context4.abrupt('return', files.concat(existingFiles));

          case 11:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getFiles(_x5, _x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var waitForFile = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(filePath, options) {
    var f = function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        var exists;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return _fs2.default.exists(filePath);

              case 2:
                exists = _context5.sent;

                if (exists) {
                  _context5.next = 11;
                  break;
                }

                if (retry) {
                  _context5.next = 6;
                  break;
                }

                return _context5.abrupt('return', Promise.reject(new Error(Tools.translate('Failed to copy file'))));

              case 6:
                --retry;
                _context5.next = 9;
                return new Promise(function (resolve, reject) {
                  setTimeout(resolve, delay);
                });

              case 9:
                _context5.next = 11;
                return f();

              case 11:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      return function f() {
        return ref.apply(this, arguments);
      };
    }();

    var delay, retry;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            //TODO: That is not okay
            delay = 50;
            retry = 4;
            _context6.next = 4;
            return f();

          case 4:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function waitForFile(_x12, _x13) {
    return ref.apply(this, arguments);
  };
}();

var generateFileName = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(file, plugin) {
    var baseName, suffix, thumbSuffix;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return IPC.send('fileName');

          case 2:
            baseName = _context7.sent;
            suffix = _path2.default.extname(file.name);

            if (typeof suffix === 'string') {
              suffix = suffix.substr(1);
            }
            if (!suffix || !plugin.suffixMatchesMimeType(suffix, file.mimeType)) {
              suffix = plugin.defaultSuffixForMimeType(file.mimeType);
            }
            thumbSuffix = suffix;

            if (typeof plugin.thumbnailSuffixForMimeType === 'function') {
              thumbSuffix = plugin.thumbnailSuffixForMimeType(file.mimeType) || suffix;
            }
            return _context7.abrupt('return', {
              name: baseName + '.' + suffix,
              thumbName: baseName + 's.' + thumbSuffix
            });

          case 9:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function generateFileName(_x14, _x15) {
    return ref.apply(this, arguments);
  };
}();

var createFileThumb = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(file, plugin) {
    var thumbPath, result;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            thumbPath = _path2.default.dirname(file.path) + '/' + _uuid2.default.v4();

            file.thumbPath = thumbPath;
            _context8.next = 4;
            return plugin.createThumbnail(file, thumbPath, file.path);

          case 4:
            _context8.t0 = _context8.sent;

            if (_context8.t0) {
              _context8.next = 7;
              break;
            }

            _context8.t0 = {};

          case 7:
            result = _context8.t0;

            file.dimensions = result.dimensions || null;
            file.extraData = result.extraData || null;
            file.thumbDimensions = result.thumbDimensions;
            if (result.ihash) {
              file.ihash = result.ihash;
            }

          case 12:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function createFileThumb(_x16, _x17) {
    return ref.apply(this, arguments);
  };
}();

var processFile = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(boardName, file, transaction) {
    var plugin, fn, targetFilePath, targetThumbPath, sourceFilePath, sourceThumbPath, fileInfo, _sourceFilePath, data;

    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            plugin = thumbCreationPlugins.find(function (plugin) {
              return plugin.match(file.mimeType);
            });

            if (plugin) {
              _context9.next = 3;
              break;
            }

            return _context9.abrupt('return', Promise.reject(new Error(Tools.translate('Unsupported file type'))));

          case 3:
            _context9.next = 5;
            return generateFileName(file, plugin);

          case 5:
            fn = _context9.sent;
            targetFilePath = __dirname + '/../public/' + boardName + '/src/' + fn.name;
            targetThumbPath = __dirname + '/../public/' + boardName + '/thumb/' + fn.thumbName;

            transaction.addFile(targetFilePath);
            transaction.addFile(targetThumbPath);

            if (!file.copy) {
              _context9.next = 25;
              break;
            }

            sourceFilePath = __dirname + '/../public/' + file.boardName + '/src/' + file.name;
            sourceThumbPath = __dirname + '/../public/' + file.boardName + '/thumb/' + file.thumbName;
            _context9.next = 15;
            return _fs2.default.copy(sourceFilePath, targetFilePath);

          case 15:
            _context9.next = 17;
            return _fs2.default.copy(sourceThumbPath, targetThumbPath);

          case 17:
            _context9.next = 19;
            return waitForFile(targetThumbPath);

          case 19:
            _context9.next = 21;
            return FilesModel.getFileInfoByName(file.name);

          case 21:
            fileInfo = _context9.sent;
            return _context9.abrupt('return', {
              dimensions: fileInfo.dimensions,
              extraData: fileInfo.extraData,
              hash: fileInfo.hash,
              ihash: fileInfo.ihash || null,
              mimeType: fileInfo.mimeType,
              name: fn.name,
              rating: file.rating,
              size: fileInfo.size,
              thumb: {
                dimensions: fileInfo.thumb.dimensions,
                name: fn.thumbName
              }
            });

          case 25:
            _sourceFilePath = file.path;

            if (file.hash) {
              _context9.next = 31;
              break;
            }

            _context9.next = 29;
            return _fs2.default.read(file.path, 'b');

          case 29:
            data = _context9.sent;

            file.hash = Tools.sha1(data);

          case 31:
            _context9.next = 33;
            return createFileThumb(file, plugin);

          case 33:
            _context9.next = 35;
            return _fs2.default.move(_sourceFilePath, targetFilePath);

          case 35:
            transaction.addFile(file.thumbPath);
            _context9.next = 38;
            return _fs2.default.move(file.thumbPath, targetThumbPath);

          case 38:
            _context9.next = 40;
            return waitForFile(targetThumbPath);

          case 40:
            return _context9.abrupt('return', {
              dimensions: file.dimensions,
              extraData: file.extraData,
              hash: file.hash,
              ihash: file.ihash || null,
              mimeType: file.mimeType,
              name: fn.name,
              rating: file.rating,
              size: file.size,
              thumb: {
                dimensions: file.thumbDimensions,
                name: fn.thumbName
              }
            });

          case 41:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function processFile(_x18, _x19, _x20) {
    return ref.apply(this, arguments);
  };
}();

var processFiles = exports.processFiles = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, files, transaction) {
    var path;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            if (!(files.length < 1)) {
              _context11.next = 2;
              break;
            }

            return _context11.abrupt('return', []);

          case 2:
            path = __dirname + '/../public/' + boardName;
            _context11.next = 5;
            return mkpath(path + '/src');

          case 5:
            _context11.next = 7;
            return mkpath(path + '/thumb');

          case 7:
            _context11.next = 9;
            return Tools.series(files, function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(file) {
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        _context10.next = 2;
                        return processFile(boardName, file, transaction);

                      case 2:
                        return _context10.abrupt('return', _context10.sent);

                      case 3:
                      case 'end':
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function (_x24) {
                return ref.apply(this, arguments);
              };
            }(), true);

          case 9:
            return _context11.abrupt('return', _context11.sent);

          case 10:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function processFiles(_x21, _x22, _x23) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _files = require('../models/files');

var FilesModel = _interopRequireWildcard(_files);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _vk = require('../helpers/vk');

var _vk2 = _interopRequireDefault(_vk);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var FILE_RATINGS = new Set(['SFW', 'R-15', 'R-18', 'R-18G']);

var thumbCreationPlugins = Tools.loadPlugins(__dirname + '/../thumbnailing');

function setFileRating(file, id, fields) {
  var rating = fields['file_' + id + '_rating'];
  if (FILE_RATINGS.has(rating)) {
    file.rating = rating;
  } else {
    file.rating = 'SFW';
  }
}
//# sourceMappingURL=files.js.map
