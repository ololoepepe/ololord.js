var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/faq.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("F.A.Q.", "pageTitle");
    controller.customContent(req, "faq").then(function(customContent) {
        model.faqContent = customContent;
        return controller(req, "faq", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
