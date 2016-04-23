var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    model.extraScripts = [ { fileName: "3rdparty/URI.min.js" } ];
    return controller("frame", model).then(function(data) {
        return Promise.resolve({ "frame.html": data });
    });
};

module.exports = router;
