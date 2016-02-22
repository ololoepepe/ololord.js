var express = require("express");
var FSSync = require("fs");

var router = express.Router();
var routers = [];

FSSync.readdirSync(__dirname).forEach(function(file) {
    if (["index.js", "home.js", "board.js"].indexOf(file) >= 0 || "js" != file.split(".").pop())
        return;
    var r = require(`./${file.split(".").shift()}`);
    router.use("/", r);
    routers.push(r);
});

["./board", "./home"].forEach(function(id) {
    var r = require(id);
    router.use("/", r);
    routers.push(r);
});

router.routers = routers;

module.exports = router;
