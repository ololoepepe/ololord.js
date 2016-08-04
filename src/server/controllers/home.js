var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var result = {};
    var model = {};
    model.title = Tools.translate("ololord.js", "pageTitle");
    result["index.html"] = controller("pages/home", model);
    model = {};
    model.title = Tools.translate("Error 404", "pageTitle");
    model.notFoundMessage = Tools.translate("Page or file not found", "notFoundMessage");
    let fileNames = controller.notFoundImageFileNamesModel();
    if (fileNames.length > 0) {
      model.notFoundImageFileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    }
    result["notFound.html"] = controller("pages/notFound", model);
    return Promise.resolve(result);
};

module.exports = router;
