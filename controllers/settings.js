var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/settings.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("Settings", "pageTitle");
    model.showSubmitButton = true;
    controller(req, "settings", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
