"use strict";

var _ipc = require("../helpers/ipc");

var IPC = _interopRequireWildcard(_ipc);

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var Address6 = require("ip-address").Address6;
var Crypto = require("crypto");
var ffmpeg = require("fluent-ffmpeg");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Util = require("util");
var UUID = require("uuid");

var Captcha = require("../captchas");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var ImageMagick = promisify("imagemagick");
var musicMetadata = promisify("musicmetadata");

var durationToString = function durationToString(duration) {
    duration = Math.floor(+duration);
    var hours = "" + Math.floor(duration / 3600);
    if (hours.length < 2) hours = "0" + hours;
    duration %= 3600;
    var minutes = "" + Math.floor(duration / 60);
    if (minutes.length < 2) minutes = "0" + minutes;
    var seconds = "" + duration % 60;
    if (seconds.length < 2) seconds = "0" + seconds;
    return hours + ":" + minutes + ":" + seconds;
};

var Board = function Board(name, title, options) {
    this.defineProperty("name", name);
    this.defineSetting("title", function () {
        return Tools.translate(title);
    });
    this.defineProperty("priority", function () {
        var def;
        if (options && !isNaN(+options.priority) && +options.priority) def = +options.priority;else def = 0;
        return config("board." + name + ".priority", config("board.priority", def));
    });
    this.defineProperty("defaultUserName", function () {
        var def;
        if (options && options.defaultUserName) def = Tools.translate(options.defaultUserName);else def = Tools.translate("Anonymous", "defaultUserName");
        return config("board." + name + ".defaultUserName", config("board.defaultUserName", def));
    });
    this.defineProperty("groupName", function () {
        var def;
        if (options && options.groupName) def = options.groupName;else def = "";
        return config("board." + name + ".groupName", config("board.groupName", def));
    });
    this.defineProperty("captchaEnabled", function () {
        return config("board.captchaEnabled", true) && config("board." + name + ".captchaEnabled", true);
    });
    this.defineProperty("bannerFileNames", function () {
        return Board._banners[name];
    });
    this.defineProperty("postFormRules", function () {
        return Board._postFormRules[name];
    });
    this.defineSetting("skippedGetOrder", 0);
    this.defineSetting("opModeration", false);
    this.defineSetting("captchaQuota", 0);
    this.defineSetting("enabled", true);
    this.defineSetting("hidden", false);
    this.defineSetting("maxEmailLength", 150);
    this.defineSetting("maxNameLength", 50);
    this.defineSetting("maxSubjectLength", 150);
    this.defineSetting("maxTextLength", 15000);
    this.defineSetting("maxPasswordLength", 50);
    this.defineSetting("maxFileCount", 1);
    this.defineSetting("maxFileSize", 10 * 1024 * 1024);
    this.defineSetting("maxLastPosts", 3);
    this.defineSetting("markupElements", [Board.MarkupElements.BoldMarkupElement, Board.MarkupElements.ItalicsMarkupElement, Board.MarkupElements.StrikedOutMarkupElement, Board.MarkupElements.UnderlinedMarkupElement, Board.MarkupElements.SpoilerMarkupElement, Board.MarkupElements.QuotationMarkupElement, Board.MarkupElements.UnorderedList, Board.MarkupElements.OrderedList, Board.MarkupElements.ListItem, Board.MarkupElements.SubscriptMarkupElement, Board.MarkupElements.SuperscriptMarkupElement, Board.MarkupElements.UrlMarkupElement]);
    this.defineSetting("postingEnabled", true);
    this.defineSetting("showWhois", false);
    this.defineSetting("supportedCaptchaEngines", Captcha.captchaIds());
    this.defineProperty("permissions", function () {
        var p = {};
        Tools.forIn(require("../helpers/permissions").Permissions, function (defLevel, key) {
            p[key] = config("board." + name + ".permissions." + key, config("permissions." + key, defLevel));
        });
        return p;
    });
    this.defineSetting("supportedFileTypes", ["application/ogg", "application/pdf", "audio/mpeg", "audio/ogg", "audio/wav", "image/gif", "image/jpeg", "image/png", "video/mp4", "video/ogg", "video/webm"]);
    this.defineSetting("bumpLimit", 500);
    this.defineSetting("postLimit", 1000);
    this.defineSetting("threadLimit", 200);
    this.defineSetting("archiveLimit", 0);
    this.defineSetting("threadsPerPage", 20);
    this.defineProperty("launchDate", function () {
        return new Date(config("board." + name + ".launchDate", config("board.launchDate", new Date())));
    });
};

Board.boards = {};

/*public*/Board.prototype.defineSetting = function (name, def) {
    var _this = this;
    Object.defineProperty(this, name, {
        get: function get() {
            return config("board." + _this.name + "." + name, config("board." + name, typeof def == "function" ? def() : def));
        },
        configurable: true
    });
};

/*public*/Board.prototype.defineProperty = function (name, value) {
    var _this = this;
    if (typeof value == "function") {
        Object.defineProperty(this, name, {
            get: value,
            configurable: true
        });
    } else {
        Object.defineProperty(this, name, {
            value: value,
            configurable: true
        });
    }
};

/*public*/Board.prototype.info = function () {
    var _this = this;
    var model = {
        name: this.name,
        title: this.title,
        defaultUserName: this.defaultUserName,
        groupName: this.groupName,
        showWhois: this.showWhois,
        hidden: this.hidden,
        postingEnabled: this.postingEnabled,
        captchaEnabled: this.captchaEnabled,
        maxEmailLength: this.maxEmailLength,
        maxNameLength: this.maxNameLength,
        maxSubjectLength: this.maxSubjectLength,
        maxTextLength: this.maxTextLength,
        maxPasswordLength: this.maxPasswordLength,
        maxFileCount: this.maxFileCount,
        maxFileSize: this.maxFileSize,
        maxLastPosts: this.maxLastPosts,
        markupElements: this.markupElements,
        supportedFileTypes: this.supportedFileTypes,
        supportedCaptchaEngines: this.supportedCaptchaEngines,
        bumpLimit: this.bumpLimit,
        postLimit: this.postLimit,
        bannerFileNames: this.bannerFileNames,
        postFormRules: this.postFormRules,
        launchDate: this.launchDate.toISOString(),
        permissions: this.permissions,
        opModeration: this.opModeration
    };
    this.customBoardInfoFields().forEach(function (field) {
        model[field] = _this[field];
    });
    return model;
};

/*public*/Board.prototype.customBoardInfoFields = function () {
    return [];
};

/*public*/Board.prototype.isCaptchaEngineSupported = function (engineName) {
    if (typeof engineName != "string") return;
    return Tools.contains(this.supportedCaptchaEngines, engineName);
};

/*public*/Board.prototype.isFileTypeSupported = function (fileType) {
    if (typeof fileType != "string") return;
    return Tools.contains(this.supportedFileTypes, fileType);
};

/*public*/Board.prototype.postExtraData = function (req, fields, files, oldPost) {
    return Promise.resolve(oldPost ? oldPost.extraData : null);
};

/*public*/Board.prototype.storeExtraData = function (postNumber, extraData) {
    if (Util.isNullOrUndefined(extraData)) return Promise.resolve();
    return Promise.resolve();
    //return Database.db.hset("postExtraData", this.name + ":" + postNumber, JSON.stringify(extraData));
};

/*public*/Board.prototype.loadExtraData = function (postNumber) {
    var _this = this;
    return Promise.resolve();
    /*return Database.db.hget("postExtraData", this.name + ":" + postNumber).then(function(extraData) {
        if (Util.isNullOrUndefined(extraData))
            return Promise.resolve(null);
        return JSON.parse(extraData);
    });*/
};

/*public*/Board.prototype.removeExtraData = function (postNumber) {
    return Promise.resolve();
    //return Database.db.hdel("postExtraData", this.name + ":" + postNumber);
};

/*public*/Board.prototype.apiRoutes = function () {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/Board.prototype.actionRoutes = function () {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/Board.prototype.extraScripts = function () {
    return [];
};

/*public*/Board.prototype.extraStylesheets = function () {
    return [];
};

/*public*/Board.prototype.testParameters = function (req, fields, files, creatingThread) {
    var _this2 = this;

    var email = fields.email || "";
    var name = fields.name || "";
    var subject = fields.subject || "";
    var text = fields.text || "";
    var password = fields.password || "";
    var fileCount = files.length;
    var maxFileSize = this.maxFileSize;
    var maxFileCount = this.maxFileCount;
    if (email.length > this.maxEmailLength) return Promise.reject(Tools.translate("E-mail is too long"));
    if (name.length > this.maxNameLength) return Promise.reject(Tools.translate("Name is too long"));
    if (subject.length > this.maxSubjectLength) return Promise.reject(Tools.translate("Subject is too long"));
    if (text.length > this.maxTextFieldLength) return Promise.reject(Tools.translate("Comment is too long"));
    if (password.length > this.maxPasswordLength) return Promise.reject(Tools.translate("Password is too long"));
    if (creatingThread && maxFileCount && !fileCount) return Promise.reject(Tools.translate("Attempt to create a thread without attaching a file"));
    if (text.length < 1 && !fileCount) return Promise.reject(Tools.translate("Both file and comment are missing"));
    if (fileCount > maxFileCount) {
        return Promise.reject(Tools.translate("Too many files"));
    } else {
        var err = files.reduce(function (err, file) {
            if (err) return err;
            if (file.size > maxFileSize) return Tools.translate("File is too big");
            if (_this2.supportedFileTypes.indexOf(file.mimeType) < 0) return Tools.translate("File type is not supported");
        }, "");
        if (err) return Promise.reject(err);
    }
};

var renderFileInfo = function renderFileInfo(fi) {
    fi.sizeKB = fi.size / 1024;
    fi.sizeText = fi.sizeKB.toFixed(2) + "KB";
    if (Tools.isImageType(fi.mimeType) || Tools.isVideoType(fi.mimeType)) {
        if (fi.dimensions) fi.sizeText += ", " + fi.dimensions.width + "x" + fi.dimensions.height;
    }
    if (Tools.isAudioType(fi.mimeType) || Tools.isVideoType(fi.mimeType)) {
        var ed = fi.extraData;
        if (ed.duration) fi.sizeText += ", " + ed.duration;
        if (Tools.isAudioType(fi.mimeType)) {
            if (ed.bitrate) fi.sizeText += ", " + ed.bitrate + Tools.translate("kbps", "kbps");
            fi.sizeTooltip = ed.artist ? ed.artist : Tools.translate("Unknown artist", "unknownArtist");
            fi.sizeTooltip += " - ";
            fi.sizeTooltip += ed.title ? ed.title : Tools.translate("Unknown title", "unknownTitle");
            fi.sizeTooltip += " [";
            fi.sizeTooltip += ed.album ? ed.album : Tools.translate("Unknown album", "unknownAlbum");
            fi.sizeTooltip += "]";
            if (ed.year) fi.sizeTooltip += " (" + ed.year + ")";
        } else if (Tools.isVideoType(fi.mimeType) && ed.bitrate) {
            fi.sizeTooltip = ed.bitrate + Tools.translate("kbps", "kbps");
        }
    }
};

/*public*/Board.prototype.renderPost = function (post) {
    (post.fileInfos || []).forEach(function (fileInfo) {
        renderFileInfo(fileInfo);
    });
    post.rawSubject = post.subject;
    post.isOp = post.number == post.threadNumber;
    if (post.options.showTripcode) post.tripcode = Tools.generateTripcode(post.user.hashpass);
    delete post.user.ip;
    delete post.user.hashpass;
    delete post.user.password;
    if (!post.geolocation.countryName) {
        post.geolocation.countryName = "Unknown country";
    }
    return Promise.resolve(post);
};

Board.MarkupElements = {
    BoldMarkupElement: "BOLD",
    ItalicsMarkupElement: "ITALICS",
    StrikedOutMarkupElement: "STRIKED_OUT",
    UnderlinedMarkupElement: "UNDERLINED",
    SpoilerMarkupElement: "SPOILER",
    QuotationMarkupElement: "QUOTATION",
    UnorderedList: "UNORDERED_LIST",
    OrderedList: "ORDERED_LIST",
    ListItem: "LIST_ITEM",
    SubscriptMarkupElement: "SUBSCRIPT",
    SuperscriptMarkupElement: "SUPERSCRIPT",
    UrlMarkupElement: "URL",
    CodeMarkupElement: "CODE",
    LatexMarkupElement: "LATEX",
    InlineLatexMarkupElement: "INLINE_LATEX"
};

Board.MimeTypesForExtensions = {};
Board.DefaultExtensions = {};

var defineMimeTypeExtensions = function defineMimeTypeExtensions(mimeType) {
    var extensions = Array.prototype.slice.call(arguments, 1);
    extensions.forEach(function (extension) {
        Board.MimeTypesForExtensions[extension] = mimeType;
    });
    Board.DefaultExtensions[mimeType] = extensions[0];
};

defineMimeTypeExtensions("application/ogg", "ogg");
defineMimeTypeExtensions("application/pdf", "pdf");
defineMimeTypeExtensions("audio/mpeg", "mpeg", "mp1", "m1a", "mp3", "m2a", "mpa", "mpg");
defineMimeTypeExtensions("audio/ogg", "ogg");
defineMimeTypeExtensions("audio/wav", "wav");
defineMimeTypeExtensions("image/gif", "gif");
defineMimeTypeExtensions("image/jpeg", "jpeg", "jpg");
defineMimeTypeExtensions("image/png", "png");
defineMimeTypeExtensions("video/mp4", "mp4");
defineMimeTypeExtensions("video/webm", "webm");

Board.ThumbExtensionsForMimeType = {
    "application/ogg": "png",
    "application/pdf": "png",
    "audio/mpeg": "png",
    "audio/ogg": "png",
    "audio/wav": "png",
    "video/mp4": "png",
    "video/webm": "png"
};

Board.board = function (name) {
    return Board.boards[name];
};

Board.addBoard = function (board) {
    if (!Board.prototype.isPrototypeOf(board)) return;
    Board.boards[board.name] = board;
};

Board.boardInfos = function (includeHidden) {
    includeHidden = includeHidden || typeof includeHidden == "undefined";
    var list = [];
    Tools.toArray(Board.boards).sort(function (b1, b2) {
        return b1.name < b2.name ? -1 : 1;
    }).forEach(function (board) {
        if (!board.enabled || !includeHidden && board.hidden) return;
        list.push({
            name: board.name,
            title: board.title
        });
    });
    return list;
};

Board.boardNames = function (includeHidden) {
    includeHidden = includeHidden || typeof includeHidden == "undefined";
    var list = [];
    Tools.toArray(Board.boards).sort(function (b1, b2) {
        return b1.name < b2.name ? -1 : 1;
    }).forEach(function (board) {
        if (!board.enabled || !includeHidden && board.hidden) return;
        list.push(board.name);
    });
    return list;
};

Board.sortThreadsByDate = function (a, b) {
    if (a.fixed == b.fixed) {
        if (a.updatedAt < b.updatedAt) return 1;else if (a.updatedAt > b.updatedAt) return -1;else return 0;
    } else if (a.fixed) {
        return -1;
    } else {
        return 1;
    }
};

Board.sortThreadsByCreationDate = function (a, b) {
    if (a.createdAt > b.createdAt) return -1;else if (a.createdAt < b.createdAt) return 1;else return 0;
};

Board.sortThreadsByPostCount = function (a, b) {
    if (a.postCount > b.postCount) return -1;else if (a.postCount < b.postCount) return 1;else return 0;
};

var getRules = function getRules(boardName) {
    var fileName = __dirname + "/../misc/rules/rules" + (boardName ? '.' + boardName : '') + ".txt";
    try {
        if (!FSSync.existsSync(fileName)) {
            return [];
        }
        var data = FSSync.readFileSync(fileName, "utf8");
        if (!data) {
            return [];
        }
        return data.split(/\r*\n+/gi).filter(function (rule) {
            return rule;
        });
    } catch (err) {
        console.error(err);
        return [];
    }
};

Board.initialize = function () {
    var reinit = Tools.hasOwnProperties(Board.boards);
    Board.boards = {};

    FSSync.readdirSync(__dirname).forEach(function (file) {
        if ("index.js" == file || "board.js" == file || "js" != file.split(".").pop()) return;
        var id = "./" + file.split(".").shift();
        if (reinit) delete require.cache[require.resolve(id)];
        var board = require(id);
        if (Util.isArray(board)) {
            board.forEach(function (board) {
                Board.addBoard(board);
            });
        } else {
            Board.addBoard(board);
        }
    });

    if (config("board.useDefaultBoards", true)) {
        Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

        Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"), { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

        Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

        Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

        Board.addBoard(new Board("d", Tools.translate.noop("Board /d/iscussion", "boardTitle")));
        Board.addBoard(new Board("echo", Tools.translate.noop("Boardsphere echo", "boardTitle")));

        Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

        Board.addBoard(new Board("int", "/int/ernational", { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

        Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

        Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"), { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

        var board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
        board.defineSetting("markupElements", board.markupElements.concat(Board.MarkupElements.CodeMarkupElement, Board.MarkupElements.LatexMarkupElement, Board.MarkupElements.InlineLatexMarkupElement));
        Board.addBoard(board);

        Board.addBoard(new Board("rf", Tools.translate.noop("Refuge", "boardTitle"), { defaultUserName: Tools.translate.noop("Whiner", "defaultUserName") }));

        Board.addBoard(new Board("rpg", Tools.translate.noop("Role-playing games", "boardTitle")));
        Board.addBoard(new Board("soc", Tools.translate.noop("Social life", "boardTitle"), { defaultUserName: Tools.translate.noop("Life of the party", "defaultUserName") }));

        Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"), { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));
    }

    Board._banners = {};
    Board.boardNames().forEach(function (boardName) {
        var path = __dirname + "/../public/img/banners/" + boardName;
        if (FSSync.existsSync(path)) {
            Board._banners[boardName] = FSSync.readdirSync(path).filter(function (fileName) {
                return ".gitignore" != fileName;
            });
        } else {
            Board._banners[boardName] = [];
        }
    });

    Board._postFormRules = {};
    Board.boardNames().forEach(function (boardName) {
        var common = getRules();
        var specific = getRules(boardName);
        for (var i = specific.length - 1; i >= 0; --i) {
            var rule = specific[i];
            var rxExcept = /^#include\s+except(\((\d+(\,\d+)*)\))$/;
            var rxSeveral = /^#include\s+(\d+(\,\d+)*)$/;
            if ('#include all' === rule) {
                Array.prototype.splice.apply(specific, [i, 1].concat(common));
            } else if (rxExcept.test(rule)) {
                var excluded = rule.match(rxExcept)[2].split(",").map(function (n) {
                    return +n;
                });
                Array.prototype.splice.apply(specific, [i, 1].concat(common.filter(function (_, i) {
                    return excluded.indexOf(i) < 0;
                })));
            } else if (rxSeveral.test(rule)) {
                var included = rule.match(rxSeveral)[1].split(",").map(function (n) {
                    return +n;
                }).filter(function (n) {
                    return n >= 0 && n < common.length;
                }).map(function (n) {
                    return common[n];
                });
                Array.prototype.splice.apply(specific, [i, 1].concat(included));
            }
        };
        Board._postFormRules[boardName] = specific.length > 0 ? specific : common;
    });
};

module.exports = Board;

//var Database = require("../helpers/database");
//# sourceMappingURL=board.js.map
