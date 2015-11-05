var merge = require("merge");
var uuid = require("uuid");

var Board = require("./board");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
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

var extraData = function(req, fields, edit) {
    var variants = [];
    Tools.forIn(fields, function(value, key) {
        if (key.substr(0, 12) != "voteVariant_")
            return;
        if (!value)
            return;
        var id = key.substr(12);
        variants.push({
            text: value,
            id: ((edit && id) ? id : null)
        });
    });
    if (variants.length < 1)
        return Promise.resolve(null);
    var p;
    if (fields.thread) {
        p = Database.getPost(fields.board, +fields.thread);
    } else {
        p = Promise.resolve();
    }
    return p.then(function(opPost) {
        if (opPost && (req.trueIp != opPost.user.ip && (!req.hashpass || req.hashpass != opPost.user.hashpass)))
            return Promise.reject("Attempt to attach voting while not being the OP");
        if (!fields.voteText)
            return Promise.reject("No vote text provided");
        return Promise.resolve({
            variants: variants,
            multiple: ("true" == fields.multipleVoteVariants),
            text: fields.voteText
        });
    });
};

board.postExtraData = function(req, fields, files, oldPost) {
    var oldData = oldPost ? oldPost.extraData : null;
    var newData;
    return extraData(req, fields).then(function(data) {
        newData = data;
        if (!newData)
            return Promise.resolve(null);
        if (!oldData)
            return Promise.resolve(newData);
        var variants = [];
        var ids = [];
        for (var i = 0; i < newData.variants.length; ++i) {
            var variant = newData.variants[i];
            var id = variant.id;
            if (id) {
                var text = oldData.variants.reduce(function(text, oldVariant) {
                    if (text)
                        return text;
                    return (oldVariant.id == variant.id) ? oldVariant.text : "";
                }, "");
                if (!text)
                    return Promise.reject("Invalid vote ID");
            } else {
                id = uuid.v1();
                variants.push({
                    text: variant.text,
                    id: id
                });
            }
            ids.push(id);
        }
        variants = oldData.variants.concat(variants);
        for (var i = variants.length - 1; i >= 0; --i) {
            if (ids.indexOf(variants[i].id) < 0)
                variants.splice(i, 1);
        }
        if (variants.length < 1)
            return Promise.resolve(null);
        newData.variants = variants;
        newData.users = oldData.users;
        return Promise.resolve(newData);
    });
};

board.renderPost = function(post, req) {
    return Board.prototype.renderPost.apply(board, arguments).then(function(post) {
        if (!post.extraData)
            return Promise.resolve(post);
        if (post.extraData.variants) {
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
        }
        if (post.extraData.users)
            delete post.extraData.users;
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

/*board.testParameters = function(fields, files, creatingThread) {
    //
};*/

module.exports = board;
