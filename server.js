#!/usr/bin/env node
'use strict';

require('babel-polyfill');

require('source-map-support/register');

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _log4js = require('log4js');

var _log4js2 = _interopRequireDefault(_log4js);

var _tools = require('./helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = require("./helpers/config"); //TODO
var Global = require("./helpers/global");


Global.Program = require('commander');
Global.Program.version('2.0.0-pa').option('-c, --config-file <file>', 'Path to the config.json file').option('-r, --regenerate', 'Regenerate the cache on startup').option('-a, --archive', 'Regenerate archived threads, too').parse(process.argv);

Global.IPC = require('./helpers/ipc')(_cluster2.default);

var appenders = [];
var logTargets = config("system.log.targets", ["console", "file"]);
if (logTargets.indexOf("console") >= 0) appenders.push({ type: "console" });
if (logTargets.indexOf("console") >= 0) {
    appenders.push({
        type: "file",
        filename: __dirname + "/logs/ololord.log",
        maxLogSize: config("system.log.maxSize", 1048576),
        backups: config("system.log.backups", 100)
    });
}
_log4js2.default.configure({ appenders: appenders });
Global.logger = _log4js2.default.getLogger();
["trace", "debug", "info", "warn", "error", "fatal"].forEach(function (name) {
    Global[name] = function () {
        return Global.logger[name].apply(Global.logger, arguments);
    };
});

config.installSetHook("site.locale", Tools.setLocale);

if (_cluster2.default.isMaster) {
    require('./master').default();
} else {
    require('./worker').default();
}
//# sourceMappingURL=server.js.map
