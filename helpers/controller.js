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

var partials = {};
var templates = {};
var publicPartials;
var publicTemplates;
var langNames = require("../misc/lang-names.json");
var ipBans = {};

var controller;

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/cache-html");

controller = function(templateName, modelData) {
    var baseModelData = merge.recursive(controller.baseModel(), controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    baseModelData.publicPartials = publicPartials;
    baseModelData.publicTemplates = publicTemplates;
    baseModelData.models = {
        base: JSON.stringify(controller.baseModel()),
        boards: JSON.stringify(controller.boardsModel()),
        tr: JSON.stringify(controller.translationsModel()),
        partials: JSON.stringify(publicPartials.map(function(partial) {
            return partial.name;
        })),
        templates: JSON.stringify(publicTemplates.map(function(partial) {
            return partial.name;
        }))
    };
    var timeOffset = config("site.timeOffset", 0);
    var locale = config("site.locale", "en");
    var format = config("site.dateFormat", "MM/DD/YYYY HH:mm:ss");
    baseModelData.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format(format);
    };
    baseModelData.script = function(name, noEmbed) {
        if (!noEmbed && config("system.embedScripts", true)) {
            try {
                var data = FSSync.readFileSync(__dirname + "/../public/js/" + name, "utf8");
                return `<script type="text/javascript">${data}</script>`;
            } catch (err) {
                console.error(err);
                return "";
            }
        } else {
            return `<script type="text/javascript" src="/${baseModelData.site.pathPrefix}js/${name}"></script>`;
        }
    };
    baseModelData.stylesheet = function(name, noEmbed) {
        if (!noEmbed && config("system.embedStylesheets", true)) {
            try {
                var data = FSSync.readFileSync(__dirname + "/../public/css/" + name, "utf8");
                return `<style type="text/css">${data}</style>`;
            } catch (err) {
                console.error(err);
                return "";
            }
        } else {
            return `<link rel="stylesheet" type="text/css" href="/${baseModelData.site.pathPrefix}css/${name}">`;
        }
    };
    if (!modelData)
        modelData = {};
    var template = templates[templateName];
    if (!template)
        return Promise.reject(Tools.translate("Invalid template"));
    modelData = merge.recursive(baseModelData, modelData);
    var extraScripts = config(`site.extraScripts.${templateName}`);
    if (extraScripts) {
        if (!modelData.extraScripts)
            modelData.extraScripts = [];
        modelData.extraScripts = modelData.extraScripts.concat(extraScripts);
    }
    return Promise.resolve(template(modelData));
};

controller.publicPartialNames = function() {
    return publicPartials.map(function(partial) {
        return partial.name;
    });
};

controller.sync = function(templateName, modelData) {
    var baseModelData = merge.recursive(controller.baseModel(), controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    if (!modelData)
        modelData = {};
    var template = templates[templateName];
    if (!template)
        return null;
    modelData = merge.recursive(baseModelData, modelData);
    return template(modelData);
};

controller.error = function(req, res, error, ajax) {
    if (!ajax && Util.isNumber(error) && 404 == error)
        return controller.notFound(req, res);
    if (error)
        Global.error(Tools.preferIPv4(req.ip), req.path, error.stack || error);
    var f = function(error) {
        var model = {};
        model.title = Tools.translate("Error", "pageTitle");
        if (Util.isError(error)) {
            model.errorMessage = Tools.translate("Internal error", "errorMessage");
            model.errorDescription = error.message;
        } else if (Util.isObject(error) && (error.error || error.ban)) {
            if (error.ban) {
                model.ban = error.ban;
            } else {
                model.errorMessage = error.description ? error.error : Tools.translate("Error", "errorMessage");
                model.errorDescription = error.description || error.error;
            }
        } else {
            model.errorMessage = Tools.translate("Error", "errorMessage");
            model.errorDescription = (error && Util.isString(error)) ? error
                : ((404 == error) ? Tools.translate("404 (not found)", "errorMessage") : "");
        }
        return model;
    };
    var g = function(error) {
        try {
            res.send(f(error));
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.resolve();
    };
    var h = function(error) {
        try {
            res.send(error);
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.resolve();
    };
    if (Util.isObject(error) && error.ban) {
        var model = {};
        model.title = Tools.translate("Ban", "pageTitle");
        model.ban = error.ban;
        if (ajax)
            return h(error);
        return controller("ban", model).then(function(data) {
            res.send(data);
        }).catch(h);
    } else {
        return ajax ? g(error) : controller("error", f(error)).then(function(data) {
            res.send(data);
        }).catch(g);
    }
};

controller.notFound = function(req, res) {
    Cache.getHTML("notFound").then(function(data) {
        res.status(404).send(data.data);
        Global.error(Tools.preferIPv4(req.ip), req.baseUrl, 404);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
};

controller.checkBan = function(req, res, boardNames, write) {
    var ip = Tools.correctAddress(req.ip);
    var ban = ipBans[ip];
    if (ban && (write || "NO_ACCESS" == ban.level))
        return Promise.reject({ ban: ban });
    return Database.userBans(ip, boardNames).then(function(bans) {
        if (!bans)
            return Promise.resolve();
        if (!Util.isArray(boardNames))
            boardNames = [boardNames];
        for (var i = 0; i < boardNames.length; ++i) {
            var ban = bans[boardNames[i]];
            if (ban) {
                if (write)
                    return Promise.reject({ ban: ban });
                return ("NO_ACCESS" == ban.level) ? Promise.reject({ ban: ban }) : Promise.resolve();
            }
        }
        return Promise.resolve();
    });
};

controller.baseModel = function() {
    return {
        server: {
            uptime: process.uptime()
        },
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
            }
        },
        styles: Tools.styles(),
        codeStyles: Tools.codeStyles(),
        availableCodeLangs: Highlight.listLanguages().map(function(lang) {
            return {
                id: lang,
                name: (langNames.hasOwnProperty(lang) ? langNames[lang] : lang)
            };
        }),
        maxSearchQueryLength: config("site.maxSearchQueryLength", 50),
        markupModes: [
            {
                name: "NONE",
                title: Tools.translate("No markup", "markupMode")
            }, {
                name: markup.MarkupModes.ExtendedWakabaMark,
                title: Tools.translate("Extended WakabaMark only", "markupMode")
            }, {
                name: markup.MarkupModes.BBCode,
                title: Tools.translate("bbCode only", "markupMode")
            }, {
                name: (markup.MarkupModes.ExtendedWakabaMark + "," + markup.MarkupModes.BBCode),
                title: Tools.translate("Extended WakabaMark and bbCode", "markupMode")
            },
        ],
        supportedCaptchaEngines: Captcha.captchaIds().map(function(id) {
            return Captcha.captcha(id).info();
        })
    };
};

controller.boardsModel = function() {
    var boards = Board.boardNames().map(function(boardName) {
        return Board.board(boardName).info();
    });
    return { boards: boards };
};

controller.boardModel = function(board) {
    if (Util.isString(board))
        board = Board.board(board);
    return board ? { board: board.info() } : null;
};

controller.translationsModel = function() {
    var tr = require("./translations")();
    var translate = function(sourceText, disambiguation) {
        tr[disambiguation] = Tools.translate(sourceText, disambiguation);
    };
    Board.boardNames().forEach(function(boardName) {
        Board.board(boardName).addTranslations(translate);
    });
    return { tr: tr };
};

controller.initialize = function() {
    partials = {};
    templates = {};
    var path1 = __dirname + "/../views/partials";
    var path2 = __dirname + "/../public/templates/partials";
    var c = {};
    return FS.list(path1).then(function(fileNames) {
        c.fileNames = fileNames.map(function(fileName) {
            return path1 + "/" + fileName;
        });
        return FS.list(path2);
    }).then(function(fileNames) {
        publicPartials = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicPartials.indexOf(name);
                if (ind >= 0) {
                    publicPartials[ind] = {
                        name: name,
                        data: data
                    };
                }
                partials[name] = data;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        path1 = __dirname + "/../views";
        path2 = __dirname + "/../public/templates";
        return FS.list(path1).then(function(fileNames) {
            c.fileNames = fileNames.map(function(fileName) {
                return path1 + "/" + fileName;
            });
            return FS.list(path2);
        });
    }).then(function(fileNames) {
        publicTemplates = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst" && fileName.split("-").shift() != "custom";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        return Tools.series(c.fileNames, function(fileName) {
            return FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicTemplates.indexOf(name);
                if (ind >= 0) {
                    publicTemplates[ind] = {
                        name: name,
                        data: data
                    };
                }
                templates[name] = dot.template(data, {
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
                }, partials);
                return Promise.resolve();
            });
        });
    });
};

controller.postingSpeedString = function(board, lastPostNumber) {
    var msecs = board.launchDate.valueOf();
    if (isNaN(msecs))
        return "-";
    var zeroSpeedString = function(nonZero) {
        if (lastPostNumber && msecs)
            return "1 " + nonZero;
        else
            return "0 " + Tools.translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return (ss.split(".").pop() != "0") ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = (new Date()).valueOf() - msecs;
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
            duptime /= (365.0 / 12.0);
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
                if (!uptime)
                    return zeroSpeedString(syear);
                else if (Math.floor(lastPostNumber / uptime) > 0)
                    return speedString(duptime) + " " + syear;
                else
                    return "0 " + syear;
            }
        }
    }
};

var sendCachedContent = function(req, res, id, type, ajax) {
    var ifModifiedSince = new Date(req.headers["if-modified-since"]);
    return Cache[`get${type}`](id, ifModifiedSince).then(function(result) {
        res.setHeader("Last-Modified", result.lastModified.toUTCString());
        if (+ifModifiedSince >= +result.lastModified)
            res.status(304);
        res.send(result.data);
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(req, res);
        else
            controller.error(res, err, ajax);
    });
};

controller.sendCachedHTML = function(req, res, id) {
    return sendCachedContent(req, res, id, Cache.Types.HTML);
};

controller.sendCachedJSON = function(req, res, id) {
    return sendCachedContent(req, res, id, Cache.Types.JSON);
};

controller.sendCachedRSS = function(req, res, id) {
    return sendCachedContent(req, res, id, Cache.Types.RSS);
};

controller.regenerate = function() {
    return Cache.cleanup().then(function() {
        return Tools.series(["JSON", "HTML"], function(type) {
            console.log(`Generating ${type} cache, please, wait...`);
            return Tools.series(require("../controllers").routers, function(router) {
                var f = router[`generate${type}`];
                if (typeof f != "function")
                    return Promise.resolve();
                return f.call(router).then(function(result) {
                    return Tools.series(result, function(data, id) {
                        return Cache[`set${type}`](id, data);
                    });
                });
            });
        });
    }).then(function() {
        if (!config("server.rss.enabled", true))
            return Promise.resolve();
        console.log("Generating statistics, please, wait...");
        return controller.generateStatistics().catch(function(err) {
            Global.error(err.stack || err);
        }).then(function() {
            console.log("Generating RSS, please, wait...");
            return BoardModel.generateRSS();
        }).catch(function(err) {
            Global.error(err.stack || err);
        }).then(function() {
            return Promise.resolve();
        });
    });
};

controller.generateStatistics = function() {
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
            diskUsage: 0
        };
        var path = __dirname + "/../public/" + board.name + "/";
        return Database.lastPostNumber(board.name).then(function(lastPostNumber) {
            o.total.postCount += lastPostNumber;
            bo.postCount = lastPostNumber;
            bo.postingSpeed = controller.postingSpeedString(board, lastPostNumber);
            return FS.list(path + "src");
        }).then(function(list) {
            var fileCount = list ? list.length : 0;
            bo.fileCount = fileCount;
            o.total.fileCount += fileCount;
            return Tools.du(path + "src");
        }).catch(function(err) {
            if ("ENOENT" != err.code)
                console.error(err.stack || err);
            return Tools.du(path + "src");
        }).then(function(size) {
            bo.diskUsage += size;
            o.total.diskUsage += size;
            return Tools.du(path + "thumb");
        }).catch(function(err) {
            if ("ENOENT" != err.code)
                console.error(err.stack || err);
            return Tools.du(path + "thumb");
        }).then(function(size) {
            bo.diskUsage += size;
            o.total.diskUsage += size;
            return Tools.du(path + "arch");
        }).catch(function(err) {
            if ("ENOENT" != err.code)
                console.error(err.stack || err);
            return Tools.du(path + "arch");
        }).then(function(size) {
            bo.diskUsage += size;
            o.total.diskUsage += size;
            return Promise.resolve();
        }).catch(function(err) {
            if ("ENOENT" != err.code)
                console.error(err.stack || err);
            return Promise.resolve();
        }).then(function() {
            o.boards.push(bo);
            return Promise.resolve();
        });
    }).then(function() {
        o.total.postingSpeed = controller.postingSpeedString(brd, o.total.postCount);
        Cache.setJSON(`statistics`, JSON.stringify(o));
        return Promise.resolve();
    });
};

module.exports = controller;

var Board = require("../boards/board");
var BoardModel = require("../models/board");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var markup = require("./markup");
var Tools = require("./tools");

var tmpBans = FSSync.existsSync(__dirname + "/../misc/bans.json") ? require("../misc/bans.json") : {};

Tools.forIn(tmpBans, function(ban, ip) {
    ip = Tools.correctAddress(ip);
    if (!ip)
        return;
    ipBans[ip] = ban;
});
