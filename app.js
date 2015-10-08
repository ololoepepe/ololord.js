#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");

var config = require("./helpers/config");
var Database = require("./helpers/database");
var Tools = require("./helpers/tools");

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
    var populate = function(skip) {
        if (skip)
            return Promise.resolve();
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
                        if (!threads[post.boardName + "/" + post.threadNumber])
                            threads[post.boardName + "/" + post.threadNumber] = [];
                        threads[post.boardName + "/" + post.threadNumber].push(post);
                    });
                    Tools.forIn(threads, function(thread, number) {
                        var collection = Database.db.collection("thread/" + number);
                        promises.push(collection.insert(thread).then(function() {
                            return collection.createIndex({
                                number: 1,
                                "options.draft": 1,
                                "user.hashpass": 1,
                                "user.level": 1
                            });
                        }).then(function() {
                            return collection.createIndex({
                                "options.draft": 1,
                                "user.hashpass": 1,
                                "user.level": 1
                            });
                        }).then(function() {
                            return collection.createIndex({
                                draft: 1
                            });
                        }).then(function() {
                            return collection.createIndex({
                                number: 1
                            });
                        }));
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
    populate(!Tools.contains(process.argv.slice(2), "--init-db")).then(function() {
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
    });
} else {
    spawnCluster();
}
