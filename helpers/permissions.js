"use strict";

var _board = require("../boards/board");

var _board2 = _interopRequireDefault(_board);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = require("./config");
var Tools = require("./tools");

var p = {
    addFilesToPost: "MODER",
    deleteFile: null,
    deletePost: null,
    editAudioTags: null,
    editFileRating: null,
    editPost: "MODER",
    useRawHTMLMarkup: "MODER"
};

Tools.forIn(p, function (defLevel, key) {
    module.exports[key] = function (board) {
        if (typeof board == "string") board = _board2.default.board(board);
        if (!board) return config("permissions." + key, defLevel);
        return config("board." + board.name + ".permissions." + key, config("permissions." + key, defLevel));
    };
});

Object.defineProperty(module.exports, "Permissions", { value: p });
//# sourceMappingURL=permissions.js.map
