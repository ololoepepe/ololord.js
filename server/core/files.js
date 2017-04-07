'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resizeImage = exports.getImageSize = exports.getMimeType = exports.generateRandomImage = exports.deleteFile = exports.renameFile = exports.editFile = exports.createFile = exports.writeFile = exports.diskUsage = exports.processFiles = exports.renderPostFileInfos = exports.getFiles = undefined;

var downloadFile = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(url, formFieldName, fields) {
    var path, proxy, options, result, response, data, file, mimeType;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            path = __dirname + '/../../tmp/upload_' + _uuid2.default.v4();
            proxy = _config2.default.proxy();
            options = { timeout: (0, _config2.default)('system.httpRequestTimeout') };

            if (!/^vk\:\/\//.test(url)) {
              _context.next = 10;
              break;
            }

            _context.next = 6;
            return (0, _vk2.default)('audio.getById', { audios: url.split('/')[2] });

          case 6:
            result = _context.sent;

            options.url = result[0].url;
            _context.next = 11;
            break;

          case 10:
            if (proxy) {
              options = _merge2.default.recursive(options, {
                host: proxy.host,
                port: proxy.port,
                headers: { 'Proxy-Authorization': proxy.auth },
                path: url
              });
            } else {
              options.url = url;
            }

          case 11:
            _context.next = 13;
            return _http2.default.request(options);

          case 13:
            response = _context.sent;

            if (!(200 !== response.status)) {
              _context.next = 16;
              break;
            }

            throw new Error(Tools.translate('Failed to download file'));

          case 16:
            _context.next = 18;
            return response.body.read();

          case 18:
            data = _context.sent;

            if (!(data.length < 1)) {
              _context.next = 21;
              break;
            }

            throw new Error(Tools.translate('File is empty'));

          case 21:
            _context.next = 23;
            return writeFile(path, data);

          case 23:
            file = {
              name: url.split('/').pop(),
              size: data.length,
              path: path
            };

            setFileRating(file, formFieldName.substr(9), fields);
            _context.next = 27;
            return getMimeType(path);

          case 27:
            mimeType = _context.sent;

            file.mimeType = mimeType;
            return _context.abrupt('return', file);

          case 30:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function downloadFile(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var getFiles = exports.getFiles = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(fields, files) {
    var downloadedFiles, hashes, fileInfos, existingFiles;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return Tools.series(files.filter(function (file) {
              if (file.size < 1) {
                _fs2.default.remove(file.path).catch(function (err) {
                  _logger2.default.error(req, err.stack || err);
                });
                return false;
              }
              return true;
            }), function () {
              var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(file) {
                var mimeType;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        setFileRating(file, file.fieldName.substr(5), fields);
                        _context2.next = 3;
                        return getMimeType(file.path);

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

              return function (_x6) {
                return _ref3.apply(this, arguments);
              };
            }(), true);

          case 2:
            files = _context4.sent;
            _context4.next = 5;
            return Tools.series((0, _underscore2.default)(fields).pick(function (_1, key) {
              return (/^file_url_\S+$/.test(key)
              );
            }), function () {
              var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(url, formFieldName) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.next = 2;
                        return downloadFile(url, formFieldName, fields);

                      case 2:
                        return _context3.abrupt('return', _context3.sent);

                      case 3:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x7, _x8) {
                return _ref4.apply(this, arguments);
              };
            }(), true);

          case 5:
            downloadedFiles = _context4.sent;

            files = files.concat(downloadedFiles);
            hashes = typeof fields.fileHashes === 'string' ? fields.fileHashes.split(',').filter(function (hash) {
              return !!hash;
            }) : [];
            _context4.next = 10;
            return FilesModel.getFileInfosByHashes(hashes);

          case 10:
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

          case 13:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getFiles(_x4, _x5) {
    return _ref2.apply(this, arguments);
  };
}();

var waitForFile = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(filePath, options) {
    var f = function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
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

                throw new Error(Tools.translate('Failed to copy file'));

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
        return _ref6.apply(this, arguments);
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

  return function waitForFile(_x9, _x10) {
    return _ref5.apply(this, arguments);
  };
}();

var generateFileName = function () {
  var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(file, plugin) {
    var baseName, suffix, canonicalSuffix, thumbSuffix;
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
            canonicalSuffix = suffix ? suffix.toLowerCase() : '';

            if (!suffix || !plugin.suffixMatchesMimeType(canonicalSuffix, file.mimeType)) {
              suffix = plugin.defaultSuffixForMimeType(file.mimeType);
            }
            thumbSuffix = suffix;

            if (typeof plugin.thumbnailSuffixForMimeType === 'function') {
              thumbSuffix = plugin.thumbnailSuffixForMimeType(file.mimeType) || canonicalSuffix;
            }
            return _context7.abrupt('return', {
              name: baseName + '.' + suffix,
              thumbName: baseName + 's.' + thumbSuffix
            });

          case 10:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function generateFileName(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}();

var createFileThumb = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(file, plugin) {
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

  return function createFileThumb(_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}();

var renderPostFileInfos = exports.renderPostFileInfos = function () {
  var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(post) {
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (post) {
              _context10.next = 2;
              break;
            }

            return _context10.abrupt('return');

          case 2:
            _context10.next = 4;
            return Tools.series(post.fileInfos || [], function () {
              var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(fileInfo) {
                var plugin, err;
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        if (fileInfo) {
                          _context9.next = 2;
                          break;
                        }

                        return _context9.abrupt('return');

                      case 2:
                        fileInfo.sizeKB = fileInfo.size / 1024;
                        fileInfo.sizeText = fileInfo.sizeKB.toFixed(2) + ' ' + Tools.translate('KB');
                        plugin = selectThumbnailingPlugin(fileInfo.mimeType);

                        if (plugin) {
                          _context9.next = 9;
                          break;
                        }

                        err = new Error(Tools.translate('Unsupported file type: $[1]', '', fileInfo.mimeType));

                        _logger2.default.error(err.stack || err);
                        return _context9.abrupt('return');

                      case 9:
                        if (!(typeof plugin.renderPostFileInfo !== 'function')) {
                          _context9.next = 11;
                          break;
                        }

                        return _context9.abrupt('return');

                      case 11:
                        _context9.next = 13;
                        return plugin.renderPostFileInfo(fileInfo);

                      case 13:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, this);
              }));

              return function (_x16) {
                return _ref10.apply(this, arguments);
              };
            }());

          case 4:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function renderPostFileInfos(_x15) {
    return _ref9.apply(this, arguments);
  };
}();

var processFile = function () {
  var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(boardName, file, transaction) {
    var plugin, fn, targetFilePath, targetThumbPath, sourceFilePath, sourceThumbPath, fileInfo, _sourceFilePath, data;

    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            plugin = selectThumbnailingPlugin(file.mimeType);

            if (plugin) {
              _context11.next = 3;
              break;
            }

            throw new Error(Tools.translate('Unsupported file type: $[1]', '', file.mimeType));

          case 3:
            _context11.next = 5;
            return generateFileName(file, plugin);

          case 5:
            fn = _context11.sent;
            targetFilePath = __dirname + '/../../public/' + boardName + '/src/' + fn.name;
            targetThumbPath = __dirname + '/../../public/' + boardName + '/thumb/' + fn.thumbName;

            transaction.addFile(targetFilePath);
            transaction.addFile(targetThumbPath);

            if (!file.copy) {
              _context11.next = 25;
              break;
            }

            sourceFilePath = __dirname + '/../../public/' + file.boardName + '/src/' + file.name;
            sourceThumbPath = __dirname + '/../../public/' + file.boardName + '/thumb/' + file.thumbName;
            _context11.next = 15;
            return _fs2.default.copy(sourceFilePath, targetFilePath);

          case 15:
            _context11.next = 17;
            return _fs2.default.copy(sourceThumbPath, targetThumbPath);

          case 17:
            _context11.next = 19;
            return waitForFile(targetThumbPath);

          case 19:
            _context11.next = 21;
            return FilesModel.getFileInfoByName(file.name);

          case 21:
            fileInfo = _context11.sent;
            return _context11.abrupt('return', {
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
              _context11.next = 31;
              break;
            }

            _context11.next = 29;
            return _fs2.default.read(file.path, 'b');

          case 29:
            data = _context11.sent;

            file.hash = Tools.sha1(data);

          case 31:
            _context11.next = 33;
            return createFileThumb(file, plugin);

          case 33:
            _context11.next = 35;
            return _fs2.default.move(_sourceFilePath, targetFilePath);

          case 35:
            transaction.addFile(file.thumbPath);
            _context11.next = 38;
            return _fs2.default.move(file.thumbPath, targetThumbPath);

          case 38:
            _context11.next = 40;
            return waitForFile(targetThumbPath);

          case 40:
            return _context11.abrupt('return', {
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
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function processFile(_x18, _x19, _x20) {
    return _ref11.apply(this, arguments);
  };
}();

var processFiles = exports.processFiles = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(boardName, files, transaction) {
    var path;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!(files.length < 1)) {
              _context12.next = 2;
              break;
            }

            return _context12.abrupt('return', []);

          case 2:
            path = __dirname + '/../../public/' + boardName;
            _context12.next = 5;
            return mkpath(path + '/src');

          case 5:
            _context12.next = 7;
            return mkpath(path + '/thumb');

          case 7:
            _context12.next = 9;
            return Tools.series(files, function (file) {
              return processFile(boardName, file, transaction);
            }, true);

          case 9:
            return _context12.abrupt('return', _context12.sent);

          case 10:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function processFiles(_x21, _x22, _x23) {
    return _ref12.apply(this, arguments);
  };
}();

var diskUsage = exports.diskUsage = function () {
  var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(path) {
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return new Promise(function (resolve, reject) {
              (0, _du2.default)(path, function (err, size) {
                if (err) {
                  return reject(err);
                }
                resolve(size);
              });
            });

          case 2:
            return _context13.abrupt('return', _context13.sent);

          case 3:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function diskUsage(_x24) {
    return _ref13.apply(this, arguments);
  };
}();

var writeFile = exports.writeFile = function () {
  var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(filePath, data) {
    var tmpFilePath, path, exists;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            tmpFilePath = filePath + '.tmp';
            path = filePath.split('/').slice(0, -1).join('/');
            _context14.next = 4;
            return _fs2.default.exists(path);

          case 4:
            exists = _context14.sent;

            if (exists) {
              _context14.next = 8;
              break;
            }

            _context14.next = 8;
            return _fs2.default.makeTree(path);

          case 8:
            _context14.next = 10;
            return _fs2.default.write(tmpFilePath, data);

          case 10:
            _context14.next = 12;
            return _fs2.default.rename(tmpFilePath, filePath);

          case 12:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function writeFile(_x25, _x26) {
    return _ref14.apply(this, arguments);
  };
}();

var createFile = exports.createFile = function () {
  var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(dir, fileName) {
    var _ref16 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        file = _ref16.file,
        isDir = _ref16.isDir;

    var path;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            if (dir.slice(-1)[0] !== '/') {
              dir += '/';
            }
            path = __dirname + '/../../' + dir + fileName;

            if (!isDir) {
              _context15.next = 5;
              break;
            }

            _context15.next = 5;
            return _fs2.default.makeDirectory(path);

          case 5:
            if (!file) {
              _context15.next = 10;
              break;
            }

            _context15.next = 8;
            return _fs2.default.move(file.path, path);

          case 8:
            _context15.next = 12;
            break;

          case 10:
            _context15.next = 12;
            return writeFile(path, '');

          case 12:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function createFile(_x27, _x28) {
    return _ref15.apply(this, arguments);
  };
}();

var editFile = exports.editFile = function () {
  var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(fileName, content) {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            _context16.next = 2;
            return writeFile(__dirname + '/../../' + fileName, content);

          case 2:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function editFile(_x30, _x31) {
    return _ref17.apply(this, arguments);
  };
}();

var renameFile = exports.renameFile = function () {
  var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(oldFileName, fileName) {
    var oldPath;
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            oldPath = __dirname + '/../../' + oldFileName;
            _context17.next = 3;
            return _fs2.default.rename(oldPath, oldPath.split('/').slice(0, -1).join('/') + '/' + fileName);

          case 3:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function renameFile(_x32, _x33) {
    return _ref18.apply(this, arguments);
  };
}();

var deleteFile = exports.deleteFile = function () {
  var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(fileName) {
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            _context18.next = 2;
            return _fs2.default.removeTree(__dirname + '/../../' + fileName);

          case 2:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function deleteFile(_x34) {
    return _ref19.apply(this, arguments);
  };
}();

var generateRandomImage = exports.generateRandomImage = function () {
  var _ref20 = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(hash, mimeType, thumbPath) {
    var canvas, ctx, data, img;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            canvas = new _canvas2.default(200, 200);
            ctx = canvas.getContext('2d');

            _jdenticon2.default.drawIcon(ctx, hash, 200);
            _context19.next = 5;
            return _fs2.default.read(__dirname + '/../../misc/thumbs/' + mimeType + '.png', 'b');

          case 5:
            data = _context19.sent;
            img = new _canvas2.default.Image();

            img.src = data;
            ctx.drawImage(img, 0, 0, 200, 200);
            _context19.next = 11;
            return new Promise(function (resolve, reject) {
              canvas.pngStream().pipe(_fs4.default.createWriteStream(thumbPath).on('error', reject).on('finish', resolve));
            });

          case 11:
            return _context19.abrupt('return', _context19.sent);

          case 12:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function generateRandomImage(_x35, _x36, _x37) {
    return _ref20.apply(this, arguments);
  };
}();

var getMimeType = exports.getMimeType = function () {
  var _ref21 = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(fileName) {
    return regeneratorRuntime.wrap(function _callee20$(_context20) {
      while (1) {
        switch (_context20.prev = _context20.next) {
          case 0:
            if (!(!fileName || typeof fileName !== 'string')) {
              _context20.next = 2;
              break;
            }

            return _context20.abrupt('return', null);

          case 2:
            _context20.prev = 2;
            _context20.next = 5;
            return new Promise(function (resolve, reject) {
              _child_process2.default.exec('file --brief --mime-type ' + fileName, {
                timeout: (0, _config2.default)('system.mimeTypeRetrievingTimeout'),
                encoding: 'utf8',
                stdio: [0, 'pipe', null]
              }, function (err, out) {
                if (err) {
                  return reject(err);
                }
                resolve(out ? out.replace(/\r*\n+/g, '') : null);
              });
            });

          case 5:
            return _context20.abrupt('return', _context20.sent);

          case 8:
            _context20.prev = 8;
            _context20.t0 = _context20['catch'](2);

            _logger2.default.error(_context20.t0.stack || _context20.t0);
            return _context20.abrupt('return', null);

          case 12:
          case 'end':
            return _context20.stop();
        }
      }
    }, _callee20, this, [[2, 8]]);
  }));

  return function getMimeType(_x38) {
    return _ref21.apply(this, arguments);
  };
}();

var getImageSize = exports.getImageSize = function () {
  var _ref22 = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(fileName) {
    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            return _context21.abrupt('return', new Promise(function (resolve, reject) {
              (0, _gm2.default)(fileName).size(function (err, value) {
                if (err) {
                  return reject(err);
                }
                resolve(value);
              });
            }));

          case 1:
          case 'end':
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function getImageSize(_x39) {
    return _ref22.apply(this, arguments);
  };
}();

var resizeImage = exports.resizeImage = function () {
  var _ref23 = _asyncToGenerator(regeneratorRuntime.mark(function _callee22(fileName, width, height, options) {
    return regeneratorRuntime.wrap(function _callee22$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            return _context22.abrupt('return', new Promise(function (resolve, reject) {
              (0, _gm2.default)(fileName).resize(width, height, options).quality(100).write(fileName, function (err) {
                if (err) {
                  return reject(err);
                }
                resolve();
              });
            }));

          case 1:
          case 'end':
            return _context22.stop();
        }
      }
    }, _callee22, this);
  }));

  return function resizeImage(_x40, _x41, _x42, _x43) {
    return _ref23.apply(this, arguments);
  };
}();

exports.selectThumbnailingPlugin = selectThumbnailingPlugin;
exports.parseForm = parseForm;
exports.isAudioType = isAudioType;
exports.isVideoType = isVideoType;
exports.isPdfType = isPdfType;
exports.isImageType = isImageType;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _canvas = require('canvas');

var _canvas2 = _interopRequireDefault(_canvas);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _du = require('du');

var _du2 = _interopRequireDefault(_du);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _fs3 = require('fs');

var _fs4 = _interopRequireDefault(_fs3);

var _gm = require('gm');

var _gm2 = _interopRequireDefault(_gm);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _jdenticon = require('jdenticon');

var _jdenticon2 = _interopRequireDefault(_jdenticon);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _mkpath = require('mkpath');

var _mkpath2 = _interopRequireDefault(_mkpath);

var _multiparty = require('multiparty');

var _multiparty2 = _interopRequireDefault(_multiparty);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _files = require('../models/files');

var FilesModel = _interopRequireWildcard(_files);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _vk = require('../helpers/vk');

var _vk2 = _interopRequireDefault(_vk);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var mkpath = (0, _promisifyNode2.default)('mkpath');

var FILE_RATINGS = new Set(['SFW', 'R-15', 'R-18', 'R-18G']);

_mkpath2.default.sync((0, _config2.default)('system.tmpPath') + '/form');

var fileTypePlugins = Tools.loadPlugins([__dirname + '/../file-types', __dirname + '/../file-types/custom']);

function setFileRating(file, id, fields) {
  var rating = fields['file_' + id + '_rating'];
  if (FILE_RATINGS.has(rating)) {
    file.rating = rating;
  } else {
    file.rating = 'SFW';
  }
}

function selectThumbnailingPlugin(mimeType) {
  //TODO: Cache
  return (0, _underscore2.default)(fileTypePlugins).find(function (plugin) {
    return plugin.match(mimeType);
  });
}

function parseForm() {
  var req = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var formFields = req.formFields,
      formFiles = req.formFiles;

  if (formFields) {
    return {
      fields: formFields,
      files: formFiles || []
    };
  }
  var form = new _multiparty2.default.Form();
  form.uploadDir = (0, _config2.default)('system.tmpPath') + '/form';
  form.autoFields = true;
  form.autoFiles = true;
  form.maxFieldsSize = (0, _config2.default)('system.maxFormFieldsSize');
  return new Promise(function (resolve, reject) {
    form.parse(req, function (err, fields, files) {
      if (err) {
        return reject(err);
      }
      resolve({
        fields: (0, _underscore2.default)(fields).mapObject(function (value, key) {
          return 1 === value.length ? value[0] : value;
        }),
        files: (0, _underscore2.default)((0, _underscore2.default)(files).toArray()).flatten().map(function (file) {
          file.name = file.originalFilename;
          return file;
        })
      });
    });
  });
}

function isAudioType(mimeType) {
  return 'application/ogg' === mimeType || /^audio\//.test(mimeType);
}

function isVideoType(mimeType) {
  return (/^video\//.test(mimeType)
  );
}

function isPdfType(mimeType) {
  return 'application/pdf' === mimeType;
}

function isImageType(mimeType) {
  return (/^image\//.test(mimeType)
  );
}
//# sourceMappingURL=files.js.map
