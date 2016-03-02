var cookieParser = require("cookie-parser");
var ddos = require("ddos-express");
var device = require("express-device");
var express = require("express");

var config = require("../helpers/config");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var excludePaths = {};
var excludeRules = [];

config("system.log.middleware.exclude", []).forEach(function(rule) {
    if (rule.regexp)
        excludeRules.push(new RegExp(rule.regexp, rule.flags));
    else if (rule.string)
        excludePaths[rule.string] = {};
});

var exclude = function(path) {
    if (excludePaths.hasOwnProperty(path))
        return true;
    for (var i = 0; i < excludeRules.length; ++i) {
        if (path.match(excludeRules[i]))
            return true;
    }
    return false;
};

var log = function(req, res, next) {
    if (exclude(req.path))
        return next();
    var args;
    if (req.method.match(/^post|put|patch|delete$/i) && config("system.log.middleware.verbosity", "ip") == "all") {
        args = [Tools.preferIPv4(req.ip), req.path, req.query];
        return Tools.parseForm(req).then(function(result) {
            req.formFields = result.fields;
            req.formFiles = result.files;
            args.push(result.fields);
            Global.info.apply(Global.logger, args);
            return Promise.resolve();
        }).catch(function(err) {
            Global.error(err);
            return Promise.resolve();
        }).then(next);
    }
    switch (config("system.log.middleware.verbosity", "ip")) {
    case "all":
    case "query":
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

if (config("system.log.middleware.before", "all") == "all") {
    module.exports.push(log);
}

module.exports.push(require("./ip-fix"));

var setupDdos = function() {
    if (config("system.log.middleware.before", "all") == "ddos")
        module.exports.push(log);

    if (config("server.ddosProtection.enabled", true)) {
        module.exports.push(ddos({
            errorData: config("server.ddosProtection.errorData", "Not so fast!"),
            errorCode: config("server.ddosProtection.errorCode", 429),
            weight: config("server.ddosProtection.weight", 1),
            maxWeight: config("server.ddosProtection.maxWeight", 10),
            checkInterval: config("server.ddosProtection.checkInterval", 1000),
            rules: config("server.ddosProtection.rules", [
                {
                    regexp: "^/api.*",
                    maxWeight: 6,
                    queueSize: 4
                },
                {
                    string: "/action/search",
                    maxWeight: 1
                },
                {
                    regexp: ".*",
                    maxWeight: 10
                }
            ]),
            logFunction: Global.error.bind(null, "DDoS detected:")
        }));
    }
};

var setupStatic = function() {
    if (config("system.log.middleware.before", "all") == "static")
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

if (config("system.log.middleware.before", "all") == "middleware")
    module.exports.push(log);

module.exports = module.exports.concat([
    cookieParser(),
    device.capture(),
    require("./cookies"),
    require("./registered-user")
]);

if (config("system.log.middleware.before", "all") == "request")
    module.exports.push(log);
