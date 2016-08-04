'use strict';

var _fsWatcher = require('./fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _statistics = require('../models/statistics');

var StatisticsModel = _interopRequireWildcard(_statistics);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var _ = require('underscore');
var browserify = require('browserify');
var Crypto = require("crypto");
var dot = require("dot");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Highlight = require("highlight.js");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var Path = require("path");
var random = require("random-js")();
var Util = require("util");

var Cache = require("./cache");
var config = require("./config");
var Global = require("./global");
var Board = require("../boards/board");

var templates = {};
var notFoundImageFileNames = [];
var langNames = require("../misc/lang-names.json");

function transformIPBans(bans) {
    return _(bans).reduce(function (acc, ban, ip) {
        ip = Tools.correctAddress(ip);
        if (ip) {
            acc[ip] = ban;
        }
        return acc;
    }, {});
}

var ipBans = Tools.createWatchedResource(__dirname + '/../misc/bans.json', function (path) {
    return transformIPBans(require(path));
}, function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
        var data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return FS.read(path);

                    case 2:
                        data = _context.sent;

                        ipBans = transformIPBans(JSON.parse(data));

                    case 4:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x) {
        return ref.apply(this, arguments);
    };
}()) || {};

var controller = function controller(templateName, modelData) {
    var template = templates[templateName];
    if (!template) {
        console.error(Tools.translate('Invalid template') + ': ' + templateName);
        return '';
    }
    var baseModelData = controller.baseModel();
    baseModelData.templateName = templateName;
    baseModelData.tr = controller.translationsModel().tr;
    baseModelData.boards = controller.boardsModel().boards; //TODO: cache
    baseModelData.boardGroups = controller.boardsModel().boardGroups; //TODO: cache
    baseModelData._ = _;
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    baseModelData.isImageType = Tools.isImageType;
    baseModelData.isAudioType = Tools.isAudioType;
    baseModelData.isVideoType = Tools.isVideoType;
    baseModelData.escaped = Tools.escaped;
    baseModelData.escapedSelector = Tools.escapedSelector;
    baseModelData.banner = _(_(baseModelData.boards.filter(function (board) {
        return board.bannerFileNames.length > 0;
    }).map(function (board) {
        return board.bannerFileNames.map(function (fileName) {
            return {
                boardName: board.name,
                boardTitle: board.title,
                fileName: fileName
            };
        });
    })).flatten()).sample();
    var timeOffset = config("site.timeOffset", 0);
    var locale = config("site.locale", "en");
    var format = config("site.dateFormat", "MM/DD/YYYY HH:mm:ss");
    baseModelData.formattedDate = function (date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format(format);
    };
    baseModelData.translate = Tools.translate;
    if (!modelData) modelData = {};
    modelData = merge.recursive(baseModelData, modelData);
    return template(modelData);
};

controller.checkBan = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(ip, boardNames) {
        var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var write = _ref.write;
        var ban, bans;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        ip = Tools.correctAddress(ip);
                        ban = ipBans[ip];

                        if (!(ban && (write || 'NO_ACCESS' === ban.level))) {
                            _context2.next = 4;
                            break;
                        }

                        return _context2.abrupt('return', Promise.reject({ ban: ban }));

                    case 4:
                        _context2.next = 6;
                        return UsersModel.getBannedUserBans(ip, boardNames);

                    case 6:
                        bans = _context2.sent;

                        ban = _(bans).find(function (ban) {
                            return ban && (write || 'NO_ACCESS' === ban.level);
                        });

                        if (!ban) {
                            _context2.next = 10;
                            break;
                        }

                        return _context2.abrupt('return', Promise.reject({ ban: ban }));

                    case 10:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function (_x2, _x3, _x4) {
        return ref.apply(this, arguments);
    };
}();

controller.baseModel = function () {
    return {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", ""),
            locale: config("site.locale", "en"),
            dateFormat: config("site.dateFormat", "MM/DD/YYYY hh:mm:ss"),
            timeOffset: config("site.timeOffset", 0),
            vkontakte: {
                integrationEnabled: !!config("site.vkontakte.integrationEnabled", false),
                appId: config("site.vkontakte.appId", "")
            },
            twitter: {
                integrationEnabled: !!config("site.twitter.integrationEnabled", true)
            },
            ws: {
                transports: config("site.ws.transports", "")
            }
        },
        styles: Tools.styles(),
        codeStyles: Tools.codeStyles(),
        availableCodeLangs: Highlight.listLanguages().map(function (lang) {
            return {
                id: lang,
                name: langNames.hasOwnProperty(lang) ? langNames[lang] : lang
            };
        }),
        maxSearchQueryLength: config("site.maxSearchQueryLength", 50),
        markupModes: [{
            name: "NONE",
            title: Tools.translate("No markup", "markupMode")
        }, {
            name: markup.MarkupModes.ExtendedWakabaMark,
            title: Tools.translate("Extended WakabaMark only", "markupMode")
        }, {
            name: markup.MarkupModes.BBCode,
            title: Tools.translate("bbCode only", "markupMode")
        }, {
            name: markup.MarkupModes.ExtendedWakabaMark + "," + markup.MarkupModes.BBCode,
            title: Tools.translate("Extended WakabaMark and bbCode", "markupMode")
        }],
        supportedCaptchaEngines: Captcha.captchaIds().filter(function (id) {
            return 'node-captcha-noscript' !== id;
        }).map(function (id) {
            return Captcha.captcha(id).info();
        })
    };
};

controller.boardsModel = function () {
    var boards = Board.boardNames().map(function (boardName) {
        return Board.board(boardName).info();
    });
    var addDefault = false;
    var boardGroups = _(config('boardGroups', {})).map(function (group, name) {
        group.name = name;
        group.boards = boards.reduce(function (acc, board) {
            if (!board.groupName) {
                addDefault = true;
            } else if (name === board.groupName) {
                acc.push(board);
            }
            return acc;
        }, []);
        return group;
    });
    if (addDefault || boardGroups.length < 1) {
        (function () {
            var noGroups = boardGroups.length < 1;
            boardGroups.push({
                name: '',
                boards: boards.filter(function (board) {
                    return noGroups || !board.hidden && !board.groupName;
                })
            });
        })();
    }
    boardGroups = boardGroups.filter(function (group) {
        return group.boards.length > 0;
    });
    boardGroups.sort(function (g1, g2) {
        if (!g1.priority && !g2.priority) {
            return g1.name < g2.name ? -1 : g1.name > g2.name ? 1 : 0;
        }
        return (g1.priority || 0) < (g2.priority || 0) ? -1 : (g1.priority || 0) > (g2.priority || 0) ? 1 : 0;
    });
    boardGroups.forEach(function (group) {
        group.boards.sort(function (b1, b2) {
            if (!b1.priority && !b2.priority) {
                return b1.name < b2.name ? -1 : b1.name > b2.name ? 1 : 0;
            }
            return (b1.priority || 0) < (b2.priority || 0) ? -1 : (b1.priority || 0) > (b2.priority || 0) ? 1 : 0;
        });
    });
    return {
        boards: boards,
        boardGroups: boardGroups
    };
};

controller.boardModel = function (board) {
    if (Util.isString(board)) board = Board.board(board);
    return board ? { board: board.info() } : null;
};

controller.translationsModel = function () {
    return { tr: Tools.translate.translations };
};

controller.notFoundImageFileNamesModel = function () {
    return notFoundImageFileNames;
};

controller.compileTemplates = function () {
    console.log('Compiling templates, please, wait...');
    var sourcePath = __dirname + '/../src/views';
    var destinationPath = __dirname + '/../views';
    var settings = {
        evaluate: /\{\{([\s\S]+?)\}\}/g,
        interpolate: /\{\{=([\s\S]+?)\}\}/g,
        encode: /\{\{!([\s\S]+?)\}\}/g,
        use: /\{\{#([\s\S]+?)\}\}/g,
        define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
        conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
        iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
        varname: 'it',
        strip: false,
        append: true,
        selfcontained: false
    };
    var includes = {};
    var rx = /[^a-zA-Z\$_]/gi;
    var fileNames = void 0;
    var EXCLUDED_FILES = new Set(['index.js.template', '.gitignore']);
    return FS.list(destinationPath).then(function (list) {
        return Tools.series(list.filter(function (entryName) {
            return !EXCLUDED_FILES.has(entryName);
        }), function (entryName) {
            return FS.removeTree(destinationPath + '/' + entryName);
        });
    }).then(function () {
        return FS.listTree(sourcePath, function (_, stat) {
            return stat.isFile();
        });
    }).then(function (list) {
        fileNames = list.map(function (fileName) {
            return fileName.substr(sourcePath.length - 10);
        });
        return Tools.series(fileNames, function (fileName) {
            if (!/\.def(\.dot|\.jst)?$/.test(fileName)) {
                return;
            }
            return FS.read(sourcePath + '/' + fileName).then(function (s) {
                includes[fileName.split('.').slice(0, -1).join('.')] = s;
            });
        });
    }).then(function () {
        var encodeHTMLSource = dot.encodeHTMLSource.toString();
        var doNotSkip = settings.doNotSkipEncoded || '';
        return Tools.series(fileNames, function (fileName) {
            if (!/\.jst(\.dot|\.def)?$/.test(fileName)) {
                return;
            }
            var compiled = '(function(){';
            return FS.read(sourcePath + '/' + fileName).then(function (s) {
                var moduleName = fileName.split('.').shift().replace(rx, '_');
                compiled += dot.template(s, settings, includes).toString().replace('anonymous', moduleName);
                compiled += 'var itself=' + moduleName + ', _encodeHTML=(' + encodeHTMLSource + '(' + doNotSkip + '));';
                compiled += 'module.exports=itself;})()';
                return Tools.promiseIf(fileName.split('/').length > 1, function () {
                    return FS.makeTree(destinationPath + '/' + fileName.split('/').slice(0, -1).join('/'));
                });
            }).then(function () {
                return FS.write(destinationPath + '/' + fileName.split('.').slice(0, -1).join('.') + '.js', compiled);
            });
        });
    });
};

controller.initialize = function () {
    var templatesPath = __dirname + '/../views';
    return FS.list(__dirname + '/../public/img/404').then(function (fileNames) {
        notFoundImageFileNames = fileNames.filter(function (fileName) {
            return fileName != ".gitignore";
        });
        return FS.listTree(templatesPath, function (_, stat) {
            return stat.isFile();
        });
    }).then(function (fileNames) {
        templates = fileNames.filter(function (fileName) {
            return fileName.split('.').pop() === 'js' && fileName.split('/').pop() !== 'index.js';
        }).map(function (fileName) {
            return fileName.substr(templatesPath.length - 10).split('.').slice(0, -1).join('.');
        }).reduce(function (acc, templateName) {
            acc[templateName] = require('../views/' + templateName + '.js');
            return acc;
        }, {});
    });
};

controller.postingSpeedString = function (launchDate, lastPostNumber) {
    launchDate = +launchDate;
    if (isNaN(launchDate)) return "-";
    var zeroSpeedString = function zeroSpeedString(nonZero) {
        if (lastPostNumber && launchDate) return "1 " + nonZero;else return "0 " + Tools.translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function speedString(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return ss.split(".").pop() != "0" ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = _.now() - launchDate;
    var duptime = uptimeMsecs / Tools.Hour;
    var uptime = Math.floor(duptime);
    var shour = Tools.translate("post(s) per hour.", "postingSpeed");
    if (!uptime) {
        return zeroSpeedString(shour);
    } else if (Math.floor(lastPostNumber / uptime) > 0) {
        return speedString(duptime) + " " + shour;
    } else {
        duptime /= 24;
        uptime = Math.floor(duptime);
        var sday = Tools.translate("post(s) per day.", "postingSpeed");
        if (!uptime) {
            return zeroSpeedString(sday);
        } else if (Math.floor(lastPostNumber / uptime) > 0) {
            return speedString(duptime) + " " + sday;
        } else {
            duptime /= 365.0 / 12.0;
            uptime = Math.floor(duptime);
            var smonth = Tools.translate("post(s) per month.", "postingSpeed");
            if (!uptime) {
                return zeroSpeedString(smonth);
            } else if (Math.floor(lastPostNumber / uptime) > 0) {
                return speedString(duptime) + " " + smonth;
            } else {
                duptime /= 12.0;
                uptime = Math.floor(duptime);
                var syear = Tools.translate("post(s) per year.", "postingSpeed");
                if (!uptime) return zeroSpeedString(syear);else if (Math.floor(lastPostNumber / uptime) > 0) return speedString(duptime) + " " + syear;else return "0 " + syear;
            }
        }
    }
};

controller.regenerate = function (regenerateArchived) {
    return Tools.series(["JSON", "HTML"], function (type) {
        console.log('Generating ' + type + ' cache, please, wait...');
        return Tools.series(require("../controllers").routers, function (router) {
            var f = router['generate' + type];
            if (typeof f != "function") return Promise.resolve();
            return f.call(router).then(function (result) {
                return Tools.series(result, function (data, id) {
                    return Cache.writeFile(id, data);
                });
            });
        });
    }).then(function () {
        if (!regenerateArchived) return Promise.resolve();
        console.log('Generating archived threads cache, please, wait...');
        return Tools.series(Board.boardNames(), function (boardName) {
            var archPath = __dirname + '/../public/' + boardName + '/arch';
            return FS.exists(archPath).then(function (exists) {
                return Tools.promiseIf(exists, function () {
                    var board = Board.board(boardName);
                    return FS.list(archPath).then(function (fileNames) {
                        return Tools.series(fileNames.filter(function (fileName) {
                            return fileName.split(".").pop() == "json";
                        }), function (fileName) {
                            var threadNumber = +fileName.split(".").shift();
                            var c = {};
                            return BoardModel.getThread(board, threadNumber, true).then(function (model) {
                                c.model = model;
                                return FS.write(archPath + '/' + threadNumber + '.json', JSON.stringify(c.model));
                            }).then(function () {
                                return BoardModel.generateThreadHTML(board, threadNumber, c.model, true);
                            }).then(function (data) {
                                return FS.write(archPath + '/' + threadNumber + '.html', data);
                            }).catch(function (err) {
                                Global.error(err.stack || err);
                            }).then(function () {
                                return Promise.resolve();
                            });
                        });
                    });
                });
            }).catch(function (err) {
                Global.error(err.stack || err);
            }).then(function () {
                return Promise.resolve();
            });
        });
    }).then(function () {
        return StatisticsModel.generateStatistics();
    }).then(function () {
        if (!config("server.rss.enabled", true)) return Promise.resolve();
        console.log("Generating RSS, please, wait...");
        return BoardModel.generateRSS().catch(function (err) {
            Global.error(err.stack || err);
        }).then(function () {
            return Promise.resolve();
        });;
    }).then(function () {
        return controller.generateTemplatingJavaScriptFile();
    }).then(function () {
        return controller.checkCustomJavaScriptFileExistence();
    }).then(function () {
        return controller.checkCustomCSSFilesExistence();
    });
};

controller.generateTemplatingJavaScriptFile = function () {
    console.log('Generating templating JavaScript file, please, wait...');
    var models = JSON.stringify({
        base: controller.baseModel(),
        boards: controller.boardsModel(),
        notFoundImageFileNames: controller.notFoundImageFileNamesModel(),
        tr: controller.translationsModel()
    });
    var path = __dirname + '/../views';
    var indexPath = path + '/index.js';
    var templateNames;
    return FS.listTree(path, function (_, stat) {
        return stat.isFile();
    }).then(function (fileNames) {
        templateNames = fileNames.filter(function (fileName) {
            return fileName.split('.').pop() === 'js' && 'index.js' !== fileName;
        }).map(function (fileName) {
            return fileName.substr(path.length - 10);
        });
        return FS.read(indexPath + '.template');
    }).then(function (s) {
        FS.write(indexPath, s.replace('{{models}}', models));
    }).then(function () {
        var string = '';
        var stream = browserify({
            entries: indexPath,
            debug: false
        });
        templateNames.forEach(function (lib) {
            stream.require('./views/' + lib);
        });
        stream = stream.bundle();
        stream.on('data', function (data) {
            string += data;
        });
        return new Promise(function (resolve, reject) {
            stream.on('end', function () {
                resolve(string);
            });
            stream.on('error', reject);
        });
    }).then(function (string) {
        return FS.write(__dirname + '/../public/js/templating.js', string.split(path.split('/').slice(0, -3).join('/')).join('.'));
    });
};

controller.checkCustomJavaScriptFileExistence = function () {
    console.log('Checking custom JavaScript file existence, please, wait...');
    return FS.exists(__dirname + '/../public/js/custom.js').then(function (exists) {
        if (exists) {
            return Promise.resolve();
        }
        console.log('Custom JavaScript file does not exist, creating a dummy one, please, wait...');
        return Cache.writeFile("js/custom.js", '');
    });
};

controller.checkCustomCSSFilesExistence = function () {
    console.log('Checking custom CSS files existence, please, wait...');
    return Tools.series(['combined', 'desktop', 'mobile'], function (type) {
        return FS.exists(__dirname + '/../public/css/custom-base-' + type + '.css').then(function (exists) {
            return {
                type: type,
                exists: exists
            };
        });
    }, true).then(function (list) {
        var types = list.filter(function (item) {
            return !item.exists;
        }).map(function (item) {
            return item.type;
        });
        if (types.length < 1) {
            return Promise.resolve();
        }
        console.log('Some of custom CSS files do not exist, creating dummy ones, please, wait...');
        return Tools.series(types, function (type) {
            return Cache.writeFile('css/custom-base-' + type + '.css', '');
        });
    });
};

/*controller.generateStatistics = function() {
  console.log("Generating statistics, please, wait...");
    var o = {
        boards: [],
        total: {
            postCount: 0,
            fileCount: 0,
            diskUsage: 0
        }
    };
    var ld = Tools.now().valueOf();
    var brd;
    return Database.db.keys("userPostNumbers:*").then(function(keys) {
        var uniqueUsers = Board.boardNames().reduce(function(acc, boardName) {
            acc[boardName] = 0;
            return acc;
        }, {});
        var users = {};
        keys.forEach(function(key) {
            var boardName = key.split(":").pop();
            if (!uniqueUsers.hasOwnProperty(boardName))
                return;
            users[key.split(":").slice(1, -1).join(":")] = {};
            ++uniqueUsers[boardName];
        });
        o.total.uniqueIPCount = Object.keys(users).length;
        return Tools.series(Board.boardNames(), function(boardName) {
            var board = Board.board(boardName);
            var bld = board.launchDate.valueOf();
            if (!brd || bld < ld) {
                brd = board;
                ld = bld;
            }
            var bo = {
                name: board.name,
                title: board.title,
                hidden: board.hidden,
                diskUsage: 0,
                uniqueIPCount: uniqueUsers[board.name]
            };
            var path = __dirname + "/../public/" + board.name + "/";
            return Database.lastPostNumber(board.name).then(function(lastPostNumber) {
                o.total.postCount += lastPostNumber;
                bo.postCount = lastPostNumber;
                bo.postingSpeed = controller.postingSpeedString(board.launchDate, lastPostNumber);
                return FS.list(path + "src");
            }).then(function(list) {
                var fileCount = list ? list.length : 0;
                bo.fileCount = fileCount;
                o.total.fileCount += fileCount;
                return Tools.du(path + "src");
            }).catch(function(err) {
                if ("ENOENT" != err.code)
                    Global.error(err.stack || err);
                return Tools.du(path + "src");
            }).then(function(size) {
                bo.diskUsage += size;
                o.total.diskUsage += size;
                return Tools.du(path + "thumb");
            }).catch(function(err) {
                if ("ENOENT" != err.code)
                    Global.error(err.stack || err);
                return Tools.du(path + "thumb");
            }).then(function(size) {
                bo.diskUsage += size;
                o.total.diskUsage += size;
                return Tools.du(path + "arch");
            }).catch(function(err) {
                if ("ENOENT" != err.code)
                    Global.error(err.stack || err);
                return Tools.du(path + "arch");
            }).then(function(size) {
                bo.diskUsage += size;
                o.total.diskUsage += size;
                return Promise.resolve();
            }).catch(function(err) {
                if ("ENOENT" != err.code)
                    Global.error(err.stack || err);
                return Promise.resolve();
            }).then(function() {
                o.boards.push(bo);
                return Promise.resolve();
            });
        });
    }).then(function() {
        //o.total.postingSpeed = controller.postingSpeedString(brd, o.total.postCount);
        return Global.IPC.send("getConnectionIPs");
    }).then(function(data) {
        o.online = data.reduce(function(acc, ips) {
            Tools.forIn(ips, function(_, ip) {
                acc.add(ip);
            });
            return acc;
        }, new Set()).size;
        o.uptime = process.uptime();
    }).catch(function(err) {
        Global.error(err.stack || err);
        return Promise.resolve();
    }).then(function() {
        return Cache.writeFile("misc/statistics.json", JSON.stringify(o));
    });
};*/

var BoardModel = require("../models/board");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var markup = require("./markup");

module.exports = controller;
//# sourceMappingURL=controller.js.map
