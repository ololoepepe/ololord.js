var express = require("express");
var FSSync = require("fs");

var router = express.Router();

/*router.use("/", require("./action"));

router.use("/", require("./faq"));
router.use("/", require("./frame"));
router.use("/", require("./login"));
router.use("/", require("./manage"));
router.use("/", require("./markup"));
router.use("/", require("./playlist"));
router.use("/", require("./search"));

router.use("/", require("./api"));
router.use("/", require("./misc"));*/

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "home.js" == file || "board.js" == file || "js" != file.split(".").pop())
        return;
    router.use("/", require(`./${file.split(".").shift()}`));
});

router.use("/", require("./board"));
router.use("/", require("./home"));

module.exports = router;
