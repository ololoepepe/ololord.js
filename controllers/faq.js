var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("F.A.Q.", "pageTitle");
    return controller("faq", model).then(function(data) {
        return Promise.resolve({ "faq.html": data });
    });
};

module.exports = router;
