var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    req.ip = req.ip.replace("::ffff:", "");
    next();
};
