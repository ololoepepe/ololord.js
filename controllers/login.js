var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/login.html", function(req, res) {
    var model = {
        title: Tools.translate("Login", "loginButtonText"),
        source: (req.query.source || "")
    };
    controller(req, "login/main", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        res.send("Error: " + err);
    });
});

module.exports = router;
