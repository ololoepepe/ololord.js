var config = require("../helpers/config");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var trueIp = req.ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
    if (config("system.detectRealIp", true)) {
        var ip = req.headers["x-forwarded-for"];
        if (!ip)
            ip = req.headers["x-client-ip"];
        if (ip)
            trueIp = ip;
    }
    if (config("system.useXRealIp", false))
       trueIp = req.headers["x-real-ip"];
    Object.defineProperty(req, "ip", { value: trueIp });
    next();
};
