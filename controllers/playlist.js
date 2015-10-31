var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/playlist.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("Playlist", "pageTitle");
    controller(req, "playlist", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        res.send("Error: " + err);
        console.log(err.stack);
    });
});

module.exports = router;
