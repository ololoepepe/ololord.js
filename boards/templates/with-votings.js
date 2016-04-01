var merge = require("merge");
var Util = require("util");
var uuid = require("uuid");

var Board = require("../board");
var controller = require("../../helpers/controller");
var Database = require("../../helpers/database");
var Global = require("../../helpers/global");
var Tools = require("../../helpers/tools");

module.exports = function(name, title, options) {
    var board = new Board(name, title, options);

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
                    return Database.getPost("rpg", c.postNumber);
                }).then(function(post) {
                    if (!post)
                        return Promise.reject(Tools.translate("No such post"));
                    if (req.ip == post.user.ip)
                        return Promise.reject(Tools.translate("You can not participate in your own voting"));
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
                    controller.error(req, res, err, true);
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
                    controller.error(req, res, err, true);
                });
            }
        },
        {
            method: "post",
            path: "/setVotingOpened",
            handler: function(req, res) {
                var c = {};
                Tools.parseForm(req).then(function(result) {
                    c.password = Tools.sha1(result.fields.password);
                    c.opened = "true" == result.fields.opened;
                    return Database.getPost("rpg", +result.fields.postNumber);
                }).then(function(post) {
                    c.post = post;
                    if ((!c.password || c.password != post.user.password)
                        && (!req.hashpass || req.hashpass != post.user.hashpass)
                        && (Database.compareRegisteredUserLevels(req.level("rpg"), post.user.level) <= 0)) {
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
                    controller.error(req, res, err, true);
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
        translate("Remove this variant", "removeVoteVariantText");
    };

    board.postExtraData = function(req, fields, _, oldPost) {
        if (!fields.voteText)
            return Promise.reject(Tools.translate("No vote text provided"));
        var oldVariants = [];
        var newVariants = [];
        Tools.forIn(fields, function(value, key) {
            var match = key.match(/^voteVariant_(.+)$/);
            if (!match || !value)
                return;
            var id = match[1];
            if (oldPost && id && isNaN(+id)) {
                oldVariants.push({
                    text: value,
                    id: id
                });
            } else {
                newVariants.push({
                    text: value,
                    id: uuid.v1(),
                    users: []
                });
            }
        });
        if (oldVariants.length < 1 && newVariants.length < 1)
            return Promise.resolve(null);
        var p;
        if (fields.thread) {
            p = Database.getPost(fields.board, +fields.thread).then(function(opPost) {
                if (!opPost)
                    return Promise.reject(Tools.translate("No such thread"));
                if (req.ip != opPost.user.ip && (!req.hashpass || req.hashpass != opPost.user.hashpass))
                    return Promise.reject(Tools.translate("Attempt to attach voting while not being the OP"));
                return Promise.resolve();
            });
        } else {
            p = Promise.resolve();
        }
        return p.then(function() {
            var newData = {
                variants: newVariants,
                multiple: ("true" == fields.multipleVoteVariants),
                text: fields.voteText
            };
            var oldData = oldPost ? oldPost.extraData : null;
            if (!oldData)
                return Promise.resolve(newData);
            var oldIds = oldData.variants.reduce(function(acc, variant) {
                acc[variant.id] = variant.users;
                return acc;
            }, {});
            var invalid = oldVariants.some(function(variant) {
                return !oldIds.hasOwnProperty(variant.id);
            });
            if (invalid)
                return Promise.reject(Tools.translate("Invalid vote variant ID"));
            var ids = oldVariants.reduce(function(acc, variant) {
                acc[variant.id] = {};
                return acc;
            }, {});
            newData.variants = oldVariants.filter(function(variant) {
                return ids.hasOwnProperty(variant.id);
            }).map(function(variant) {
                variant.users = oldIds[variant.id];
                return variant;
            }).concat(newVariants);
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
            if (!users || users.length < 1)
                return Promise.resolve();
            return Database.db.sadd("voteUsers:" + postNumber, users);
        }).then(function() {
            return Tools.series(variantUsers, function(list, id) {
                if (!list || list.length < 1)
                    return Promise.resolve();
                return Database.db.sadd("voteVariantUsers:" + postNumber + ":" + id, list);
            });
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

    board.customPostBodyPart = function() {
        return {
            20: function(it, thread, post) {
                if (!post.extraData)
                    return "";
                var model = merge.recursive(it, post.extraData);
                model.thread = thread;
                model.post = post;
                return controller.sync("rpgPostBodyPart", model);
            }
        };
    };

    return board;
};
