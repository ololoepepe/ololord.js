var cookieParser = require("cookie-parser");
var DDoS = require("ddos");
var device = require("express-device");
var express = require("express");

var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var log = function(req, res, next) {
    var args;
    switch (config("system.middlewareLog.verbosity", "")) {
    case "all":
        args = [req.ip, req.path, req.query];
        break;
    case "path":
        args = [req.ip, req.path];
        break;
    case "ip":
        args = [req.ip];
        break;
    default:
        break;
    }
    if (args)
        console.log.apply(console, args);
    next();
};

module.exports = [];

if (config("system.middlewareLog.before", "") == "all") {
    module.exports.push(log);
}

module.exports.push(require("./ip-fix"));

var setupDdos = function() {
    if (config("system.middlewareLog.before", "") == "ddos")
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
    if (config("system.middlewareLog.before", "") == "static")
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

if (config("system.middlewareLog.before", "") == "middleware")
    module.exports.push(log);

module.exports = module.exports.concat([
    cookieParser(),
    device.capture(),
    require("./cookies"),
    require("./registered-user")
]);

if (config("system.middlewareLog.before", "") == "request")
    module.exports.push(log);
