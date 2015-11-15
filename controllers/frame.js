var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/frame.html", function(req, res) {
    var model = {
        title: Tools.translate("ololord.js", "pageTitle"),
        source: (req.query.path || ""),
        noJavaScript: true
    };
    controller(req, "frame", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/frameList.html", function(req, res) {
    var model = {
        title: Tools.translate("ololord.js", "pageTitle")
    };
    controller(req, "frameList", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
