var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/playlist.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("Playlist", "pageTitle");
        model.extraScripts = [ { fileName: "playlist.js" } ];
        return controller(null, "playlist", model);
    };
    controller.html(f.bind(null), "playlist").then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
