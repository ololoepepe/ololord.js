var config = require("../helpers/config");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    req.trueIp = req.ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
    if (config("system.detectRealIp", true)) {
        var ip = req.headers["x-forwarded-for"];
        if (!ip)
            ip = req.headers["x-client-ip"];
        if (ip)
            req.trueIp = ip;
    }
    if (config("system.useXRealIp", false)) {
       req.trueIp = req.headers["x-real-ip"];
    }
    next();
};
