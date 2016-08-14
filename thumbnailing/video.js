'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createThumbnail = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(file, thumbPath, path) {
    var _this = this;

    var metadata, width, height, result, duration, bitrate, extraData, thumbInfo, _thumbInfo;

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
            width = Tools.option(metadata.streams[0].width, 'number', 0, { test: function test(w) {
                return w > 0;
              } });
            height = Tools.option(metadata.streams[0].height, 'number', 0, { test: function test(h) {
                return h > 0;
              } });
            result = {};

            if (width && height) {
              result.dimensions = {
                width: width,
                height: height
              };
            }
            duration = metadata.format.duration;
            bitrate = +metadata.format.bit_rate;
            extraData = {
              duration: +duration ? durationToString(duration) : duration,
              bitrate: bitrate ? Math.floor(bitrate / 1024) : 0
            };
            _context2.prev = 10;
            return _context2.delegateYield(regeneratorRuntime.mark(function _callee() {
              var pngThumbPath;
              return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      pngThumbPath = filePath + '.png';
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
            })(), 't0', 12);

          case 12:
            _context2.next = 17;
            break;

          case 14:
            _context2.prev = 14;
            _context2.t1 = _context2['catch'](10);

            _logger2.default.error(_context2.t1.stack || _context2.t1);

          case 17:
            if (!(thumbPath === file.thumbPath)) {
              _context2.next = 23;
              break;
            }

            _context2.next = 20;
            return Tools.generateRandomImage(file.hash, file.mimeType, thumbPath);

          case 20:
            result.dimensions = result.dimensions || {
              width: 200,
              height: 200
            };
            _context2.next = 35;
            break;

          case 23:
            if (result.dimensions) {
              _context2.next = 28;
              break;
            }

            _context2.next = 26;
            return ImageMagick.identify(thumbPath);

          case 26:
            thumbInfo = _context2.sent;

            result.dimensions = {
              width: thumbInfo.width,
              height: thumbInfo.height
            };

          case 28:
            if (!(result.dimensions.width > 200 || result.dimensions.height > 200)) {
              _context2.next = 35;
              break;
            }

            _context2.next = 31;
            return ImageMagick.convert([thumbPath, '-resize', '200x200', thumbPath]);

          case 31:
            _context2.next = 33;
            return ImageMagick.identify(thumbPath);

          case 33:
            _thumbInfo = _context2.sent;

            result.dimensions = {
              width: _thumbInfo.width,
              height: _thumbInfo.height
            };

          case 35:
            return _context2.abrupt('return', result);

          case 36:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[10, 14]]);
  }));

  return function createThumbnail(_x, _x2, _x3) {
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

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ImageMagick = (0, _promisifyNode2.default)('imagemagick');

var MIME_TYPES_FOR_SUFFIXES = new Map();
var DEFAULT_SUFFIXES_FOR_MIME_TYPES = new Map();
var THUMB_SUFFIXES_FOR_MIME_TYPE = new Map();

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
  return Tools.isVideoType(mimeType);
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
