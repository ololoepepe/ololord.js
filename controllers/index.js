var express = require("express");
var FSSync = require("fs");

var router = express.Router();

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "home.js" == file || "board.js" == file || "js" != file.split(".").pop())
        return;
    router.use("/", require(`./${file.split(".").shift()}`));
});

router.use("/", require("./board"));
router.use("/", require("./home"));

module.exports = router;
