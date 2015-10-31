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
        var fileName = __dirname + "/../misc/news/news.txt";
        return Tools.localeBasedFileName(fileName);
    }).then(function(fileName) {
        if (!fileName)
            return null;
        return FS.read(fileName);
    }).then(function(data) {
        if (!data)
            return [];
        return data.split(/\r*\n+/gi).filter(function(rule) {
            return rule;
        });
    }).then(function(news) {
        model.news = news;
        return Tools.localeBasedFileName(__dirname + "/../misc/friends/friends.txt");
    }).then(function(fileName) {
        if (!fileName)
            return null;
        return FS.read(fileName);
    }).then(function(data) {
        var friends = [];
        if (data) {
            data.split(/\r*\n+/gi).forEach(function(line) {
                if (!line)
                    return;
                var result = Tools.splitCommand(line);
                if (!result || result.arguments.length < 1 || result.arguments.length > 2)
                    return;
                var friend = {
                    url: result.command,
                    name: result.arguments[0]
                };
                if (result.arguments.length > 1)
                    friend.title = result.arguments[1];
                if (!friend.url || !friend.name)
                    return;
                friends.push(friend);
            });
        }
        model.friends = friends;
        return controller(req, "home", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
