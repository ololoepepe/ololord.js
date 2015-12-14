var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/login.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("Login", "loginButtonText");
        model.extraScripts = [ { fileName: "login.js" } ];
        return controller("login", model);
    };
    controller.html(f.bind(null), "login").then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
