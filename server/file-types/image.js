'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderPostFileInfo = exports.createThumbnail = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file, thumbPath) {
    var isGIF, suffix, info, thumbInfo, result, hash;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            isGIF = 'image/gif' === file.mimeType;
            suffix = isGIF ? '[0]' : '';
            _context.next = 4;
            return Files.getImageSize(file.path + suffix);

          case 4:
            info = _context.sent;
            _context.next = 7;
            return new Promise(function (resolve, reject) {
              var stream = (0, _gm2.default)(file.path + suffix);
              if (isGIF) {
                stream = stream.setFormat('png');
              }
              stream.resize(200, 200).quality(100).write(thumbPath, function (err) {
                if (err) {
                  return reject(err);
                }
                resolve();
              });
            });

          case 7:
            _context.next = 9;
            return Files.getImageSize(thumbPath);

          case 9:
            thumbInfo = _context.sent;

            if (thumbInfo) {
              _context.next = 12;
              break;
            }

            throw new Error(Tools.translate('Failed to identify image file: $[1]', '', thumbPath));

          case 12:
            result = {
              dimensions: {
                width: info.width,
                height: info.height
              },
              thumbDimensions: {
                width: thumbInfo.width,
                height: thumbInfo.height
              }
            };

            if (!(0, _config2.default)('system.phash.enabled')) {
              _context.next = 18;
              break;
            }

            _context.next = 16;
            return (0, _phashImage2.default)(thumbPath, true);

          case 16:
            hash = _context.sent;

            result.ihash = hash.toString();

          case 18:
            return _context.abrupt('return', result);

          case 19:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function createThumbnail(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var renderPostFileInfo = exports.renderPostFileInfo = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(fileInfo) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (fileInfo.dimensions) {
              fileInfo.sizeText += ', ' + fileInfo.dimensions.width + 'x' + fileInfo.dimensions.height;
            }
            return _context2.abrupt('return', fileInfo);

          case 2:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function renderPostFileInfo(_x3) {
    return _ref2.apply(this, arguments);
  };
}();

exports.match = match;
exports.suffixMatchesMimeType = suffixMatchesMimeType;
exports.defaultSuffixForMimeType = defaultSuffixForMimeType;
exports.thumbnailSuffixForMimeType = thumbnailSuffixForMimeType;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _gm = require('gm');

var _gm2 = _interopRequireDefault(_gm);

var _phashImage = require('phash-image');

var _phashImage2 = _interopRequireDefault(_phashImage);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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

defineMimeTypeSuffixes('image/gif', 'gif', 'png');
defineMimeTypeSuffixes('image/jpeg', ['jpeg', 'jpg']);
defineMimeTypeSuffixes('image/png', 'png');

function match(mimeType) {
  return Files.isImageType(mimeType);
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
//# sourceMappingURL=image.js.map
