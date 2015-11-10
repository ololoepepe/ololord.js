var express = require("express");

var Board = require("../boards");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/postSourceText.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var postNumber = +req.query.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return controller.error(req, res, "Invalid post number");
    var model = {};
    model.title = Tools.translate("Post source text", "pageTitle");
    Database.getPost(board.name, postNumber).then(function(post) {
        model.sourceText = post.rawText;
        return controller(req, "postSourceText", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
