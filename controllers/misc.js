var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");

var router = express.Router();

router.get("/base.json", function(req, res) {
    var model = controller.baseModel(req);
    res.send(model);
});

router.get("/boards.json", function(req, res) {
    var model = controller.boardsModel(req);
    res.send(model);
});

router.get("/board/:board.json", function(req, res) {
    var model = controller.boardModel(req.params.board);
    res.send(model);
});

router.get("/tr.json", function(req, res) {
    var model = controller.translationsModel();
    res.send(model);
});

router.get("/partials.json", function(req, res) {
    FS.list(__dirname + "/../public/templates/partials").then(function(fileNames) {
        res.send(fileNames.map(function(fileName) {
            return fileName.split(".").shift();
        }));
    });
});

module.exports = router;
