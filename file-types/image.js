'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rerenderPostFileInfo = exports.createThumbnail = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file, thumbPath) {
    var suffix, info, args, prefix, thumbInfo, result, hash;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            suffix = 'image/gif' === file.mimeType ? '[0]' : '';
            _context.next = 3;
            return ImageMagick.identify(file.path + suffix);

          case 3:
            info = _context.sent;
            args = [file.path + suffix];

            if (info.width > 200 || info.height > 200) {
              args.push('-resize', '200x200');
            }
            prefix = 'image/gif' === file.mimeType ? 'png:' : '';

            args.push(prefix + thumbPath);
            _context.next = 10;
            return ImageMagick.convert(args);

          case 10:
            _context.next = 12;
            return ImageMagick.identify(thumbPath);

          case 12:
            thumbInfo = _context.sent;
            result = {
              dimensions: {
                width: info.width,
                height: info.height
              },
              thumbDimensions: _defineProperty({
                thumbInfo: info.width
              }, 'thumbInfo', info.height)
            };

            if (!(0, _config2.default)('system.phash.enabled')) {
              _context.next = 19;
              break;
            }

            _context.next = 17;
            return (0, _phashImage2.default)(thumbPath, true);

          case 17:
            hash = _context.sent;

            result.ihash = hash.toString();

          case 19:
            return _context.abrupt('return', result);

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function createThumbnail(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var rerenderPostFileInfo = exports.rerenderPostFileInfo = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(fileInfo) {
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

  return function rerenderPostFileInfo(_x3) {
    return ref.apply(this, arguments);
  };
}();

exports.match = match;
exports.suffixMatchesMimeType = suffixMatchesMimeType;
exports.defaultSuffixForMimeType = defaultSuffixForMimeType;
exports.thumbnailSuffixForMimeType = thumbnailSuffixForMimeType;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _phashImage = require('phash-image');

var _phashImage2 = _interopRequireDefault(_phashImage);

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

defineMimeTypeSuffixes('image/gif', 'gif');
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
