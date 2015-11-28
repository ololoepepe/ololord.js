var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/", function(req, res) {
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    controller.customContent(req, "home").then(function(customContent) {
        model.customContent = customContent;
        return Tools.getRules("home");
    }).then(function(rules) {
        model.rules = rules;
        var fileName = __dirname + "/../misc/news/news.json";
        return Tools.localeBasedFileName(fileName);
    }).then(function(fileName) {
        if (!fileName)
            return null;
        return FS.read(fileName);
    }).then(function(data) {
        model.news = data ? JSON.parse(data) : [];
        return Tools.localeBasedFileName(__dirname + "/../misc/friends/friends.json");
    }).then(function(fileName) {
        if (!fileName)
            return null;
        return FS.read(fileName);
    }).then(function(data) {
        model.friends = data ? JSON.parse(data) : [];
        return controller(req, "home", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
