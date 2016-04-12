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

    board.actionRoutes = function() {
        var _this = this;
        return [{
            method: "post",
            path: "/like",
            handler: function(req, res) {
                var c = {};
                Tools.parseForm(req).then(function(result) {
                    c.postNumber = +result.fields.postNumber;
                    c.fields = result.fields;
                    return Database.db.hget("posts", board.name + ":" + c.postNumber);
                }).then(function(post) {
                    if (!post)
                        return Promise.reject(Tools.translate("No such post"));
                    c.post = JSON.parse(post);
                    return Database.db.hget("threads:" + board.name, c.post.threadNumber);
                }).then(function(thread) {
                    if (!thread)
                        return Promise.reject(Tools.translate("No such thread"));
                    return Board.prototype.loadExtraData.call(_this, c.postNumber);
                }).then(function(extraData) {
                    c.extraData = extraData || {
                        likes: [],
                        dislikes: []
                    };
                    var ind = c.extraData.likes.indexOf(req.ip);
                    if (ind >= 0) {
                        c.extraData.likes.splice(ind, 1);
                    } else {
                        ind = c.extraData.dislikes.indexOf(req.ip);
                        if (ind >= 0)
                            c.extraData.dislikes.splice(ind, 1);
                        c.extraData.likes.push(req.ip);
                    }
                    return Board.prototype.storeExtraData.call(_this, c.postNumber, c.extraData);
                }).then(function() {
                    Global.generate(board.name, c.post.threadNumber, c.postNumber, "edit");
                    res.send({});
                }).catch(function(err) {
                    controller.error(req, res, err, true);
                });
            }
        },
        {
            method: "post",
            path: "/dislike",
            handler: function(req, res) {
                var c = {};
                Tools.parseForm(req).then(function(result) {
                    c.postNumber = +result.fields.postNumber;
                    c.fields = result.fields;
                    return Database.db.hget("posts", board.name + ":" + c.postNumber);
                }).then(function(post) {
                    if (!post)
                        return Promise.reject(Tools.translate("No such post"));
                    c.post = JSON.parse(post);
                    return Database.db.hget("threads:" + board.name, c.post.threadNumber);
                }).then(function(thread) {
                    if (!thread)
                        return Promise.reject(Tools.translate("No such thread"));
                    return Board.prototype.loadExtraData.call(_this, c.postNumber);
                }).then(function(extraData) {
                    c.extraData = extraData || {
                        likes: [],
                        dislikes: []
                    };
                    var ind = c.extraData.dislikes.indexOf(req.ip);
                    if (ind >= 0) {
                        c.extraData.dislikes.splice(ind, 1);
                    } else {
                        ind = c.extraData.likes.indexOf(req.ip);
                        if (ind >= 0)
                            c.extraData.likes.splice(ind, 1);
                        c.extraData.dislikes.push(req.ip);
                    }
                    return Board.prototype.storeExtraData.call(_this, c.postNumber, c.extraData);
                }).then(function() {
                    Global.generate(board.name, c.post.threadNumber, c.postNumber, "edit");
                    res.send({});
                }).catch(function(err) {
                    controller.error(req, res, err, true);
                });
            }
        }];
    };

    board.extraScripts = function() {
        return [ { fileName: "with-likes.js" } ];
    };

    board.addTranslations = function(translate) {
        translate("Like", "likeText");
        translate("Dislike", "dislikeText");
    };

    board.renderPost = function(post) {
        return Board.prototype.renderPost.apply(this, arguments).then(function(post) {
            if (!post.extraData) {
                post.extraData = {
                    likes: [],
                    dislikes: []
                };
            }
            post.extraData.likeCount = post.extraData.likes ? post.extraData.likes.length : 0;
            if (post.extraData.likes)
                delete post.extraData.likes;
            post.extraData.dislikeCount = post.extraData.dislikes ? post.extraData.dislikes.length : 0;
            if (post.extraData.dislikes)
                delete post.extraData.dislikes;
            return Promise.resolve(post);
        });
    };

    board.customPostHeaderPart = function() {
        return {
            100: function(it, thread, post) {
                var model = merge.recursive(it, post.extraData || {
                    likeCount: 0,
                    dislikeCount: 0
                });
                model.thread = thread;
                model.post = post;
                model.archived = thread.archived;
                return controller.sync("withLikesPostHeaderPart", model);
            }
        };
    };

    return board;
};
