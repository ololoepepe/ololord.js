#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");

var config = require("./helpers/config");
var controller = require("./helpers/controller");
var BoardModel = require("./models/board");
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

        BoardModel.initialize().then(function() {
            return controller.initialize();
        }).then(function() {
            if (config("server.rss.enabled", true)) {
                Database.generateRss();
                setInterval(function() {
                    Database.generateRss();
                }, config("server.rss.ttl", 60) * Tools.Minute);
            }
            var sockets = {};
            var nextSocketId = 0;
            var server = app.listen(config("server.port", 8080), function() {
                console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
                Global.IPC.installHandler("exit", function(status) {
                    process.exit(status);
                });
                Global.IPC.installHandler("stop", function() {
                    return new Promise(function(resolve, reject) {
                        server.close(function() {
                            console.log("[" + process.pid + "] Closed");
                            resolve();
                        });
                        Tools.forIn(sockets, function(socket, socketId) {
                            delete sockets[socketId];
                            socket.destroy();
                        });
                    });
                });
                Global.IPC.installHandler("start", function() {
                    return new Promise(function(resolve, reject) {
                        server.listen(config("server.port", 8080), function() {
                            console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080)
                                + "...");
                            resolve();
                        });
                    });
                });
                Global.IPC.send("ready").catch(function(err) {
                    console.log(err);
                });
            });
            server.on("connection", function(socket) {
                var socketId = ++nextSocketId;
                sockets[socketId] = socket;
                socket.on("close", function() {
                    delete sockets[socketId];
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
    console.log("Generating cache, please, wait...");
    Database.initialize().then(function() {
        return controller.initialize();
    }).then(function() {
        return BoardModel.generate();
    }).then(function() {
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
        Global.IPC.installHandler("generate", function(data) {
            return BoardModel.scheduleGenerate(data.boardName, data.threadNumber, data.postNumber, data.action);
        });
    }).catch(function(err) {
        console.log(err.stack || err);
        process.exit(1);
    });
} else {
    Global.generate = function(boardName, threadNumber, postNumber, action) {
        return Global.IPC.send("generate", {
            boardName: boardName,
            threadNumber: threadNumber,
            postNumber: postNumber,
            action: action
        }).catch(function(err) {
            console.log(err.stack || err);
        });
    };
    spawnCluster();
}
