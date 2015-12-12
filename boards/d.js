var Board = require("./board");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var board = new Board("d", Tools.translate.noop("Board /d/iscussion", "boardTitle"));

board.extraScripts = function() {
    return [ { fileName: "d.js" } ];
};

board.postExtraData = function(req, fields, files, oldPost) {
    return Promise.resolve(oldPost ? oldPost.extraData : (req.headers["user-agent"] || null));
};

module.exports = board;
