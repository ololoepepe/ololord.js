var Captcha = require("../captchas");
var markup = require("../helpers/markup");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var deviceTypes = {
        desktop: {},
        mobile: {}
    };
    var deviceType = "auto";
    if (deviceTypes.hasOwnProperty(req.cookies.deviceType)) {
        req.device = { type: req.cookies.deviceType };
        deviceType = req.cookies.deviceType;
    }
    req.hashpass = Tools.hashpass(req);
    req.deviceType = deviceType;
    next();
};
