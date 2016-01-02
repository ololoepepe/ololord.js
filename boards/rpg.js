var merge = require("merge");
var Util = require("util");
var uuid = require("uuid");

var Board = require("./board");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

board = new Board("rpg", Tools.translate.noop("Role-playing games", "boardTitle"));

var contains = function(variants, id) {
    for (var i = 0; i < variants.length; ++i) {
        if (variants[i].id == id)
            return true;
    }
    return false;
};

board.actionRoutes = function() {
    var _this = this;
    return [{
        method: "post",
        path: "/vote",
        handler: function(req, res) {
            var c = {};
            Tools.parseForm(req).then(function(result) {
                c.postNumber = +result.fields.postNumber;
                c.fields = result.fields;
                return Board.prototype.loadExtraData.call(_this, c.postNumber);
            }).then(function(extraData) {
                if (!extraData)
                    return Promise.reject(Tools.translate("This post does not have voting"));
                if (extraData.disabled)
                    return Promise.reject(Tools.translate("This voting is disabled"));
                c.extraData = extraData;
                return Database.db.sismember("voteUsers:" + c.postNumber, req.ip);
            }).then(function(isMember) {
                if (isMember)
                    return Promise.reject(Tools.translate("You have already voted"));
                var variants = [];
                if (c.extraData.multiple) {
                    var err = false;
                    Tools.forIn(c.fields, function(_, name) {
                        if (err)
                            return;
                        if (name.substr(0, 12) != "voteVariant_")
                            return;
                        var id = name.substr(12);
                        if (!contains(c.extraData.variants, id)) {
                            err = true;
                            return;
                        }
                        variants.push(id);
                    });
                    if (err)
                        return Promise.reject(Tools.translate("Invalid variant"));
                } else {
                    var id = c.fields.voteGroup;
                    if (!contains(c.extraData.variants, id))
                        return Promise.reject(Tools.translate("Invalid variant"));
                    variants.push(id);
                }
                if (variants.length < 1)
                    return Promise.reject(Tools.translate("No variant selected"));
                variants = variants.filter(function(id, index) {
                    return variants.indexOf(id) == index;
                });
                var promises = variants.map(function(id) {
                    return Database.db.sadd("voteVariantUsers:" + c.postNumber + ":" + id, req.ip);
                });
                return Promise.all(promises);
            }).then(function() {
                return Database.db.sadd("voteUsers:" + c.postNumber, req.ip);
            }).then(function() {
                return Database.db.hget("posts", "rpg:" + c.postNumber);
            }).then(function(post) {
                Global.generate("rpg", JSON.parse(post).threadNumber, c.postNumber, "edit");
                res.send({});
            }).catch(function(err) {
                controller.error(res, err, true);
            });
        }
    },
    {
        method: "post",
        path: "/unvote",
        handler: function(req, res) {
            var c = {};
            Tools.parseForm(req).then(function(result) {
                c.postNumber = +result.fields.postNumber;
                c.fields = result.fields;
                return _this.loadExtraData(c.postNumber);
            }).then(function(extraData) {
                if (!extraData)
                    return Promise.reject(Tools.translate("This post does not have voting"));
                if (extraData.disabled)
                    return Promise.reject(Tools.translate("This voting is disabled"));
                c.extraData = extraData;
                return Database.db.sismember("voteUsers:" + c.postNumber, req.ip);
            }).then(function(isMember) {
                if (!isMember)
                    return Promise.reject(Tools.translate("You have not voted yet"));
                var variants = [];
                c.extraData.variants.forEach(function(variant) {
                    if (!variant.users)
                        return;
                    if (variant.users.indexOf(req.ip) >= 0)
                        variants.push(variant.id);
                });
                if (variants.length < 1)
                    return Promise.reject(Tools.translate("Internal error"));
                var promises = variants.map(function(id) {
                    return Database.db.srem("voteVariantUsers:" + c.postNumber + ":" + id, req.ip);
                });
                return Promise.all(promises);
            }).then(function() {
                return Database.db.srem("voteUsers:" + c.postNumber, req.ip);
            }).then(function() {
                return Database.db.hget("posts", "rpg:" + c.postNumber);
            }).then(function(post) {
                Global.generate("rpg", JSON.parse(post).threadNumber, c.postNumber, "edit");
                res.send({});
            }).catch(function(err) {
                controller.error(res, err, true);
            });
        }
    },
    {
        method: "post",
        path: "/setVotingOpened",
        handler: function(req, res) {
            var c = {};
            Tools.parseForm(req).then(function(result) {
                c.password = Tools.password(result.fields.password);
                c.opened = "true" == result.fields.opened;
                return Database.getPost("rpg", +result.fields.postNumber);
            }).then(function(post) {
                c.post = post;
                if ((!c.password || c.password != post.user.password)
                    && (!req.hashpass || req.hashpass != post.user.hashpass)
                    && (Database.compareRegisteredUserLevels(req.level, post.user.level) <= 0)) {
                    return Promise.reject(Tools.translate("Not enough rights"));
                }
                return Board.prototype.loadExtraData.call(_this, post.number);
            }).then(function(extraData) {
                if (!extraData)
                    return Promise.reject(Tools.translate("This post does not have voting"));
                extraData.disabled = !c.opened;
                return Board.prototype.storeExtraData.call(_this, c.post.number, extraData);
            }).then(function(result) {
                Global.generate("rpg", c.post.threadNumber, c.post.number, "edit");
                res.send({});
            }).catch(function(err) {
                controller.error(res, err, true);
            });
        }
    }];
};

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
        if (opPost && (req.ip != opPost.user.ip && (!req.hashpass || req.hashpass != opPost.user.hashpass)))
            return Promise.reject(Tools.translate("Attempt to attach voting while not being the OP"));
        if (!fields.voteText)
            return Promise.reject(Tools.translate("No vote text provided"));
        return Promise.resolve({
            variants: variants,
            multiple: ("true" == fields.multipleVoteVariants),
            text: fields.voteText
        });
    });
};

board.postExtraData = function(req, fields, _, oldPost) {
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
                    return Promise.reject(Tools.translate("Invalid vote variant ID"));
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
    return Board.prototype.storeExtraData.apply(this, arguments).then(function() {
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
    return Board.prototype.loadExtraData.apply(this, arguments).then(function(extraData) {
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
    return Board.prototype.loadExtraData.apply(this, arguments).then(function(extraData) {
        c.extraData = extraData;
        return Database.db.del("voteUsers:" + postNumber);
    }).then(function() {
        var promises = [];
        Tools.forIn(c.extraData ? c.extraData.variants : {}, function(_, id) {
            promises.push(Database.db.del("voteVariantUsers:" + postNumber + ":" + id));
        });
        return Promise.all(promises);
    }).then(function() {
        return Board.prototype.removeExtraData.apply(this, arguments);
    });
};

board.renderPost = function(post) {
    return Board.prototype.renderPost.apply(this, arguments).then(function(post) {
        if (!post.extraData)
            return Promise.resolve(post);
        if (post.extraData.variants) {
            post.extraData.variants.forEach(function(variant) {
                variant.voteCount = variant.users ? variant.users.length : 0
                if (variant.users)
                    delete variant.users;
            });
        }
        if (post.extraData.users)
            delete post.extraData.users;
        return Promise.resolve(post);
    });
};

module.exports = board;
