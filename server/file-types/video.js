'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderPostFileInfo = exports.createThumbnail = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(file, thumbPath, path) {
    var _this = this;

    var metadata, _getDimensions, width, height, result, duration, bitrate, thumbInfo, _thumbInfo;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return new Promise(function (resolve, reject) {
              _fluentFfmpeg2.default.ffprobe(path, function (err, metadata) {
                if (err) {
                  return reject(err);
                }
                resolve(metadata);
              });
            });

          case 2:
            metadata = _context2.sent;
            _getDimensions = getDimensions(metadata);
            width = _getDimensions.width;
            height = _getDimensions.height;
            result = {};

            if (width && height) {
              result.dimensions = {
                width: width,
                height: height
              };
            }
            duration = metadata.format.duration;
            bitrate = +metadata.format.bit_rate;

            result.extraData = {
              duration: +duration ? durationToString(duration) : duration,
              bitrate: bitrate ? Math.floor(bitrate / 1024) : 0
            };
            _context2.prev = 11;
            return _context2.delegateYield(regeneratorRuntime.mark(function _callee() {
              var pngThumbPath;
              return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      pngThumbPath = thumbPath + '.png';
                      _context.next = 3;
                      return new Promise(function (resolve, reject) {
                        (0, _fluentFfmpeg2.default)(path).frames(1).on('error', reject).on('end', resolve).save(pngThumbPath);
                      });

                    case 3:
                      file.thumbPath = pngThumbPath;

                    case 4:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _callee, _this);
            })(), 't0', 13);

          case 13:
            _context2.next = 18;
            break;

          case 15:
            _context2.prev = 15;
            _context2.t1 = _context2['catch'](11);

            _logger2.default.error(_context2.t1.stack || _context2.t1);

          case 18:
            if (!(thumbPath === file.thumbPath)) {
              _context2.next = 24;
              break;
            }

            _context2.next = 21;
            return Files.generateRandomImage(file.hash, file.mimeType, thumbPath);

          case 21:
            result.thumbDimensions = {
              width: 200,
              height: 200
            };
            _context2.next = 39;
            break;

          case 24:
            _context2.next = 26;
            return Files.getImageSize(file.thumbPath);

          case 26:
            thumbInfo = _context2.sent;

            if (thumbInfo) {
              _context2.next = 29;
              break;
            }

            throw new Error(Tools.translate('Failed to identify image file: $[1]', '', file.thumbPath));

          case 29:
            result.thumbDimensions = {
              width: thumbInfo.width,
              height: thumbInfo.height
            };

            if (!(result.thumbDimensions.width > 200 || result.thumbDimensions.height > 200)) {
              _context2.next = 39;
              break;
            }

            _context2.next = 33;
            return Files.resizeImage(file.thumbPath, 200, 200);

          case 33:
            _context2.next = 35;
            return Files.getImageSize(file.thumbPath);

          case 35:
            _thumbInfo = _context2.sent;

            if (_thumbInfo) {
              _context2.next = 38;
              break;
            }

            throw new Error(Tools.translate('Failed to identify image file: $[1]', '', file.thumbPath));

          case 38:
            result.thumbDimensions = {
              width: _thumbInfo.width,
              height: _thumbInfo.height
            };

          case 39:
            return _context2.abrupt('return', result);

          case 40:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[11, 15]]);
  }));

  return function createThumbnail(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var renderPostFileInfo = exports.renderPostFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(fileInfo) {
    var _ref2, duration, bitrate;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (fileInfo.dimensions) {
              fileInfo.sizeText += ', ' + fileInfo.dimensions.width + 'x' + fileInfo.dimensions.height;
            }
            _ref2 = fileInfo.extraData || {};
            duration = _ref2.duration;
            bitrate = _ref2.bitrate;

            if (duration) {
              fileInfo.sizeText += ', ' + duration;
            }
            if (bitrate) {
              fileInfo.sizeTooltip = bitrate + ' ' + Tools.translate('kbps');
            }

          case 6:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function renderPostFileInfo(_x4) {
    return ref.apply(this, arguments);
  };
}();

exports.match = match;
exports.suffixMatchesMimeType = suffixMatchesMimeType;
exports.defaultSuffixForMimeType = defaultSuffixForMimeType;
exports.thumbnailSuffixForMimeType = thumbnailSuffixForMimeType;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fluentFfmpeg = require('fluent-ffmpeg');

var _fluentFfmpeg2 = _interopRequireDefault(_fluentFfmpeg);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var MIME_TYPES_FOR_SUFFIXES = new Map();
var DEFAULT_SUFFIXES_FOR_MIME_TYPES = new Map();
var THUMB_SUFFIXES_FOR_MIME_TYPE = new Map();

function getDimensions(metadata) {
  var stream = (0, _underscore2.default)(metadata.streams).find(function (_ref) {
    var width = _ref.width;
    var height = _ref.height;

    return !isNaN(+width) && !isNaN(+height);
  });
  if (!stream) {
    return {};
  }
  return {
    width: Tools.option(stream.width, 'number', 0, { test: function test(w) {
        return w > 0;
      } }),
    height: Tools.option(stream.height, 'number', 0, { test: function test(h) {
        return h > 0;
      } })
  };
}

function durationToString(duration) {
  duration = Math.floor(+duration);
  var hours = Tools.pad(Math.floor(duration / 3600), 2, '0');
  duration %= 3600;
  var minutes = Tools.pad(Math.floor(duration / 60), 2, '0');
  var seconds = Tools.pad(duration % 60, 2, '0');
  return hours + ':' + minutes + ':' + seconds;
}

function defineMimeTypeSuffixes(mimeType, extensions, thumbSuffix) {
  if (!(0, _underscore2.default)(extensions).isArray()) {
    extensions = [extensions];
  }
  extensions.forEach(function (extension) {
    MIME_TYPES_FOR_SUFFIXES.set(extension, mimeType);
  });
  DEFAULT_SUFFIXES_FOR_MIME_TYPES.set(mimeType, extensions[0]);
  THUMB_SUFFIXES_FOR_MIME_TYPE.set(mimeType, thumbSuffix);
}

defineMimeTypeSuffixes('video/mp4', 'mp4', 'png');
defineMimeTypeSuffixes('video/webm', 'webm', 'png');

function match(mimeType) {
  return Files.isVideoType(mimeType);
}

function suffixMatchesMimeType(suffix, mimeType) {
  return MIME_TYPES_FOR_SUFFIXES.get(suffix) === mimeType;
}

function defaultSuffixForMimeType(mimeType) {
  return DEFAULT_SUFFIXES_FOR_MIME_TYPES.get(mimeType) || null;
}

function thumbnailSuffixForMimeType(mimeType) {
  return THUMB_SUFFIXES_FOR_MIME_TYPE.get(mimeType);
}
//# sourceMappingURL=video.js.map
