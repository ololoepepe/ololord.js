var Board = require("../boards/board");
var config = require("./config");
var Tools = require("./tools");

Tools.forIn({
    addFilesToPost: "MODER",
    deleteFile: null,
    deletePost: null,
    editPost: "MODER",
    seeUserIp: "ADMIN"
}, function(defLevel, key) {
    module.exports[key] = function(board) {
        if (typeof board == "string")
            board = Board.board(board);
        if (!board)
            return config(`permissions.${key}`, defLevel);
        return config(`board.${board.name}.permissions.${key}`, config(`permissions.${key}`, defLevel));
    };
});
