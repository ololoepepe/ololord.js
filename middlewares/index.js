var cookieParser = require("cookie-parser");
var DDoS = require("ddos");
var device = require("express-device");
var express = require("express");

var config = require("../helpers/config");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var log = function(req, res, next) {
    var args;
    switch (config("system.log.middleware.verbosity", "")) {
    case "all":
        args = [Tools.preferIPv4(req.ip), req.path, req.query];
        break;
    case "path":
        args = [Tools.preferIPv4(req.ip), req.path];
        break;
    case "ip":
        args = [Tools.preferIPv4(req.ip)];
        break;
    default:
        break;
    }
    if (args)
        Global.info.apply(Global.logger, args);
    next();
};

module.exports = [];

if (config("system.log.middleware.before", "") == "all") {
    module.exports.push(log);
}

module.exports.push(require("./ip-fix"));

var setupDdos = function() {
    if (config("system.log.middleware.before", "") == "ddos")
        module.exports.push(log);

    if (config("server.ddosProtection.enabled", true)) {
        var burst = +config("server.ddosProtection.burst", 6);
        var limit = burst * 6;
        var ddos = new DDoS({
            maxcount: (limit * 1.5),
            burst: burst,
            limit: limit,
            maxexpiry: +config("server.ddosProtection.maxExpiry", 60),
            checkinterval: +config("server.ddosProtection.checkInterval", 1),
            silentStart: true,
            errormessage: config("server.ddosProtection.errorMessage", "Not so fast!")
        });
        module.exports.push(ddos.express);
    }
};

var setupStatic = function() {
    if (config("system.log.middleware.before", "") == "static")
        module.exports.push(log);

    module.exports.push(express.static(__dirname + "/../public"));
};

if (config("server.ddosProtection.static", false)) {
    setupDdos();
    setupStatic();
} else {
    setupStatic();
    setupDdos();
}

if (config("system.log.middleware.before", "") == "middleware")
    module.exports.push(log);

module.exports = module.exports.concat([
    cookieParser(),
    device.capture(),
    require("./cookies"),
    require("./registered-user")
]);

if (config("system.log.middleware.before", "") == "request")
    module.exports.push(log);
