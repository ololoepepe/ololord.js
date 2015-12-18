var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/search.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("Search", "pageTitle");
        model.extraScripts = [ { fileName: "search.js" } ];
        return controller("search", model);
    };
    Tools.controllerHtml(req, res, f.bind(null), "search").catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
