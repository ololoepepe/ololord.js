#!/usr/bin/env node

import 'babel-polyfill';
import 'source-map-support/register';
import Cluster from 'cluster';
import Log4JS from 'log4js';

var config = require("./helpers/config"); //TODO
var Global = require("./helpers/global");
import * as Tools from './helpers/tools';

Global.Program = require('commander');
Global.Program.version('2.0.0-pa')
  .option('-c, --config-file <file>', 'Path to the config.json file')
  .option('-r, --regenerate', 'Regenerate the cache on startup')
  .option('-a, --archive', 'Regenerate archived threads, too')
  .parse(process.argv);

Global.IPC = require('./helpers/ipc')(Cluster);

var appenders = [];
var logTargets = config("system.log.targets", ["console", "file"]);
if (logTargets.indexOf("console") >= 0)
    appenders.push({ type: "console" });
if (logTargets.indexOf("console") >= 0) {
    appenders.push({
        type: "file",
        filename: __dirname + "/logs/ololord.log",
        maxLogSize: config("system.log.maxSize", 1048576),
        backups: config("system.log.backups", 100)
    });
}
Log4JS.configure({ appenders: appenders });
Global.logger = Log4JS.getLogger();
["trace", "debug", "info", "warn", "error", "fatal"].forEach(function(name) {
    Global[name] = function() {
        return Global.logger[name].apply(Global.logger, arguments);
    };
});

config.installSetHook("site.locale", Tools.setLocale);

if (Cluster.isMaster) {
  require('./master').default();
} else {
  require('./worker').default();
}
