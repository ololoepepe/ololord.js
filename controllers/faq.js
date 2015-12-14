var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/faq.html", function(req, res) {
    var f = function() {
        var model = {};
        model.title = Tools.translate("F.A.Q.", "pageTitle");
        model.extraScripts = [ { fileName: "faq.js" } ];
        return controller("faq", model);
    };
    controller.html(f.bind(null), "faq").then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

module.exports = router;
