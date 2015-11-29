#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");

var config = require("./helpers/config");
var controller = require("./helpers/controller");
var Database = require("./helpers/database");
var Global = require("./helpers/global");
var Tools = require("./helpers/tools");

Global.IPC = require("./helpers/ipc")(cluster);

config.installSetHook("site.locale", Tools.setLocale);
if (Tools.contains(process.argv.slice(2), "--dev-mode"))
    config.setConfigFile(__dirname + "/config-dev.json");

var count = config("system.workerCount", OS.cpus().length);
if (count <= 0)
    count = OS.cpus().length;

var spawnCluster = function() {
    expressCluster(function(worker) {
        console.log("[" + process.pid + "] Initializing...");

        var express = require("express");

        var controller = require("./helpers/controller");

        var app = express();

        app.use(require("./middlewares"));
        app.use(require("./controllers"));
        app.use("*", function(req, res) {
            controller.notFound(req, res);
        });

        controller.initialize().then(function() {
            if (config("server.rss.enabled", true)) {
                Database.generateRss();
                setInterval(function() {
                    Database.generateRss();
                }, config("server.rss.ttl", 60) * Tools.Minute);
            }
            app.listen(config("server.port", 8080), function() {
                console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
                Global.IPC.installHandler("exit", function(status) {
                    process.exit(status);
                });
                Global.IPC.send("ready").catch(function(err) {
                    console.log(err);
                });
            });
        }).catch(function(err) {
            console.log(err);
        });
    }, {
        count: count,
        respawn: true
    });
};

if (cluster.isMaster) {
    console.log("Spawning workers, please, wait...");
    spawnCluster();
    var ready = 0;
    Global.IPC.installHandler("ready", function() {
        ++ready;
        if (ready == count) {
            var commands = require("./helpers/commands");
            var rl = commands();
        }
    });
    var fileNames = {};
    var fileName = function(boardName) {
        var fn = "" + Tools.now().valueOf();
        if (fn != fileNames[boardName]) {
            fileNames[boardName] = fn;
            return Promise.resolve(fn);
        }
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                fileName(boardName).then(function(fn) {
                    resolve(fn);
                });
            }, 1);
        });
    };
    Global.IPC.installHandler("fileName", function(boardName) {
        return fileName(boardName);
    });
} else {
    spawnCluster();
}
