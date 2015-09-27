var express = require("express");

var Board = require("../boards");

var router = express.Router();

router.get("/:boardName", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        res.send(board.name + " [" + board.title + "]");
        board.captchaUsed("127.0.0.1").then(function(prev) {
            console.log("prev", prev);
            return board.getUserCaptchaQuota("127.0.0.1").then(function(quota) {
                if (quota)
                    console.log("new", quota.quota);
                else
                    console.log("new", "null");
            });
        }).catch(function(err) {
            console.log(err);
        });
    }
    //var x = "";
    //controller("homepage/main", modelData).then(function(result) {
    //    x += result;
    //    return controller("navbar", modelDataNavbar);
    //}).then(function(result) {
    //    x = x.replace("<!--NAVBAR-->", result);
    //    res.send(x);
    //    console.timeEnd("homepage"); //TODO: test
    //});
});

module.exports = router;
