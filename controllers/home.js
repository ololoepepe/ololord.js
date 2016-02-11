var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/", function(req, res) {
    controller.sendCachedHTML(req, res, "home");
});

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    model.extraScripts = [ { fileName: "home.js" } ];
    return controller("home", model).then(function(data) {
        return Promise.resolve({ "home": data });
    });
};

module.exports = router;
