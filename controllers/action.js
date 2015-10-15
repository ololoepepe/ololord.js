var BodyParser = require("body-parser");
var Crypto = require("crypto");
var express = require("express");

var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var router = express.Router();

router.use(BodyParser.urlencoded({ extended: false }));

router.post("/login", function(req, res) {
    var hashpass = req.body.hashpass;
    if (typeof hashpass != "string")
        hashpass = "";
    if (hashpass && !hashpass.match(/^([0-9a-fA-F]{40})$/)) {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(hashpass);
        hashpass = sha1.digest("hex");
    }
    var date = Tools.now();
    date.setTime(date.getTime() + Tools.Billion * 1000);
    res.cookie("hashpass", hashpass, {
        expires: date,
        path: "/"
    });
    res.redirect(req.body.source || ("/" + config("site.pathPrefix", "")));
});

router.post("/logout", function(req, res) {
    var date = Tools.now();
    date.setTime(date.getTime() + Tools.Billion * 1000);
    res.cookie("hashpass", "", {
        expires: date,
        path: "/"
    });
    res.redirect(req.body.source || ("/" + config("site.pathPrefix", "")));
});

module.exports = router;
