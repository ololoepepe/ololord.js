var express = require("express");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/deleteFile.html", function(req, res) {
    var fileName = req.query.fileName;
    if (!fileName)
        return controller.error(req, res, "Invalid file name");
    var model = {};
    model.title = Tools.translate("Delete file", "pageTitle");
    model.fileName = fileName;
    model.showSubmitButton = true;
    controller(req, "deleteFile", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

module.exports = router;
