var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("F.A.Q.", "pageTitle");
    return Promise.resolve({ "faq.html": controller("pages/faq", model) });
};

module.exports = router;
