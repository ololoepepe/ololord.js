var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    req.trueIp = req.ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
    next();
};
