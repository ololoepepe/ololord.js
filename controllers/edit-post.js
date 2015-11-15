var express = require("express");
var merge = require("merge");

var Board = require("../boards");
var boardModel = require("../models/board");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/editPost.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var postNumber = +req.query.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return controller.error(req, res, "Invalid post number");
    var model = {};
    model.title = Tools.translate("Edit post", "pageTitle");
    model.extraScripts = board.extraScripts();
    model.includeBoardScripts = true;
    Database.getPost(board.name, postNumber, { withExtraData: true }).then(function(post) {
        model.post = post;
        return boardModel.getThreadInfo(board, req.hashpass, post.threadNumber);
    }).then(function(thread) {
        model.thread = thread;
        model.showSubmitButton = true;
        model = merge.recursive(model, controller.boardModel(board));
        model.customEditPostDialogPart = {};
        for (var i = 0; i < 110; i += 10)
            model.customEditPostDialogPart[i] = board.customEditPostDialogPart(i, req);
        return controller(req, "editPost", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
