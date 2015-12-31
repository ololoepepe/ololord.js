var merge = require("merge");
var XRegExp = require("xregexp");

var Board = require("./board");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var board = new Board("echo", Tools.translate.noop("Boardsphere echo", "boardTitle"));

board.defineSetting("acceptedExternalBoardLinks", []);
board.defineSetting("maxLinkLength", 150);

board.customBoardInfoFields = function() {
    return ["maxLinkLength"];
};

board.extraScripts = function() {
    return [ { fileName: "echo.js" } ];
};

board.addTranslations = function(translate) {
    translate("Thread link:", "postFormLabelLink");
};

var _board = board;

var testLink = function(link) {
    if (!link)
        return { error: "Thread link is empty" };
    if (link.length > _board.maxLinkLength)
        return { error: "Thread link is too long" };
    for (var i = 0; i < _board.acceptedExternalBoardLinks.length; ++i) {
        if ((new XRegExp(_board.acceptedExternalBoardLinks[i])).test(link))
            return;
    }
    return { error: "This board/thread may not be accepted" };
};

board.postExtraData = function(req, fields, files, oldPost) {
    if (fields.thread)
        return Promise.resolve(null);
    if (!oldPost || !oldPost.extraData)
        return Promise.resolve(null);
    var link = fields.link;
    var result = testLink(link);
    if (result)
        return Promise.reject(result);
    if (!link.substr(0, 4) != "http")
        link = "http://" + link;
    return Promise.resolve(link);
};

board.renderPost = function(post) {
    return Board.prototype.renderPost.apply(this, arguments).then(function(post) {
        if (post.number != post.threadNumber)
            return Promise.resolve(post);
        var model = {
            href: post.extraData,
            link: (post.subject || post.extraData)
        };
        post.subject = controller.sync("echoPostSubject", model);
        post.subjectIsRaw = true;
        return Promise.resolve(post);
    });
};

board.testParameters = function(fields, files, creatingThread) {
    if (!creatingThread)
        return;
    return testLink(fields.link);
};

module.exports = board;
