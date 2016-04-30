var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("Search", "pageTitle");
    model.extraScripts = [
        { fileName: "3rdparty/jquitelight.min.js" },
        { fileName: "3rdparty/URI.min.js" },
        { fileName: "search.js" }
    ];
    return controller("search", model).then(function(data) {
        return Promise.resolve({ "search.html": data });
    });
};

module.exports = router;
