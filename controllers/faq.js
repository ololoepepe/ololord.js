var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/faq.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("F.A.Q.", "pageTitle");
    return controller.customContent(req, "faq").then(function(customContent) {
        model.faqContent = customContent;
        return controller(req, "faq", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        res.send("Error: " + err);
        console.log(err.stack);
    });
});

module.exports = router;
