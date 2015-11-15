#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");

var config = require("./helpers/config");
var controller = require("./helpers/controller");
var Database = require("./helpers/database");
var Tools = require("./helpers/tools");

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
                process.send("ready");
                process.on("message", function(msg) {
                    if (msg.type == "exit")
                        process.exit(msg.status);
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
    cluster.on("online", function(worker) {
        worker.process.on("message", function(msg) {
            if (msg == "ready")
                ++ready;
            if (ready == count) {
                var commands = require("./helpers/commands");
                var rl = commands();
            }
        });
    });
} else {
    spawnCluster();
}
