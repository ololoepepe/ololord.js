var express = require("express");

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/login.html", function(req, res) {
    var model = {
        title: Tools.translate("Login", "loginButtonText"),
        source: (req.query.source || ""),
        extraScripts: [ { fileName: "login.js" } ]
    };
    if (config("site.vkontakte.integrationEnabled", false)) {
        var id = config("site.vkontakteAppId", "");
        model.extraScripts.unshift({ source: "//vk.com/js/api/openapi.js" });
    }
    controller(req, "login", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
