"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var cookieParser = require("cookie-parser");
var DDDoS = require("dddos");
var express = require("express");

var config = require("../helpers/config");
var OnlineCounter = require("../helpers/online-counter");
var Tools = require("../helpers/tools");

var excludePaths = {};
var excludeRules = [];

var resetExcluded = function resetExcluded(val, key) {
    excludePaths = {};
    excludeRules = [];
    (val || []).forEach(function (rule) {
        if (rule.regexp) excludeRules.push(new RegExp(rule.regexp, rule.flags));else if (rule.string) excludePaths[rule.string] = {};
    });
};

config.installSetHook("system.log.middleware.exclude", resetExcluded);
resetExcluded(config("system.log.middleware.exclude", []));

var exclude = function exclude(path) {
    if (excludePaths.hasOwnProperty(path)) return true;
    for (var i = 0; i < excludeRules.length; ++i) {
        if (path.match(excludeRules[i])) return true;
    }
    return false;
};

var log = function log(req, res, next) {
    if (exclude(req.path)) return next();
    var args;
    if (req.method.match(/^post|put|patch|delete$/i) && config("system.log.middleware.verbosity", "ip") == "all") {
        args = [Tools.preferIPv4(req.ip), req.path, req.query];
        return Tools.parseForm(req).then(function (result) {
            req.formFields = result.fields;
            req.formFiles = result.files;
            args.push(result.fields);
            _logger2.default.info.apply(_logger2.default, _toConsumableArray(args));
            return Promise.resolve();
        }).catch(function (err) {
            _logger2.default.error(err);
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
    if (args) _logger2.default.info.apply(_logger2.default, _toConsumableArray(args));
    next();
};

var middlewares = [];

if (config("system.log.middleware.before", "all") == "all") middlewares.push(log);

middlewares.push(require("./ip-fix"));
middlewares.push(function (req, res, next) {
    OnlineCounter.alive(req.ip);
    next();
});

var setupDdos = function setupDdos() {
    if (config("system.log.middleware.before", "all") == "ddos") middlewares.push(log);

    if (config("server.ddosProtection.enabled", true)) {
        middlewares.push(new DDDoS({
            errorData: config("server.ddosProtection.errorData", "Not so fast!"),
            errorCode: config("server.ddosProtection.errorCode", 429),
            weight: config("server.ddosProtection.weight", 1),
            maxWeight: config("server.ddosProtection.maxWeight", 10),
            checkInterval: config("server.ddosProtection.checkInterval", 1000),
            rules: config("server.ddosProtection.rules", [{
                string: "/misc/base.json",
                maxWeight: 6,
                queueSize: 4
            }, {
                string: "/api/chatMessages.json",
                maxWeight: 4,
                queueSize: 2
            }, {
                string: "/api/lastPostNumbers.json",
                maxWeight: 4,
                queueSize: 2
            }, {
                string: "/api/captchaQuota.json",
                maxWeight: 4,
                queueSize: 2
            }, {
                string: "/api/lastPostNumber.json",
                maxWeight: 4,
                queueSize: 2
            }, {
                regexp: "^/api.*",
                maxWeight: 6,
                queueSize: 4
            }, {
                string: "/action/search",
                maxWeight: 1
            }, {
                regexp: ".*",
                maxWeight: 10
            }]),
            logFunction: _logger2.default.error.bind(_logger2.default, "DDoS detected:")
        }).express());
    }
};

var setupStatic = function setupStatic() {
    if (config("system.log.middleware.before", "all") == "static") middlewares.push(log);
    middlewares.push(express.static(__dirname + "/../public"));
};

if (config("server.ddosProtection.static", false)) {
    setupDdos();
    setupStatic();
} else {
    setupStatic();
    setupDdos();
}

if (config("system.log.middleware.before", "all") == "middleware") middlewares.push(log);

middlewares = middlewares.concat([cookieParser(), function (req, res, next) {
    req.hashpass = Tools.hashpass(req);
    next();
}, Tools.requireWrapper(require("./registered-user"))]);

if (config("system.log.middleware.before", "all") == "request") middlewares.push(log);

middlewares.push(require("./cookies"));

exports.default = middlewares;
//# sourceMappingURL=index.js.map
