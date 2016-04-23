var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/frame.html", function(req, res, next) {
    controller.sendCachedHTML(req, res, next, "frame");
});

var generateFrame = function() {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    model.extraScripts = [ { fileName: "3rdparty/URI.min.js" } ];
    return controller("frame", model);
};

router.generateHTML = function() {
    return generateFrame().then(function(data) {
        return Promise.resolve({ frame: data });
    });
};

module.exports = router;
