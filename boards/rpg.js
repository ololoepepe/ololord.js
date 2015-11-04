var merge = require("merge");

var Board = require("./board");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

board = new Board("rpg", Tools.translate.noop("Role-playing games", "boardTitle"));

board.extraScripts = function() {
    return [ { fileName: "rpg.js" } ];
};

board.addTranslations = function(translate) {
    translate("Voting is closed", "voteClosedText");
    translate("vote count:", "voteCountText");
    translate("Vote", "voteActionText");
    translate("Take vote back", "unvoteActionText");
    translate("Close voting", "closeVoteActionText");
    translate("Open voting", "openVoteActionText");
    translate("Vote:", "postFormLabelVote");
    translate("Text:", "voteTextText");
    translate("Multiple variants allowed:", "multipleVoteVariantsText");
    translate("Add variant", "addVoteVariantText");
};

board.postExtraData = function(req, fields, files) {
    return Promise.resolve();
};

board.renderPost = function(post, req) {
    return Board.prototype.renderPost.apply(board, arguments).then(function(post) {
        if (!post.extraData)
            return Promise.resolve(post);
        post.extraData.variants.forEach(function(variant) {
            if (!variant.users)
                return;
            for (var i = 0; i < variant.users.length; ++i) {
                if (variant.users[i].ip == req.trueIp) {
                    variant.ownIp = true;
                    break;
                }
            }
            delete variant.users;
        });
        return Promise.resolve(post);
    });
};

board.customPostBodyPart = function(n, _) {
    if (20 != n)
        return;
    return function(it, thread, post) {
        if (!post.extraData)
            return "";
        var model = merge.clone(post.extraData);
        model.post = post;
        return controller.sync(it.req, "rpgPostBodyPart", model);
    };
};

board.customPostFormField = function(n, req, thread) {
    if (50 != n)
        return;
    if (thread) {
        var user = thread.opPost.user;
        if (user.ip != req.trueIp && (!req.hashpass || user.hashpass != req.hashpass))
            return;
    }
    var _this = this;
    return function(it) {
        var model = {
            site: it.site,
            tr: merge.clone(it.tr),
            board: merge.clone(it.board),
            minimalisticPostform: it.minimalisticPostform
        };
        return controller.sync(it.req, "rpgPostFormField", model);
    };
};

board.testParameters = function(fields, files, creatingThread) {
    //
};

module.exports = board;
