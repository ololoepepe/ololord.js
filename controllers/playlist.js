var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/playlist.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("Playlist", "pageTitle");
        model.extraScripts = [ { fileName: "playlist.js" } ];
        return controller("playlist", model);
    };
    Tools.controllerHtml(req, res, f.bind(null), "playlist").catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
