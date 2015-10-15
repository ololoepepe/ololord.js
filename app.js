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
        app.use(ddos.express);
        app.use(cookieParser());
        app.use(device.capture());
        require("./middlewares")(app);
        app.use(require("./controllers"));

        process.on("exit", function(){
            rimraf.sync(__dirname + "/cache/" + process.pid);
        });

        controller.initialize().then(function() {
            return Promise.resolve();
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
    var populate = function(skip) {
        if (skip)
            return Database.Lock.drop();
        console.log("Populating database...");
        var Tools = require("./helpers/tools");
        return Database.dropDatabase().then(function() {
            var data = require("/home/darkangel/tmp/db.json");
            var promises = [];
            for (var x in data) {
                if (!data.hasOwnProperty(x))
                    continue;
                var arr = data[x];
                if (arr.length < 1)
                    continue;
                if (x === "posts") {
                    var threads = {};
                    arr.forEach(function(post) {
                        var key = post.boardName + "/" + post.threadNumber;
                        if (!threads[key]) {
                            threads[key] = {
                                boardName: post.boardName,
                                number: post.threadNumber,
                                posts: []
                            };
                        }
                        var thread = threads[key];
                        thread.posts.push(post);
                    });
                    Tools.forIn(threads, function(thread) {
                        var collection = Database.threadCollection(thread.boardName, thread.number);
                        promises.push(collection.insert(thread.posts));
                    });
                } else {
                    var i = 0;
                    while (i < arr.length) {
                        promises.push(Database[x].insert(arr.slice(i, i + 1000)));
                        i += 1000;
                    }
                }
            }
            return Promise.all(promises);
        }).then(function() {
            console.log("Database populated!");
            return Promise.resolve();
        });
    };
    populate(!Tools.contains(process.argv.slice(2), "--populate-db")).then(function() {
        return Database.initialize();
    }).then(function() {
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
    }).catch(function(err) {
        console.log(err);
    });
} else {
    spawnCluster();
}
