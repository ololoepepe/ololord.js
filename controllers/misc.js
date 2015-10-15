var express = require("express");

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

module.exports = router;
