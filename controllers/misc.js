var express = require("express");

var controller = require("../helpers/controller");

var router = express.Router();

router.get("/misc/base.json", function(req, res) {
    res.json(controller.baseModel(req));
});

router.get("/misc/boards.json", function(req, res) {
    res.json(controller.boardsModel());
});

router.get("/misc/board/:board.json", function(req, res) {
    res.json(controller.boardModel(req.params.board));
});

router.get("/misc/tr.json", function(req, res) {
    res.json(controller.translationsModel());
});

router.get("/misc/partials.json", function(req, res) {
    res.json(controller.publicPartialNames());
});

module.exports = router;
