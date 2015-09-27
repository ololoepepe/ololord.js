var express = require("express");

var router = express.Router();

router.use("/", require("./board"));
router.use("/", require("./homepage"));

module.exports = router;
