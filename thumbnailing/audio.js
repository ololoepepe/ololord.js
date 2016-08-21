'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rerenderPostFileInfo = exports.createThumbnail = exports.AUDIO_TAGS = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file, thumbPath, path) {
    var metadata, duration, bitrate, extraData, thumbInfo;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return new Promise(function (resolve, reject) {
              _fluentFfmpeg2.default.ffprobe(path, function (err, metadata) {
                if (err) {
                  return reject(err);
                }
                resolve(metadata);
              });
            });

          case 2:
            metadata = _context.sent;
            duration = metadata.format.duration;
            bitrate = +metadata.format.bit_rate;
            extraData = {
              duration: +duration ? durationToString(duration) : duration,
              bitrate: bitrate ? Math.floor(bitrate / 1024) : 0
            };
            _context.prev = 6;
            _context.next = 9;
            return musicMetadata(_fs4.default.createReadStream(path));

          case 9:
            metadata = _context.sent;
            _context.next = 16;
            break;

          case 12:
            _context.prev = 12;
            _context.t0 = _context['catch'](6);

            Logger.error(_context.t0.stack || _context.t0);
            metadata = {};

          case 16:
            extraData.album = metadata.album || '';
            extraData.artist = metadata.artist && metadata.artist.length > 0 ? metadata.artist[0] : '';
            extraData.title = metadata.title || '';
            extraData.year = metadata.year || '';

            if (!(metadata.picture && metadata.picture.length > 0)) {
              _context.next = 25;
              break;
            }

            _context.next = 23;
            return _fs2.default.write(thumbPath, metadata.picture[0].data);

          case 23:
            _context.next = 27;
            break;

          case 25:
            _context.next = 27;
            return Tools.generateRandomImage(file.hash, file.mimeType, thumbPath);

          case 27:
            _context.next = 29;
            return ImageMagick.identify(thumbPath);

          case 29:
            thumbInfo = _context.sent;

            if (!(thumbInfo.width > 200 && thumbInfo.height > 200)) {
              _context.next = 35;
              break;
            }

            _context.next = 33;
            return ImageMagick.convert([thumbPath, '-resize', '200x200', thumbPath]);

          case 33:
            _context.next = 35;
            return ImageMagick.identify(thumbPath);

          case 35:
            return _context.abrupt('return', {
              extraData: extraData,
              thumbDimensions: {
                width: thumbInfo.width,
                height: thumbInfo.height
              }
            });

          case 36:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[6, 12]]);
  }));

  return function createThumbnail(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPostFileInfo = exports.rerenderPostFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(fileInfo) {
    var _ref, duration, bitrate, album, artist, title, year;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _ref = fileInfo.extraData || {};
            duration = _ref.duration;
            bitrate = _ref.bitrate;
            album = _ref.album;
            artist = _ref.artist;
            title = _ref.title;
            year = _ref.year;

            if (duration) {
              fileInfo.sizeText += ', ' + duration;
            }
            if (bitrate) {
              fileInfo.sizeText += ', ' + bitrate + ' ' + Tools.translate('kbps');
            }
            fileInfo.sizeTooltip = artist ? artist : Tools.translate('Unknown artist');
            fileInfo.sizeTooltip += ' - ';
            fileInfo.sizeTooltip += title ? title : Tools.translate('Unknown title');
            fileInfo.sizeTooltip += ' [';
            fileInfo.sizeTooltip += album ? album : Tools.translate('Unknown album');
            fileInfo.sizeTooltip += ']';
            if (year) {
              fileInfo.sizeTooltip += ' (' + year + ')';
            }

          case 16:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function rerenderPostFileInfo(_x4) {
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

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _fs3 = require('fs');

var _fs4 = _interopRequireDefault(_fs3);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ImageMagick = (0, _promisifyNode2.default)('imagemagick');
var musicMetadata = (0, _promisifyNode2.default)('musicmetadata');

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

defineMimeTypeSuffixes('application/ogg', 'ogg', 'png');
defineMimeTypeSuffixes('audio/mpeg', ['mpeg', 'mp1', 'm1a', 'mp3', 'm2a', 'mpa', 'mpg'], 'png');
defineMimeTypeSuffixes('audio/ogg', 'ogg', 'png');
defineMimeTypeSuffixes('audio/wav', 'wav', 'png');

var AUDIO_TAGS = exports.AUDIO_TAGS = ['album', 'artist', 'title', 'year'];

function match(mimeType) {
  return Tools.isAudioType(mimeType);
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
//# sourceMappingURL=audio.js.map
