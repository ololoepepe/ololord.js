var Board = require("./board");
var Tools = require("../helpers/tools");

var board = new Board("d", Tools.translate.noop("Board /d/iscussion", "boardTitle"));

board.postExtraData = function(req, fields, files) {
    return req.headers["user-agent"] || null;
};

board.customPostBodyPart = function(n) {
    if (20 != n)
        return;
    return function(it, thread, post) {
        if (!post.extraData)
            return "";
        var ua = post.extraData;
        return `<tr>\n<td colspan="${post.fileInfos.length + 2}">\n`
            + `<font face="monospace">${(new Array(ua.length + 1).join("-"))}<br />${ua}</font>\n`
            + `</td>\n</tr>`;
    };
};

module.exports = board;
