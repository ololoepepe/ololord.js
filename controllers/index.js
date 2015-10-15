var express = require("express");

var router = express.Router();

router.use("/action", require("./action"));
router.use("/", require("./login"));
router.use("/misc", require("./misc"));
router.use("/", require("./board"));
router.use("/", require("./homepage"));

module.exports = router;
