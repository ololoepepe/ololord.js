var express = require("express");

var controller = require("../helpers/controller");

var router = express.Router();

router.get("/tr.json", function(req, res) {
    var model = controller.translationsModel();
    res.send(model);
});

module.exports = router;
