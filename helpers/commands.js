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

rl.questionP = function(question) {
    return (function(question) {
        return new Promise(function(resolve, reject) {
            rl.question(question, function(answer) {
                resolve(answer);
            });
        });
    })(question);
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
});

_installHandler(["respawn"], function(args) {
    var status = !isNaN(+args) ? +args : 0;
    for (var id in cluster.workers) {
        var worker = cluster.workers[id];
        worker.process.send({
            type: "exit",
            status: status
        });
    }
});

_installHandler("help", function() {
    console.log("q | quit - Exit the application");
    console.log("help - Print this Help");
});

_installHandler("set", function(args) {
    var path = args.split(/\s+/)[0];
    var value = args.split(/\s+/).slice(1).join(" ");
    if (!path)
        console.log("Invalid command. Type 'help' for commands");
    if (value) {
        config.set(path, JSON.parse(value));
        console.log("OK");
        return;
    }
    rl.pause();
    rl.questionP("Enter value for '" + path + "': ").then(function(answer) {
        config.set(path, (typeof answer == "string") ? answer : JSON.parse(answer));
        console.log("OK");
        rl.resume();
        rl.prompt();
    }).catch(function(err) {
        console.log("Error: " + err);
    });
});

_installHandler("get", function(args) {
    if (!args)
        console.log("Invalid command. Type 'help' for commands");
    var v = config(args);
    if (undefined == v)
        console.log("No such value");
    else
        console.log("Value for '" + args + "': " + JSON.stringify(v, null, 4));
});

_installHandler("remove", function(args) {
    if (!args)
        console.log("Invalid command. Type 'help' for commands");
    config.remove(args);
    console.log("OK");
});

_installHandler("register-user", function() {
    rl.pause();
    var _pwd = ReadLineSync.question("Enter password: ", {
        hideEchoBack: true,
        mask: ""
    });
    if (_pwd.length < 1)
        throw "Invalid password";
    var _level;
    var _boardNames;
    var _password;
    var _RegisteredUser;
    var _t;
    rl.questionP("Enter level: USER | MODER | ADMIN\n"
            + "Your choice: ").then(function(answer) {
        if (!Tools.contains(["USER", "MODER", "ADMIN"], answer))
            throw "Invalid level";
        _level = answer;
        return rl.questionP("Enter boards:\n"
            + "Separate board names by spaces.\n"
            + "* - any board\n"
            + "Your choice: ");
    }).then(function(answer) {
        _boardNames = answer.split(/\s+/gi);
        if (_pwd.match(/^([0-9a-fA-F]){40}$/)) {
            _password = _pwd;
        } else {
            var sha1 = Crypto.createHash("sha1");
            sha1.update(_pwd);
            _password = sha1.digest("hex");
        }
        var availableBoardNames = Board.boardNames();
        _boardNames.forEach(function (boardName) {
            if ("*" != boardName && !Tools.contains(availableBoardNames, boardName))
                throw "Invalid board(s)";
        });
        return Database.registerUser(_password, _level, _boardNames);
    }).then(function() {
        console.log("OK");
        rl.resume();
        rl.prompt();
    }).catch(function(err) {
        console.log("Error: " + err);
        rl.resume();
        rl.prompt();
    });
});

var init = function() {
    console.log("Type 'help' for commands");
    rl.prompt();
    rl.on("line", function(line, lineCount, byteCount) {
        if ("" == line)
            return rl.prompt();;
        var cmd = "";
        var i = 0;
        for (; i < line.length; ++i) {
            if (line[i] == " ")
                break;
            cmd += line[i];
        }
        if (!handlers.hasOwnProperty(cmd)) {
            console.log("Invalid command. Type 'help' for commands");
            return rl.prompt();;
        }
        handlers[cmd]((i < (line.length - 1)) ? line.substr(i + 1) : undefined);
        rl.prompt();
    }).on("error", function(e) {
        //
    });
    return rl;
};

init.installHandler = _installHandler;

module.exports = init;
