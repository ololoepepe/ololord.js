var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/login.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("Login", "loginButtonText");
        model.extraScripts = [
            { fileName: "3rdparty/sha1.min.js" },
            { fileName: "login.js" }
        ];
        return controller("login", model);
    };
    Tools.controllerHtml(req, res, f.bind(null), "login").catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
