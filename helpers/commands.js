var callbackRead = require("read");
var Crypto = require("crypto");
var Util = require("util");

var Board = require("../boards/board");
var config = require("./config");
var controller = require("./controller");
var Database = require("./database");
var Global = require("./global");
var Tools = require("./tools");

read = function(prompt, options) {
    return new Promise(function(resolve, reject) {
        if (Util.isObject(prompt)) {
            options = prompt;
        } else {
            options = options || {};
            if (!options.prompt)
                options.prompt = prompt;
        }
        callbackRead(options, function(err, result) {
            if (err)
                return reject(err);
            resolve(result);
        });
    });
};

var handlers = {};

read.installHandler = function(cmd, f) {
    if (typeof cmd == "string") {
        handlers[cmd] = f;
    } else {
        cmd.forEach(function(cmd) {
            handlers[cmd] = f;
        });
    }
};

read.installHandler(["quit", "q"], function() {
    process.exit(0);
    return Promise.resolve();
});

read.installHandler(["respawn"], function(args) {
    var status = !isNaN(+args) ? +args : 0;
    return Global.IPC.send("exit", status, true).then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("help", function() {
    console.log("q | quit - Exit the application");
    console.log("help - Print this Help");
    console.log("set <path> [value] - Set an option (config.json). "
        + "If value is not specified, you will be prompted to enter it");
    console.log("get <path> - Print an option (config.json)");
    console.log("remove <path> - Remove option (config.json)");
    console.log("add-superuser - Register a user");
    console.log("rerender-posts [board] - Rerenders all posts (workers are closed and then opened again)");
    console.log("stop - Closes all workers, preventing incoming connections");
    console.log("start - Opens workers for connections if closed");
    console.log("regenerate - Regenerates the cache (workers are closed and then opened again)");
    console.log("reload-templates - Reloads the templates and the partials (including public ones)");
    console.log("rebuild-search-index - Rebuilds post search index");
    console.log("uptime - Show server uptime");
    return Promise.resolve();
});

read.installHandler("set", function(args) {
    var path = args.split(/\s+/)[0];
    var value = args.split(/\s+/).slice(1).join(" ");
    if (!path)
        return Promise.reject("Invalid command. Type 'help' for commands");
    if (value) {
        config.set(path, JSON.parse(value));
        return Promise.resolve("OK");
    }
    return read("Enter value for '" + path + "': ").then(function(answer) {
        config.set(path, (typeof answer == "string") ? answer : JSON.parse(answer));
        return Promise.resolve("OK");
    });
});

read.installHandler("get", function(args) {
    if (!args)
        return Promise.reject(console.log("Invalid command. Type 'help' for commands"));
    var v = config(args);
    if (undefined == v)
        return Promise.reject("No such value");
    return Promise.resolve("Value for '" + args + "': " + JSON.stringify(v, null, 4));
});

read.installHandler("remove", function(args) {
    if (!args)
        Promise.reject("Invalid command. Type 'help' for commands");
    config.remove(args);
    return Promise.resolve("OK");
});

var requestPassword = function() {
    var c = {};
    console.log(Tools.translate("Enter password: "));
    return read({
        silent: true,
        replace: "*"
    }).then(function(password) {
        if (!password)
            return Promise.reject(Tools.translate("Invalid password"));
        c.password = password;
        if (!Tools.mayBeHashpass(password))
            return Promise.resolve();
        return read(Tools.translate("That is a hashpass, isn't it? [Yes/no]: "));
    }).then(function(result) {
        var notHashpass = (result || "").toLowerCase();
        notHashpass = (notHashpass && notHashpass != "yes" && notHashpass != "y");
        return Promise.resolve({
            password: c.password,
            notHashpass: notHashpass
        });
    });
};

read.installHandler("add-superuser", function() {
    var c = {};
    return requestPassword().then(function(result) {
        c.password = result.password;
        c.notHashpass = result.notHashpass;
        return read(Tools.translate("Enter superuser IP list (separate by spaces): "));
    }).then(function(result) {
        var ips = Tools.ipList(result);
        if (typeof ips == "string")
            return Promise.reject(ips);
        return Database.addSuperuser(c.password, ips, c.notHashpass);
    }).then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("remove-superuser", function() {
    return requestPassword().then(function(result) {
        return Database.removeSuperuser(result.password, result.notHashpass);
    }).then(function() {
        return Promise.resolve("OK");
    });
});

/*read.installHandler("register-user", function() {
    var password = requestPassword();
    if (!password)
        return Promise.reject("Invalid password");
    var c = {};
    return read("Enter level: USER | MODER | ADMIN\nYour choice: ").then(function(answer) {
        if (!Tools.contains(["USER", "MODER", "ADMIN"], answer))
            return Promise.reject("Invalid level");
        c.level = answer;
        return read("Enter boards:\n"
            + "Separate board names by spaces.\n"
            + "* - any board\n"
            + "Your choice: ");
    }).then(function(answer) {
        c.boardNames = answer.split(/\s+/gi);
        if (!Tools.mayBeHashpass(password))
            password = Tools.sha1(password);
        var availableBoardNames = Board.boardNames();
        for (var i = 0; i < c.boardNames.length; ++i) {
            var boardName = c.boardNames[i];
            if ("*" != boardName && !Tools.contains(availableBoardNames, boardName))
                return Promise.reject("Invalid board(s)");
        }
        return read("Enter user IP (zero, one or more, separated by commas):\n"
            + "[ip][,ip]...\n"
            + "List: ");
    }).then(function(answer) {
        c.ips = answer ? answer.split(".") : [];
        return Database.registerUser(password, c.level, c.boardNames, c.ips);
    }).then(function() {
        return Promise.resolve("OK");
    });
});*/

read.installHandler("rerender-posts", function(args) {
    var boards = Board.boardNames();
    if (args) {
        if (boards.indexOf(args) < 0)
            return Promise.reject("Invalid board");
        boards = [args];
    }
    return read("Are you sure? [Yes/no] ").then(function(answer) {
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

read.installHandler("stop", function(args) {
    return Global.IPC.send("stop").then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("start", function(args) {
    return Global.IPC.send("start").then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("regenerate", function(args) {
    return Global.IPC.send("stop").then(function() {
        return controller.regenerate();
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("reload-templates", function(args) {
    return Global.IPC.send("stop").then(function() {
        return controller.initialize();
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        return Promise.resolve("OK");
    });
});

read.installHandler("rebuild-search-index", function(args) {
    return read("Are you sure? [Yes/no] ").then(function(answer) {
        answer = answer.toLowerCase();
        if (answer && answer != "yes" && answer != "y")
            return Promise.resolve();
        return Database.rebuildSearchIndex().then(function() {
            return Promise.resolve();
        });
    });
});

read.installHandler("uptime", function() {
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

module.exports = function() {
    console.log("Type 'help' for commands");
    var f = function() {
        return read("ololord.js> ").then(function(line) {
            if ("" == line)
                return f();
            var cmd = "";
            var i = 0;
            for (; i < line.length; ++i) {
                if (line[i] == " ")
                    break;
                cmd += line[i];
            }
            if (!handlers.hasOwnProperty(cmd)) {
                console.log("Invalid command. Type 'help' for commands");
                return f();
            }
            return handlers[cmd]((i < (line.length - 1)) ? line.substr(i + 1) : undefined).then(function(msg) {
                if (msg)
                    console.log(msg);
            }).catch(function(err) {
                console.log(err.stack ? err.stack : err);
            }).then(function() {
                return f();
            });
        });
    };
    f().catch(function(err) {
        console.log(err.stack ? err.stack : err);
    });
    return read;
};
