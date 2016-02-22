var express = require("express");
var moment = require("moment");

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/manage.html", function(req, res) {
    if (!req.isModer())
        return controller.error(res, Tools.translate("Not enough rights"));
    var superuserContentVisible = req.isSuperuser();
    controller.sendCachedHTML(req, res, `manage-${superuserContentVisible ? "superuser" : "moder"}`);
});

var generateHTML = function(superuserContentVisible) {
    var model = {};
    model.title = Tools.translate("Management", "pageTitle");
    model.extraScripts = [ { fileName: "manage.js" } ];
    model.superuserContentVisible = superuserContentVisible;
    return controller("manage", model)
};

router.generateHTML = function() {
    var result = {};
    return Tools.series([true, false], function(superuserContentVisible) {
        return generateHTML(superuserContentVisible).then(function(data) {
            result[`manage-${superuserContentVisible ? "superuser" : "moder"}`] = data;
            return Promise.resolve();
        });
    }).then(function() {
        return Promise.resolve(result);
    });
};

module.exports = router;
