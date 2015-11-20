var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var trueIp = req.ip;
    console.log(req.ip);
    if (!trueIp)
        return res.error(500);
    console.log(1);
    if (config("system.detectRealIp", true)) {
        console.log(2);
        var ip = req.headers["x-forwarded-for"];
        if (!ip)
            ip = req.headers["x-client-ip"];
        if (ip) {
            var address = new Address6(ip);
            if (!address.isValid())
                address = Address6.fromAddress4(new Address4(ip));
            if (!address.isValid())
                return res.error(500);
            trueIp = address.group();
        }
        console.log(3);
    }
    if (config("system.useXRealIp", false)) {
        console.log(4);
        var ip = req.headers["x-real-ip"];
        var address = new Address6(ip);
        console.log(5);
        if (!address.isValid())
            address = Address6.fromAddress4(new Address4(ip));
        console.log(6);
        if (!address.isValid()) {
            console.log("aaa");
            return res.error(500);
        }
        trueIp = address.group();
    }
    Object.defineProperty(req, "ip", { value: trueIp });
    next();
};
