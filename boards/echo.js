var XRegExp = require("xregexp");

var Board = require("./board");
var Tools = require("../helpers/tools");

var board = new Board("echo", Tools.translate.noop("Boardsphere echo", "boardTitle"));

board.defineSetting("acceptedExternalBoardLinks", []);

board.postExtraData = function(req, fields, files) {
    if (fields.thread)
        return Promise.resolve(null);
    var link = fields.link;
    if (!link.substr(0, 4) != "http")
        link = "http://" + link;
    return link;
};

board.renderPost = function(post, req) {
    Board.prototype.renderPost.apply(board, arguments);
    if (post.number != post.threadNumber)
        return;
    post.subject = `<a href="${post.extraData}" target="_blank">${post.subject || post.link}</a>`;
    post.subjectIsRaw = true;
};

board.customPostBodyPart = function(n) {
    if (0 != n)
        return;
    return function(it, thread, post) {
        if (!post.extraData || !it.thread)
            return "";
        return `<iframe src="${post.extraData}" name="externalThreadFrame" scrolling="auto" `
            + `class="externalThreadFrame ${it.deviceType}" frameborder="yes"></iframe>`;
    };
};

board.testParameters = function(fields, files, creatingThread) {
    if (!creatingThread)
        return;
    if (!fields.link)
        return { error: "Thread link is empty" };
    if (fields.link.length > 150)
        return { error: "Thread link is too long" };
    for (var i = 0; i < this.acceptedExternalBoardLinks.length; ++i) {
        if ((new XRegExp(this.acceptedExternalBoardLinks[i])).test(fields.link))
            return;
    }
    return { error: "This board/thread may not be accepted" };
};

module.exports = board;
