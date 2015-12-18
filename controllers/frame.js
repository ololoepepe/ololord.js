var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/frame.html", function(req, res) {
    var f = function(deviceType) {
        var model = {};
        model.title = Tools.translate("ololord.js", "pageTitle");
        model.deviceType = deviceType;
        model.noJavaScript = true;
        return controller("frame", model);
    };
    var deviceType = (req.device.type == "desktop") ? "desktop" : "mobile";
    Tools.controllerHtml(req, res, f.bind(null, deviceType), "frame", deviceType).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/frameList.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("ololord.js", "pageTitle");
        model.extraScripts = [ { fileName: "frame-list.js" } ];
        return controller("frameList", model);
    };
    Tools.controllerHtml(req, res, f.bind(null), "frameList").catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
