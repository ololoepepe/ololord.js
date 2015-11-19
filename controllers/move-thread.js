var express = require("express");

var Board = require("../boards");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/moveThread.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var threadNumber = +req.query.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return controller.error(req, res, "Invalid thread number");
    var model = {};
    model.title = Tools.translate("Move thread", "pageTitle");
    model.boardName = board.name;
    model.threadNumber = threadNumber;
    model.showSubmitButton = true;
    controller(req, "moveThread", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
