var express = require("express");

var Board = require("../boards");

var router = express.Router();

router.use("/action", require("./action"));

router.use("/", require("./faq"));
router.use("/", require("./frame"));
router.use("/", require("./login"));
router.use("/", require("./manage"));
router.use("/", require("./markup"));
router.use("/", require("./playlist"));
router.use("/", require("./search"));

router.use("/api", require("./api"));
router.use("/misc", require("./misc"));

Board.boardNames().forEach(function(name) {
    Board.board(name).routes().forEach(function(route) {
        router[route.method](route.path, route.handler);
    });
});

router.use("/", require("./board"));

router.use("/", require("./home"));

module.exports = router;
