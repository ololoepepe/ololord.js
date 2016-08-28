'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createThumbnail = undefined;

var createThumbnail = exports.createThumbnail = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file, thumbPath, path) {
    var info;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return ImageMagick.convert(['-density', '300', path + '[0]', '-quality', '100', '+adjoin', '-resize', '200x200', 'png:' + thumbPath]);

          case 2:
            _context.next = 4;
            return ImageMagick.identify(thumbPath);

          case 4:
            info = _context.sent;
            return _context.abrupt('return', {
              thumbDimensions: {
                width: info.width,
                height: info.height
              }
            });

          case 6:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function createThumbnail(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

exports.match = match;
exports.suffixMatchesMimeType = suffixMatchesMimeType;
exports.defaultSuffixForMimeType = defaultSuffixForMimeType;
exports.thumbnailSuffixForMimeType = thumbnailSuffixForMimeType;

var _promisifyNode = require('promisify-node');

var _promisifyNode2 = _interopRequireDefault(_promisifyNode);

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var ImageMagick = (0, _promisifyNode2.default)('imagemagick');

function match(mimeType) {
  return Files.isPdfType(mimeType);
}

function suffixMatchesMimeType(suffix, mimeType) {
  return 'pdf' === suffix && 'application/pdf' === mimeType;
}

function defaultSuffixForMimeType(mimeType) {
  return 'application/pdf' === mimeType ? 'pdf' : null;
}

function thumbnailSuffixForMimeType(mimeType) {
  return 'application/pdf' === mimeType ? 'png' : null;
}
//# sourceMappingURL=pdf.js.map
