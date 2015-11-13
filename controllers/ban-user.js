var express = require("express");

var Board = require("../boards");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/banUser.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var postNumber = +req.query.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return controller.error(req, res, "Invalid post number");
    var userIp = req.query.userIp;
    if (!userIp)
        return controller.error(req, res, "Invalid user IP");
    var model = {};
    model.title = Tools.translate("Ban user", "pageTitle");
    model.showSubmitButton = true;
    Database.bannedUser(userIp).then(function(user) {
        if (user)
            model.bannedUser = user;
        model.boardName = board.name;
        model.postNumber = postNumber;
        model.userIp = userIp;
        return controller(req, "banUser", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
