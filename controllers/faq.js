var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/faq.html", function(req, res) {
    controller.sendCachedHTML(req, res, "faq");
});

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("F.A.Q.", "pageTitle");
    model.extraScripts = [ { fileName: "faq.js" } ];
    return controller("faq", model).then(function(data) {
        return Promise.resolve({ "faq": data });
    });
};

module.exports = router;
