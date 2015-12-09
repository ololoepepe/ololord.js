var express = require("express");
var moment = require("moment");

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/manage.html", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights");
    var model = {};
    model.title = Tools.translate("User management", "pageTitle");
    model.extraScripts = [
        { fileName: "3rdparty/jquery.datetimepicker.js" },
        { fileName: "manage.js" }
    ];
    model.showSubmitButton = true;
    var timeOffset = ("local" == req.settings.time) ? req.settings.timeZoneOffset : config("site.timeOffset", 0);
    var locale = config("site.locale", "en");
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format("YYYY/MM/DD HH:mm");
    };
    Database.userBans().then(function(users) {
        model.bannedUsers = users;
        return controller(req, "manage", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
