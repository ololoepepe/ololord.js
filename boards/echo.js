var merge = require("merge");
var XRegExp = require("xregexp");

var Board = require("./board");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var board = new Board("echo", Tools.translate.noop("Boardsphere echo", "boardTitle"));

board.defineSetting("acceptedExternalBoardLinks", []);
board.defineSetting("maxLinkeLength", 150);

board.addTranslations = function(translate) {
    translate("Thread link:", "postFormLabelLink");
};

board.postExtraData = function(req, fields, files) {
    if (fields.thread)
        return Promise.reject("No post link provided");
    var link = fields.link;
    if (!link.substr(0, 4) != "http")
        link = "http://" + link;
    return Promise.resolve(link);
};

board.renderPost = function(post, req) {
    return Board.prototype.renderPost.apply(board, arguments).then(function(post) {
        if (post.number != post.threadNumber)
            return Promise.resolve(post);
        var model = {
            href: post.extraData,
            link: (post.subject || post.extraData)
        };
        post.subject = controller.sync(req, "echoPostSubject", model);
        post.subjectIsRaw = true;
        return Promise.resolve(post);
    });
};

board.customPostBodyPart = function(n, _) {
    if (0 != n)
        return;
    return function(it, thread, post) {
        if (!post.extraData || !it.thread)
            return "";
        var model = {
            link: post.extraData,
            deviceType: it.deviceType
        };
        return controller.sync(it.req, "echoPostBodyPart", model);
    };
};

board.customPostFormField = function(n, _, thread) {
    if (thread || 30 != n)
        return;
    var _this = this;
    return function(it) {
        var model = {
            tr: merge.clone(it.tr),
            board: merge.clone(it.board)
        };
        model.board.maxLinkLength = _this.maxLinkLength;
        return controller.sync(it.req, "echoPostFormField", model);
    };
};

board.testParameters = function(fields, files, creatingThread) {
    if (!creatingThread)
        return;
    if (!fields.link)
        return { error: "Thread link is empty" };
    if (fields.link.length > this.maxLinkLength)
        return { error: "Thread link is too long" };
    for (var i = 0; i < this.acceptedExternalBoardLinks.length; ++i) {
        if ((new XRegExp(this.acceptedExternalBoardLinks[i])).test(fields.link))
            return;
    }
    return { error: "This board/thread may not be accepted" };
};

module.exports = board;
