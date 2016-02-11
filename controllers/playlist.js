var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/playlist.html", function(req, res) {
    controller.sendCachedHTML(req, res, "playlist");
});

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("Playlist", "pageTitle");
    model.extraScripts = [ { fileName: "playlist.js" } ];
    return controller("playlist", model).then(function(data) {
        return Promise.resolve({ "playlist": data });
    });
};

module.exports = router;
