var express = require("express");
var moment = require("moment");

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.generateHTML = function() {
    var model = {};
    model.title = Tools.translate("Management", "pageTitle");
    model.extraScripts = [ { fileName: "manage.js" } ];
    model.extraScripts.push({ fileName: "3rdparty/jQueryFileTree.js" });
    model.extraScripts.push({ fileName: "3rdparty/codemirror/codemirror.min.js" });
    model.extraScripts.push({ fileName: "3rdparty/codemirror/javascript.min.js" });
    model.extraScripts.push({ fileName: "3rdparty/codemirror/css.min.js" });
    model.extraScripts.push({ fileName: "3rdparty/codemirror/xml.min.js" });
    model.extraScripts.push({ fileName: "3rdparty/codemirror/htmlmixed.min.js" });
    model.extraStylesheets = [
        { fileName: "3rdparty/jQueryFileTree/jQueryFileTree.min.css", noEmbed: true },
        { fileName: "3rdparty/codemirror.css" }
    ];
    return controller("manage", model).then(function(data) {
        return Promise.resolve({ "manage.html": data });
    });
};

module.exports = router;
