var device = require("device");
var express = require("express");

var controller = require("../helpers/controller");

var router = express.Router();

router.get("/misc/base.json", function(req, res) {
    var deviceTypes = {
        desktop: {},
        mobile: {}
    };
    var deviceType = "auto";
    if (deviceTypes.hasOwnProperty(req.cookies.deviceType))
        deviceType = req.cookies.deviceType;
    else
        deviceType = device(req.headers["user-agent"] || "").type;
    var model = controller.baseModel();
    model.deviceType = (deviceType == "desktop") ? "desktop" : "mobile";
    model.user = {
        ip: req.ip,
        hashpass: req.hashpass,
        levels: (req.levels || {}),
        loggedIn: !!req.hashpass
    };
    res.json(model);
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
