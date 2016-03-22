var Captcha = require("../captchas");
var markup = require("../helpers/markup");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    req.hashpass = Tools.hashpass(req);
    next();
};
