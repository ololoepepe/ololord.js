var express = require("express");
var merge = require("merge");

var Board = require("../boards");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/addFiles.html", function(req, res) {
    var board = Board.board(req.query.boardName);
    if (!board)
        return controller.error(req, res, "Invalid board");
    var postNumber = +req.query.postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return controller.error(req, res, "Invalid post number");
    var model = {};
    model.title = Tools.translate("Add files", "pageTitle");
    model.includeBoardScripts = true;
    model.minimalisticPostform = function() {
        return "mobile" == this.deviceType || this.settings.minimalisticPostform;
    };
    Database.getPost(board.name, postNumber, { withFileInfos: true }).then(function(post) {
        model.showSubmitButton = true;
        model = merge.recursive(model, controller.boardModel(board));
        model.boardName = board.name;
        model.postNumber = postNumber;
        model.fileCount = post.fileInfos.length;
        return controller(req, "addFiles", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
