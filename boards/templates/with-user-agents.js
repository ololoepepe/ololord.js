var Board = require("../board");
var controller = require("../../helpers/controller");
var Tools = require("../../helpers/tools");

module.exports = function(name, title, options) {
    var board = new Board(name, title, options);

    board.extraScripts = function() {
        return [ { fileName: "d.js" } ];
    };

    board.postExtraData = function(req, fields, _, oldPost) {
        return Promise.resolve(oldPost ? oldPost.extraData : (req.headers["user-agent"] || null));
    };

    board.customPostBodyPart = function(n, it, thread, post) {
        return {
            20: function(it, thread, post) {
                if (!post.extraData)
                    return "";
                var model = {
                    userAgent: post.extraData,
                    post: post
                };
                return controller.sync("dPostBodyPart", model);
            }
        };
    };

    return board;
};
