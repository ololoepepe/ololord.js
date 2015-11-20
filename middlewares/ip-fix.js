var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    console.log("request!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    //setTimeout(function() {
        /*try {
        var trueIp = req.ip;
        if (!trueIp)
            return res.sendStatus(500);
        if (config("system.detectRealIp", true)) {
            var ip = req.headers["x-forwarded-for"];
            if (!ip)
                ip = req.headers["x-client-ip"];
            if (ip) {
                var address = Tools.correctAddress(ip);
                if (!address)
                    return res.sendStatus(500);
                trueIp = address;
            }
        }
        if (config("system.useXRealIp", false)) {
            var ip = req.headers["x-real-ip"];
            var address = Tools.correctAddress(ip);
            if (!address)
                return res.sendStatus(500);
            trueIp = address;
        }
        Object.defineProperty(req, "ip", { value: trueIp });
        next();
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }*/
    next();
    //}, 1000);
};
