"use strict";

var Crypto = require("crypto");
var Util = require("util");
var vorpal = require("vorpal")();

var Board = require("../boards/board");
var config = require("./config");
var controller = require("./controller");
var Database = require("./database");
var Global = require("./global");
var Tools = require("./tools");

var requestPassword = function requestPassword(thisArg) {
    var c = {};
    return thisArg.prompt.call(thisArg, {
        type: "password",
        name: "password",
        message: Tools.translate("Enter password: ")
    }).then(function (result) {
        c.password = result.password;
        if (!c.password) return Promise.reject(Tools.translate("Invalid password"));
        if (!Tools.mayBeHashpass(c.password)) return Promise.resolve();
        return thisArg.prompt.call(thisArg, {
            type: "confirm",
            name: "hashpass",
            default: true,
            message: Tools.translate("That is a hashpass, isn't it? ")
        });
    }).then(function (result) {
        var notHashpass = !result || !result.hashpass;
        return Promise.resolve({
            password: c.password,
            notHashpass: notHashpass
        });
    });
};

vorpal.installHandler = function (cmd, f, options) {
    var description = options && options.description || undefined;
    var command = vorpal.command(cmd, description).action(function (args, callback) {
        var prompt = this.prompt;
        var _this = this;
        this.prompt = function (options) {
            return new Promise(function (resolve, reject) {
                var simple = typeof options == "string";
                if (simple) {
                    options = {
                        message: options,
                        name: "input"
                    };
                }
                prompt.call(_this, options, function (result) {
                    resolve(simple ? result.input : result);
                });
            });
        };
        f.call(this, args).then(function (result) {
            if (result) console.log(result);
            callback();
        }).catch(function (err) {
            console.log(err && err.stack || err);
            callback();
        });
    }).cancel(function () {
        console.log(Tools.translate("Cancelled"));
    });
    if (options && options.alias) {
        if (Util.isArray(options.alias)) command.alias.apply(command, options.alias);else command.alias(options.alias);
    }
    if (options && Util.isArray(options.options)) {
        options.options.forEach(function (opt) {
            command.option(opt.value, opt.description || undefined);
        });
    }
};

vorpal.find("exit").remove();

vorpal.installHandler("quit", function () {
    process.exit(0);
    return Promise.resolve("OK");
}, {
    description: Tools.translate(Tools.translate("Quits the application.")),
    alias: ["exit", "q"]
});

vorpal.installHandler("respawn [exitCode]", function (args) {
    var exitCode = !isNaN(+args.exitCode) ? +args.exitCode : 0;
    return Global.IPC.send("exit", exitCode, true).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Respawns worker processes with the passed exit code.") });

vorpal.installHandler("set <key> [value]", function (args) {
    var path = args.key;
    var value = args.value;
    if (!path) return Promise.reject(Tools.translate("Invalid command. Type 'help' for commands"));
    if (value) {
        try {
            console.log(value);
            value = JSON.parse(value);
        } catch (err) {
            //Do nothing
        }
        config.set(path, value);
        return Promise.resolve("OK");
    }
    return this.prompt(Tools.translate("Enter value for") + " '" + path + "': ").then(function (result) {
        config.set(path, typeof result == "string" ? result : JSON.parse(answer));
        return Promise.resolve("OK");
    });
}, {
    description: Tools.translate("Sets the option (config.json) at the key specified. " + "If no value is specified, prompts to enter it.")
});

vorpal.installHandler("get <key>", function (args) {
    var path = args.key;
    if (!path) return Promise.reject(console.log(Tools.translate("Invalid command. Type 'help' for commands")));
    var v = config(path);
    if (undefined == v) return Promise.reject("No such value");
    return Promise.resolve(Tools.translate("Value for") + " '" + path + "': " + JSON.stringify(v, null, 4));
}, { description: Tools.translate("Prints the option (config.json) at the key specified.") });

vorpal.installHandler("remove <key>", function (args) {
    var path = args.key;
    if (!path) Promise.reject(Tools.translate("Invalid command. Type 'help' for commands"));
    config.remove(path);
    return Promise.resolve("OK");
}, { description: Tools.translate("Removes the option (config.json) at the key specified.") });

vorpal.installHandler("add-superuser", function () {
    var c = {};
    var _this = this;
    return requestPassword(this).then(function (result) {
        c.password = result.password;
        c.notHashpass = result.notHashpass;
        return _this.prompt(Tools.translate("Enter superuser IP list (separate by spaces): "));
    }).then(function (result) {
        var ips = Tools.ipList(result.input);
        if (typeof ips == "string") return Promise.reject(ips);
        return Database.addSuperuser(c.password, ips, c.notHashpass);
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Registers a superuser.") });

vorpal.installHandler("remove-superuser", function () {
    return requestPassword(this).then(function (result) {
        return Database.removeSuperuser(result.password, result.notHashpass);
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Unregisters a superuser.") });

vorpal.installHandler("rerender-posts [board]", function (args) {
    args = args.board;
    var boards = Board.boardNames();
    if (args) {
        if (boards.indexOf(args) < 0) return Promise.reject(Tools.translate("Invalid board"));
        boards = [args];
    }
    return this.prompt({
        type: "confirm",
        name: "rerender",
        default: true,
        message: Tools.translate("Are you sure? ")
    }).then(function (result) {
        if (!result.rerender) return Promise.resolve();
        return Global.IPC.send("stop").then(function () {
            return Database.rerenderPosts(boards);
        }).then(function () {
            return controller.regenerate();
        }).then(function () {
            return Global.IPC.send("start");
        }).then(function () {
            return Promise.resolve("OK");
        });
    });
}, { description: Tools.translate("Rerenders all posts (workers are closed and then opened again).") });

vorpal.installHandler("stop", function () {
    return Global.IPC.send("stop").then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Closes all workers, preventing incoming connections.") });

vorpal.installHandler("start", function () {
    return Global.IPC.send("start").then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Opens workers for connections if closed.") });

vorpal.installHandler("regenerate", function (args) {
    return Global.IPC.send("stop").then(function () {
        return controller.regenerate(args.options && !!args.options.archive);
    }).then(function () {
        return Global.IPC.send("start");
    }).then(function () {
        return Promise.resolve("OK");
    });
}, {
    description: Tools.translate("Regenerates the cache (workers are closed and then opened again)."),
    options: [{
        value: "-a, --archive",
        description: Tools.translate("Regenerate archived threads, too.")
    }]
});

vorpal.installHandler("reload-boards", function () {
    return Global.IPC.send("stop").then(function () {
        Board.initialize();
        return Global.IPC.send("reloadBoards");
    }).then(function () {
        return Global.IPC.send("start");
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Reloads the boards.") });

vorpal.installHandler("reload-config [fileName]", function (args) {
    args = args.fileName;
    return Global.IPC.send("stop").then(function () {
        if (args) config.setConfigFile(args);else config.reload();
        return Global.IPC.send("reloadConfig", args);
    }).then(function () {
        return Global.IPC.send("start");
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Reloads the config file.") });

vorpal.installHandler("reload-templates", function (args) {
    return Global.IPC.send("stop").then(function () {
        return Global.IPC.send("reloadTemplates");
    }).then(function () {
        return Global.IPC.send("start");
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Reloads the templates and the partials (including public ones).") });

vorpal.installHandler("rebuild-search-index", function (args) {
    return this.prompt({
        type: "confirm",
        name: "rebuild",
        default: true,
        message: Tools.translate("Are you sure? ")
    }).then(function (result) {
        if (!result.rebuild) return Promise.resolve();
        return Database.rebuildSearchIndex().then(function () {
            return Promise.resolve();
        });
    });
}, { description: Tools.translate("Rebuilds post search index.") });

vorpal.installHandler("uptime", function () {
    var format = function format(seconds) {
        var pad = function pad(s) {
            return (s < 10 ? "0" : "") + s;
        };
        var days = Math.floor(seconds / (24 * 60 * 60));
        var hours = Math.floor(seconds % (24 * 60 * 60) / (60 * 60));
        var minutes = Math.floor(seconds % (60 * 60) / 60);
        var seconds = Math.floor(seconds % 60);
        return days + " days " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    };
    return Promise.resolve(format(process.uptime()));
}, { description: Tools.translate("Shows server uptime.") });

module.exports = function () {
    console.log(Tools.translate("Type 'help' for commands"));
    vorpal.delimiter("ololord.js>").show();
    return vorpal;
};
//# sourceMappingURL=commands.js.map
