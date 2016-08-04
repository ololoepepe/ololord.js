"use strict";

var express = require("express");

var BoardModel = require("../models/board");

var router = express.Router();

router.generateJSON = function () {
    return BoardModel.generateJSON();
};

module.exports = router;
//# sourceMappingURL=board.js.map
