var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/frame.html", function(req, res) {
    var deviceType = (req.device.type == "desktop") ? "desktop" : "mobile";
    controller.sendCachedHTML(req, res, `frame-${deviceType}`);
});

router.get("/frameList.html", function(req, res) {
    controller.sendCachedHTML(req, res, "frameList");
});

var generateFrame = function(deviceType) {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    model.deviceType = deviceType;
    model.noJavaScript = true;
    return controller("frame", model);
};

var generateFrameList = function() {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    model.extraScripts = [ { fileName: "frame-list.js" } ];
    return controller("frameList", model);
};

router.generateHTML = function() {
    var result = {};
    return Tools.series(["desktop", "mobile"], function(deviceType) {
        return generateFrame(deviceType).then(function(data) {
            result[`frame-${deviceType}`] = data;
            return Promise.resolve();
        });
    }).then(function() {
        return generateFrameList();
    }).then(function(data) {
        result["frameList"] = data;
        return Promise.resolve(result);
    });
};

module.exports = router;
