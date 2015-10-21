#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");
var rimraf = require("rimraf");

var config = require("./helpers/config");
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

        var cookieParser = require("cookie-parser");
        var DDoS = require("ddos");
        var device = require("express-device");
        var express = require("express");

        var controller = require("./helpers/controller");

        var app = express();
        var ddos = new DDoS({
            maxcount: 30,
            burst: 5,
            limit: (5 * 4),
            maxexpiry: 120,
            checkinterval: 1,
            silentStart: true,
            errormessage: "<html><head></head><body><img src='http://i3.kym-cdn.com/photos/images/masonry/000/112/322/130221984383.png'></body></html>"
        });

        app.use(express.static(__dirname + "/public"));
        //app.use(ddos.express);
        app.use(cookieParser());
        app.use(device.capture());
        require("./middlewares")(app);
        app.use(require("./controllers"));

        process.on("exit", function(){
            rimraf.sync(__dirname + "/cache/" + process.pid);
        });

        Database.initialize().then(function() {
            return controller.initialize();
        }).then(function() {
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
    //
    var markup = require("./helpers/markup");
    markup("b", "``bg``ggg``ggggg``", {
        markupModes: []
    }).then(function() {
        console.time("xxx");
        return markup("b", "[code lang=c]int x = 0;[/code] >>12088", {
            //markupModes: []
        });
    }).then(function(result) {
        console.timeEnd("xxx");
        console.log(result);
        process.exit(0);
    }).catch(function(err) {
        console.log(err);
        process.exit(0);
    });
    //
    /*console.log("Spawning workers, please, wait...");
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
    });*/
} else {
    spawnCluster();
}
