var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("ololord.js", "pageTitle");
        model.extraScripts = [ { fileName: "home.js" } ];
        return controller("home", model);
    };
    controller.html(f.bind(null), "home").then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
