var Crypto = require("crypto");
var ReadLine = require("readline");
var ReadLineSync = require("readline-sync");

var Board = require("../boards/board");
var config = require("./config");
var controller = require("./controller");
var Database = require("./database");
var Global = require("./global");
var Tools = require("./tools");

var rl = ReadLine.createInterface({
    "input": process.stdin,
    "output": process.stdout
});

rl.setPrompt("ololord.js> ");

rl.tmp_question = rl.question;
rl.question = function(question) {
    return new Promise(function(resolve, reject) {
        rl.tmp_question.apply(rl, [question, resolve]);
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
    return Global.IPC.send("exit", status, true).then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("help", function() {
    console.log("q | quit - Exit the application");
    console.log("help - Print this Help");
    console.log("set <path> [value] - Set an option (config.json). "
        + "If value is not specified, you will be prompted to enter it");
    console.log("get <path> - Print an option (config.json)");
    console.log("remove <path> - Remove option (config.json)");
    console.log("register-user - Register a user");
    console.log("rerender-posts [board] - Rerenders all posts (workers are closed and then opened again)");
    console.log("stop - Closes all workers, preventing incoming connections");
    console.log("start - Opens workers for connections if closed");
    console.log("regenerate - Regenerates the cache (workers are closed and then opened again)");
    console.log("rebuild-search-index - Rebuilds post search index");
    console.log("uptime - Show server uptime");
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
        return rl.question("Enter user IP (zero, one or more, separated by commas):\n"
            + "[ip][,ip]...\n"
            + "List: ");
    }).then(function(answer) {
        c.ips = answer ? answer.split(".") : [];
        return Database.registerUser(password, c.level, c.boardNames, c.ips);
    }).then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("rerender-posts", function(args) {
    var boards = Board.boardNames();
    if (args) {
        if (boards.indexOf(args) < 0)
            return Promise.reject("Invalid board");
        boards = [args];
    }
    return rl.question("Are you sure? [Yes/no] ").then(function(answer) {
        answer = answer.toLowerCase();
        if (answer && answer != "yes" && answer != "y")
            return Promise.resolve();
        return Global.IPC.send("stop").then(function() {
            return Database.rerenderPosts(boards);
        }).then(function() {
            return controller.regenerate();
        }).then(function() {
            return Global.IPC.send("start");
        }).then(function() {
            return Promise.resolve("OK");
        });
    });
});

_installHandler("stop", function(args) {
    return Global.IPC.send("stop").then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("start", function(args) {
    return Global.IPC.send("start").then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("regenerate", function(args) {
    return Global.IPC.send("stop").then(function() {
        return controller.regenerate();
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        return Promise.resolve("OK");
    });
});

_installHandler("rebuild-search-index", function(args) {
    return rl.question("Are you sure? [Yes/no] ").then(function(answer) {
        answer = answer.toLowerCase();
        if (answer && answer != "yes" && answer != "y")
            return Promise.resolve();
        return Database.rebuildSearchIndex().then(function() {
            return Promise.resolve();
        });
    });
});

_installHandler("uptime", function() {
    var format = function(seconds) {
        var pad = function(s) {
            return (s < 10 ? "0" : "") + s;
        }
        var days = Math.floor(seconds / (24 * 60 * 60));
        var hours = Math.floor(seconds % (24 * 60 * 60) / (60 * 60));
        var minutes = Math.floor(seconds % (60 * 60) / 60);
        var seconds = Math.floor(seconds % 60);
        return days + " days " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    }
    return Promise.resolve(format(process.uptime()));
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
            Global.error(err.stack ? err.stack : err);
            rl.resume();
            rl.prompt();
        });
    }).on("error", function(err) {
        Global.error(err);
    });
    return rl;
};

init.installHandler = _installHandler;

module.exports = init;
