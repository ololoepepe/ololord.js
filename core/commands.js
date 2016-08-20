"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.default = commands;

var _board = require("../boards/board");

var _board2 = _interopRequireDefault(_board);

var _renderer = require("../core/renderer");

var Renderer = _interopRequireWildcard(_renderer);

var _ipc = require("../helpers/ipc");

var IPC = _interopRequireWildcard(_ipc);

var _posts = require("../models/posts");

var PostsModel = _interopRequireWildcard(_posts);

var _users = require("../models/users");

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Crypto = require("crypto");
var Util = require("util");
var vorpal = require("vorpal")();

var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

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
    return IPC.send('exit', exitCode, true).then(function () {
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

vorpal.installHandler('add-superuser', _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    var _ref, password, notHashpass, _ref2, input, ips, hashpass;

    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return requestPassword(this);

                case 2:
                    _ref = _context.sent;
                    password = _ref.password;
                    notHashpass = _ref.notHashpass;
                    _context.next = 7;
                    return this.prompt(Tools.translate('Enter superuser IP list (separate by spaces): '));

                case 7:
                    _ref2 = _context.sent;
                    input = _ref2.input;
                    ips = Tools.ipList(input);

                    if (!(typeof ips === 'string')) {
                        _context.next = 12;
                        break;
                    }

                    return _context.abrupt("return", Promise.reject(new Error(ips)));

                case 12:
                    hashpass = Tools.toHashpass(password, notHashpass);
                    _context.next = 15;
                    return UsersModel.addSuperuser(hashpass, ips);

                case 15:
                    return _context.abrupt("return", 'OK');

                case 16:
                case "end":
                    return _context.stop();
            }
        }
    }, _callee, this);
})), { description: Tools.translate('Registers a superuser.') });

vorpal.installHandler('remove-superuser', _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var _ref3, password, notHashpass, hashpass;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
            switch (_context2.prev = _context2.next) {
                case 0:
                    _context2.next = 2;
                    return requestPassword(this);

                case 2:
                    _ref3 = _context2.sent;
                    password = _ref3.password;
                    notHashpass = _ref3.notHashpass;
                    hashpass = Tools.toHashpass(password, notHashpass);
                    _context2.next = 8;
                    return UsersModel.removeSuperuser(hashpass);

                case 8:
                    return _context2.abrupt("return", 'OK');

                case 9:
                case "end":
                    return _context2.stop();
            }
        }
    }, _callee2, this);
})), { description: Tools.translate('Unregisters a superuser.') });

vorpal.installHandler('rerender-posts [targets...]', function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(args) {
        var result, targets;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        _context3.next = 2;
                        return this.prompt({
                            type: 'confirm',
                            name: 'rerender',
                            default: true,
                            message: Tools.translate('Are you sure? ')
                        });

                    case 2:
                        result = _context3.sent;

                        if (result.rerender) {
                            _context3.next = 5;
                            break;
                        }

                        return _context3.abrupt("return");

                    case 5:
                        targets = Tools.rerenderPostsTargetsFromString((args.targets || []).join(' '));
                        _context3.next = 8;
                        return PostsModel.rerenderPosts(targets);

                    case 8:
                        return _context3.abrupt("return", 'OK');

                    case 9:
                    case "end":
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function (_x) {
        return ref.apply(this, arguments);
    };
}(), {
    description: Tools.translate('Rerenders posts specified as $[1].\n' + 'If $[1] is omitted, rerenders all posts on all boards.\n' + 'Each target is a string in the following form:\n' + '$[2]', '', '[targets...]', '<board name>[:<post number>[:...]]')
});

vorpal.installHandler("stop", function () {
    return IPC.send('stop').then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Closes all workers, preventing incoming connections.") });

vorpal.installHandler("start", function () {
    return IPC.send('start').then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Opens workers for connections if closed.") });

vorpal.installHandler("rerender [what...]", function (args) {
    if (args.options && args.options.list) {
        return Renderer.getRouterPaths(true).then(function (paths) {
            paths.forEach(function (path) {
                if ((typeof path === "undefined" ? "undefined" : _typeof(path)) === 'object') {
                    console.log(path.path, path.description);
                } else {
                    console.log(path);
                }
            });
        });
    }
    return IPC.send('stop').then(function () {
        if (args.what) {
            return Renderer.rerender(args.what);
        } else if (args.options && args.options.archive) {
            return Renderer.rerender();
        } else {
            return Renderer.rerender(['**', '!/*/arch/*']);
        }
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        return Promise.resolve("OK");
    });
}, {
    description: Tools.translate("Rerenders the cache (workers are closed and then opened again)."),
    options: [{
        value: "-a, --archive",
        description: Tools.translate("Rerender archived threads (if no pattern is specified).")
    }, {
        value: '-l, --list',
        description: Tools.translate('Only list available router paths. No rerender.')
    }]
});

vorpal.installHandler("reload-boards", function () {
    return IPC.send('stop').then(function () {
        _board2.default.initialize();
        return IPC.send('reloadBoards');
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Reloads the boards.") });

vorpal.installHandler("reload-config [fileName]", function (args) {
    args = args.fileName;
    return IPC.send('stop').then(function () {
        if (args) config.setConfigFile(args);else config.reload();
        return IPC.send('reloadConfig', args);
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        return Promise.resolve("OK");
    });
}, { description: Tools.translate("Reloads the config file.") });

vorpal.installHandler("reload-templates", function (args) {
    return IPC.send('stop').then(function () {
        return IPC.send('reloadTemplates');
    }).then(function () {
        return IPC.send('start');
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

function commands() {
    console.log(Tools.translate("Type 'help' for commands"));
    vorpal.delimiter("ololord.js>").show();
    return vorpal;
}
//# sourceMappingURL=commands.js.map
