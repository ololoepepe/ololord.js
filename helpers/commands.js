var cluster = require("cluster");
var Crypto = require("crypto");
var ReadLine = require("readline");
var ReadLineSync = require("readline-sync");

var Board = require("../boards/board");
var config = require("./config");
var Database = require("./database");
var Tools = require("./tools");

var rl = ReadLine.createInterface({
    "input": process.stdin,
    "output": process.stdout
});

rl.setPrompt("ololord.js> ");

rl.tmp_question = rl.question;
rl.question = function(question) {
    return new Promise(function(resolve, reject) {
        rl.tmp_question.apply(rl, question, resolve);
    });
};

var handlers = {};

var _installHandler = function(cmd, f) {
    if (typeof cmd == "string") {
        handlers[cmd] = f;
    } else {
        cmd.forEach(function(cmd) {
            handlers[cmd] = f;
        });
    }
};

_installHandler(["quit", "q"], function() {
    process.exit(0);
    return Promise.resolve();
});

_installHandler(["respawn"], function(args) {
    var status = !isNaN(+args) ? +args : 0;
    var promises = [];
    for (var id in cluster.workers) {
        promises.push(new Promise(function(resolve, reject) {
            var worker = cluster.workers[id];
            worker.process.send({
                type: "exit",
                status: status
            }, function(err) {
                if (err)
                    return reject(err);
                resolve();
            });
        }));
    }
    return Promise.all(promises).then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("help", function() {
    console.log("q | quit - Exit the application");
    console.log("help - Print this Help");
    return Promise.resolve();
});

_installHandler("set", function(args) {
    var path = args.split(/\s+/)[0];
    var value = args.split(/\s+/).slice(1).join(" ");
    if (!path)
        return Promise.reject("Invalid command. Type 'help' for commands");
    if (value) {
        config.set(path, JSON.parse(value));
        return Promise.resolve("OK");
    }
    return rl.question("Enter value for '" + path + "': ").then(function(answer) {
        config.set(path, (typeof answer == "string") ? answer : JSON.parse(answer));
        return Promise.resolve("OK");
    });
});

_installHandler("get", function(args) {
    if (!args)
        return Promise.reject(console.log("Invalid command. Type 'help' for commands"));
    var v = config(args);
    if (undefined == v)
        return Promise.reject("No such value");
    return Promise.resolve("Value for '" + args + "': " + JSON.stringify(v, null, 4));
});

_installHandler("remove", function(args) {
    if (!args)
        Promise.reject("Invalid command. Type 'help' for commands");
    config.remove(args);
    return Promise.resolve("OK");
});

_installHandler("register-user", function() {
    rl.pause();
    var password = ReadLineSync.question("Enter password: ", {
        hideEchoBack: true,
        mask: ""
    });
    if (password.length < 1)
        return Promise.reject("Invalid password");
    var c = {};
    return rl.question("Enter level: USER | MODER | ADMIN\nYour choice: ").then(function(answer) {
        if (!Tools.contains(["USER", "MODER", "ADMIN"], answer))
            return Promise.reject("Invalid level");
        c.level = answer;
        return rl.question("Enter boards:\n"
            + "Separate board names by spaces.\n"
            + "* - any board\n"
            + "Your choice: ");
    }).then(function(answer) {
        c.boardNames = answer.split(/\s+/gi);
        if (!password.match(/^([0-9a-fA-F]){40}$/)) {
            var sha1 = Crypto.createHash("sha1");
            sha1.update(password);
            password = sha1.digest("hex");
        }
        var availableBoardNames = Board.boardNames();
        for (var i = 0; i < c.boardNames.length; ++i) {
            var boardName = c.boardNames[i];
            if ("*" != boardName && !Tools.contains(availableBoardNames, boardName))
                return Promise.reject("Invalid board(s)");
        }
        return Database.registerUser(password, c.level, c.boardNames);
    }).then(function() {
        return Promise.resolve("OK");
    });
});

var init = function() {
    console.log("Type 'help' for commands");
    rl.prompt();
    rl.on("line", function(line, lineCount, byteCount) {
        if ("" == line)
            return rl.prompt();
        var cmd = "";
        var i = 0;
        for (; i < line.length; ++i) {
            if (line[i] == " ")
                break;
            cmd += line[i];
        }
        if (!handlers.hasOwnProperty(cmd)) {
            console.log("Invalid command. Type 'help' for commands");
            return rl.prompt();
        }
        rl.pause();
        handlers[cmd]((i < (line.length - 1)) ? line.substr(i + 1) : undefined).then(function(msg) {
            if (msg)
                console.log(msg);
            rl.resume();
            rl.prompt();
        }).catch(function(err) {
            console.log(err);
            rl.resume();
            rl.prompt();
        });
    }).on("error", function(err) {
        console.log(err);
    });
    return rl;
};

init.installHandler = _installHandler;

module.exports = init;
