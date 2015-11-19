var express = require("express");

var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/manage.html", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights");
    var model = {};
    model.title = Tools.translate("User management", "pageTitle");
    model.extraScripts = [ { fileName: "manage.js" } ];
    model.showSubmitButton = true;
    Database.bannedUsers().then(function(bannedUsers) {
        model.bannedUsers = bannedUsers;
        return controller(req, "manage", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
