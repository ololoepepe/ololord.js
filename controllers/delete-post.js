var express = require("express");

var Board = require("../boards");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/deletePost.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var postNumber = +req.query.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return controller.error(req, res, "Invalid post number");
    var model = {};
    model.title = Tools.translate("Delete post", "pageTitle");
    model.boardName = board.name;
    model.postNumber = postNumber;
    model.showSubmitButton = true;
    controller(req, "deletePost", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
