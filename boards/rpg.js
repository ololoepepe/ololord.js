var merge = require("merge");
var Util = require("util");
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
            id: ((edit && id && isNaN(+id)) ? id : null)
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
    return extraData(req, fields, oldPost).then(function(data) {
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
                var exists = oldData.variants.reduce(function(exists, oldVariant) {
                    if (exists)
                        return exists;
                    if (oldVariant.id != variant.id)
                        return false;
                    oldVariant.text = variant.text;
                    return true;
                }, false);
                if (!exists)
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

board.storeExtraData = function(postNumber, extraData) {
    if (Util.isNullOrUndefined(extraData))
        return Promise.resolve();
    var users = extraData.users;
    if (extraData.users)
        delete extraData.users;
    var variantUsers = {};
    Tools.forIn(extraData.variants, function(variant) {
        if (!variant.users)
            return;
        variantUsers[variant.id] = variant.users;
        delete variant.users;
    });
    return Board.prototype.storeExtraData.apply(board, arguments).then(function() {
        if (!users)
            return Promise.resolve();
        return Database.db.sadd("voteUsers:" + postNumber, users);
    }).then(function() {
        var promises = [];
        Tools.forIn(variantUsers, function(list, id) {
            if (!list || list.length < 1)
                return;
            promises.push(Database.db.sadd("voteVariantUsers:" + postNumber + ":" + id, list));
        });
        return Promise.all(promises);
    });
};

board.loadExtraData = function(postNumber) {
    var c = {};
    return Board.prototype.loadExtraData.apply(board, arguments).then(function(extraData) {
        c.extraData = extraData;
        return Database.db.smembers("voteUsers:" + postNumber);
    }).then(function(users) {
        if (c.extraData && users)
            c.extraData.users = users;
        var promises = [];
        Tools.forIn(c.extraData ? c.extraData.variants : {}, function(variant) {
            var key = "voteVariantUsers:" + postNumber + ":" + variant.id;
            promises.push(Database.db.smembers(key).then(function(list) {
                if (list)
                    variant.users = list;
                return Promise.resolve();
            }));
        });
        return Promise.all(promises);
    }).then(function() {
        return Promise.resolve(c.extraData);
    });
};

board.removeExtraData = function(postNumber) {
    var c = {};
    return Board.prototype.loadExtraData.apply(board, arguments).then(function(extraData) {
        c.extraData = extraData;
        return Database.db.del("voteUsers:" + postNumber);
    }).then(function() {
        var promises = [];
        Tools.forIn(c.extraData ? c.extraData.variants : {}, function(_, id) {
            promises.push(Database.db.del("voteVariantUsers:" + postNumber + ":" + id));
        });
        return Promise.all(promises);
    }).then(function() {
        return Board.prototype.removeExtraData.apply(board, arguments);
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
                variant.voteCount = variant.users.length;
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

module.exports = board;
