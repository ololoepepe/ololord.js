var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var result = {};
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    return controller("home", model).then(function(data) {
        result["index.html"] = data;
        var model = {};
        model.title = Tools.translate("Error 404", "pageTitle");
        model.notFoundMessage = Tools.translate("Page or file not found", "notFoundMessage");
        var path = __dirname + "/../public/img/404";
        return FS.list(path).then(function(fileNames) {
            model.notFoundImageFileNames = fileNames.filter(function(fileName) {
                return fileName != ".gitignore";
            });
            return controller("notFound", model);
        }).then(function(data) {
            result["notFound.html"] = data;
        });
    }).then(function() {
        return Promise.resolve(result);
    });
};

module.exports = router;
