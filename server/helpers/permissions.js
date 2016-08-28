'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PERMISSIONS = undefined;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PERMISSIONS = exports.PERMISSIONS = {
  addFilesToPost: 'MODER',
  deleteFile: null,
  deletePost: null,
  editAudioTags: null,
  editFileRating: null,
  editPost: 'MODER',
  useRawHTMLMarkup: 'MODER'
};

(0, _underscore2.default)(PERMISSIONS).each(function (defaultLevel, key) {
  module.exports[key] = function (board) {
    if (typeof board === 'string') {
      board = _board2.default.board(board);
    }
    if (!board) {
      return (0, _config2.default)('permissions.' + key, defaultLevel);
    }
    return (0, _config2.default)('board.' + board.name + '.permissions.' + key, (0, _config2.default)('permissions.' + key, defaultLevel));
  };
});
//# sourceMappingURL=permissions.js.map
