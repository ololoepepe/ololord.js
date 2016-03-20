var Address6 = require("ip-address").Address6;
var Canvas = require("canvas");
var Crypto = require("crypto");
var ffmpeg = require("fluent-ffmpeg");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Image = Canvas.Image;
var Jdenticon = require("jdenticon");
var Path = require("path");
var promisify = require("promisify-node");
var Util = require("util");
var UUID = require("uuid");

var Captcha = require("../captchas");
var config = require("../helpers/config");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var ImageMagick = promisify("imagemagick");
var musicMetadata = promisify("musicmetadata");

var generateRandomImage = function(hash, mimeType, thumbPath) {
    var canvas = new Canvas(200, 200);
    var ctx = canvas.getContext("2d");
    Jdenticon.drawIcon(ctx, hash, 200);
    return FS.read(__dirname + "/../public/img/" + mimeType.replace("/", "_") + "_logo.png", "b").then(function(data) {
        var img = new Image;
        img.src = data;
        ctx.drawImage(img, 0, 0, 200, 200);
        return new Promise(function(resolve, reject) {
            canvas.pngStream().pipe(FSSync.createWriteStream(thumbPath).on("error", reject).on("finish", resolve));
        });
    });
};

var durationToString = function(duration) {
    duration = Math.floor(+duration);
    var hours = "" + Math.floor(duration / 3600);
    if (hours.length < 2)
        hours = "0" + hours;
    duration %= 3600;
    var minutes = "" + Math.floor(duration / 60);
    if (minutes.length < 2)
        minutes = "0" + minutes;
    var seconds = "" + (duration % 60);
    if (seconds.length < 2)
        seconds = "0" + seconds;
    return hours + ":" + minutes + ":" + seconds;
};

var Board = function(name, title, options) {
    this.defineProperty("name", name);
    this.defineSetting("title", function() {
        return Tools.translate(title);
    });
    this.defineProperty("defaultUserName", function() {
        var def;
        if (options && options.defaultUserName)
            def = Tools.translate(options && options.defaultUserName);
        else
            def = Tools.translate("Anonymous", "defaultUserName");
        return config("board." + name + ".defaultUserName", config("board.defaultUserName", def));
    });
    this.defineProperty("captchaEnabled", function() {
        return config("board.captchaEnabled", true) && config("board." + name + ".captchaEnabled", true);
    });
    this.defineProperty("bannerFileNames", function() {
        return Board._banners[name];
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
    this.defineSetting("markupElements", [
        Board.MarkupElements.BoldMarkupElement,
        Board.MarkupElements.ItalicsMarkupElement,
        Board.MarkupElements.StrikedOutMarkupElement,
        Board.MarkupElements.UnderlinedMarkupElement,
        Board.MarkupElements.SpoilerMarkupElement,
        Board.MarkupElements.QuotationMarkupElement,
        Board.MarkupElements.UnorderedList,
        Board.MarkupElements.OrderedList,
        Board.MarkupElements.ListItem,
        Board.MarkupElements.SubscriptMarkupElement,
        Board.MarkupElements.SuperscriptMarkupElement,
        Board.MarkupElements.UrlMarkupElement
    ]);
    this.defineSetting("postingEnabled", true);
    this.defineSetting("showWhois", false);
    this.defineProperty("supportedCaptchaEngines", function() {
        var ids = config("board." + name + ".supportedCaptchaEngines",
            config("board.supportedCaptchaEngines", Captcha.captchaIds()));
        if (!Util.isArray(ids))
            ids = [];
        return ids.map(function(id) {
            return Captcha.captcha(id).info();
        });
    });
    this.defineProperty("permissions", function() {
        var p = {};
        Tools.forIn(require("../helpers/permissions").Permissions, function(defLevel, key) {
            p[key] = config("board." + name + ".permissions." + key, config("permissions." + key, defLevel));
        });
        return p;
    });
    this.defineSetting("supportedFileTypes", [
        "application/ogg",
        "application/pdf",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "image/gif",
        "image/jpeg",
        "image/png",
        "video/mp4",
        "video/ogg",
        "video/webm"
    ]);
    this.defineSetting("bumpLimit", 500);
    this.defineSetting("postLimit", 1000);
    this.defineSetting("threadLimit", 200);
    this.defineSetting("archiveLimit", 0);
    this.defineSetting("threadsPerPage", 20);
    this.defineProperty("launchDate", function() {
        return new Date(config("board." + name + ".launchDate", config("board.launchDate", new Date())));
    });
};

Board.boards = {};

/*public*/ Board.prototype.defineSetting = function(name, def) {
    var _this = this;
    Object.defineProperty(this, name, {
        get: function() {
            return config("board." + _this.name + "." + name,
                config("board." + name, (typeof def == "function") ? def() : def));
        },
        configurable: true
    });
};

/*public*/ Board.prototype.defineProperty = function(name, value) {
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

/*public*/ Board.prototype.info = function() {
    var model = {
        name: this.name,
        title: this.title,
        defaultUserName: this.defaultUserName,
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
        launchDate: this.launchDate.toISOString(),
        permissions: this.permissions,
        opModeration: this.opModeration
    };
    this.customBoardInfoFields().forEach(function(field) {
        model[field] = board[field];
    });
    return model;
};

/*public*/ Board.prototype.customBoardInfoFields = function() {
    return [];
};

/*public*/ Board.prototype.isCaptchaEngineSupported = function(engineName) {
    if (typeof engineName != "string")
        return;
    return Tools.contains(this.supportedCaptchaEngines, engineName);
};

/*public*/ Board.prototype.isFileTypeSupported = function(fileType) {
    if (typeof fileType != "string")
        return;
    return Tools.contains(this.supportedFileTypes, fileType);
};

/*public*/ Board.prototype.postExtraData = function(req, fields, files, oldPost) {
    return Promise.resolve(oldPost ? oldPost.extraData : null);
};

/*public*/ Board.prototype.storeExtraData = function(postNumber, extraData) {
    if (Util.isNullOrUndefined(extraData))
        return Promise.resolve();
    return Database.db.hset("postExtraData", this.name + ":" + postNumber, JSON.stringify(extraData));
};

/*public*/ Board.prototype.loadExtraData = function(postNumber) {
    var _this = this;
    return Database.db.hget("postExtraData", this.name + ":" + postNumber).then(function(extraData) {
        if (Util.isNullOrUndefined(extraData))
            return Promise.resolve(null);
        return JSON.parse(extraData);
    });
};

/*public*/ Board.prototype.removeExtraData = function(postNumber) {
    return Database.db.hdel("postExtraData", this.name + ":" + postNumber);
};

/*public*/ Board.prototype.apiRoutes = function() {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/ Board.prototype.actionRoutes = function() {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/ Board.prototype.extraScripts = function() {
    return [];
};

/*public*/ Board.prototype.extraStylesheets = function() {
    return [];
};

/*public*/ Board.prototype.testParameters = function(req, fields, files, creatingThread) {
    return Promise.resolve();
};

/*public*/ Board.prototype.addTranslations = function(translate) {
    //
};

/*public*/ Board.prototype.customPostHeaderPart = function() {
    //
};

/*public*/ Board.prototype.customPostBodyPart = function() {
    //
};

var renderFileInfo = function(fi) {
    fi.sizeKB = fi.size / 1024;
    fi.sizeText = fi.sizeKB.toFixed(2) + "KB";
    if (Tools.isImageType(fi.mimeType) || Tools.isVideoType(fi.mimeType)) {
        if (fi.dimensions)
            fi.sizeText += ", " + fi.dimensions.width + "x" + fi.dimensions.height;
    }
    if (Tools.isAudioType(fi.mimeType) || Tools.isVideoType(fi.mimeType)) {
        var ed = fi.extraData;
        if (ed.duration)
            fi.sizeText += ", " + ed.duration;
        if (Tools.isAudioType(fi.mimeType)) {
            if (ed.bitrate)
                fi.sizeText += ", " + ed.bitrate + Tools.translate("kbps", "kbps");
            fi.sizeTooltip = ed.artist ? ed.artist : Tools.translate("Unknown artist", "unknownArtist");
            fi.sizeTooltip += " - ";
            fi.sizeTooltip += ed.title ? ed.title : Tools.translate("Unknown title", "unknownTitle");
            fi.sizeTooltip += " [";
            fi.sizeTooltip += ed.album ? ed.album : Tools.translate("Unknown album", "unknownAlbum");
            fi.sizeTooltip += "]";
            if (ed.year)
                fi.sizeTooltip += " (" + ed.year + ")";
        } else if (Tools.isVideoType(fi.mimeType)) {
            fi.sizeTooltip = ed.bitrate + Tools.translate("kbps", "kbps");
        }
    }
};

/*public*/ Board.prototype.renderPost = function(post, req, opPost) {
    post.fileInfos.forEach(function(fileInfo) {
        renderFileInfo(fileInfo);
    });
    post.rawSubject = post.subject;
    post.isOp = (post.number == post.threadNumber);
    post.opIp = (opPost && post.user.ip == opPost.user.ip);
    if (post.options.showTripcode)
        post.tripcode = Tools.generateTripcode(post.user.hashpass);
    delete post.user.ip;
    delete post.user.hashpass;
    delete post.user.password;
    if (!this.showWhois) {
        if (post.geolocation)
            delete post.geolocation;
        return Promise.resolve(post);
    }
    return Tools.flagName(post.geolocation.countryCode).then(function(flagName) {
        post.geolocation.flagName = flagName || "default.png";
        if (!post.geolocation.countryName)
            post.geolocation.countryName = "Unknown country";
        return Promise.resolve(post);
    });
};

var getRules = function(boardName) {
    var fileName = __dirname + "/../misc/rules/rules" + (boardName ? ("." + boardName) : "") + ".txt";
    return FS.exists(fileName).then(function(exists) {
        if (!exists)
            return Promise.resolve();
        return FS.read(fileName);
    }).then(function(data) {
        if (!data)
            return [];
        return data.split(/\r*\n+/gi).filter(function(rule) {
            return rule;
        });
    });
};

/*public*/ Board.prototype.postformRules = function() {
    if (this._postformRules)
        return Promise.resolve(this._postformRules);
    var c = {};
    var _this = this;
    return getRules().then(function(rules) {
        c.common = rules;
        return getRules(_this.name);
    }).then(function(rules) {
        c.specific = rules;
        for (var i = c.specific.length - 1; i >= 0; --i) {
            var rule = c.specific[i];
            var rxExcept = /^#include\s+except(\((\d+(\,\d+)*)\))$/;
            var rxSeveral = /^#include\s+(\d+(\,\d+)*)$/;
            if ("#include all" == rule) {
                Array.prototype.splice.apply(c.specific, [i, 1].concat(c.common));
            } else if (rxExcept.test(rule)) {
                var excluded = rule.match(rxExcept)[2].split(",").map(function(n) {
                    return +n;
                });
                Array.prototype.splice.apply(c.specific, [i, 1].concat(c.common.filter(function(_, i) {
                    return excluded.indexOf(i) < 0;
                })));
            } else if (rxSeveral.test(rule)) {
                var included = rule.match(rxSeveral)[1].split(",").map(function(n) {
                    return +n;
                }).filter(function(n) {
                    return n >= 0 && n < c.common.length;
                }).map(function(n) {
                    return c.common[n];
                });
                Array.prototype.splice.apply(c.specific, [i, 1].concat(included));
            }
        };
        _this._postformRules = (c.specific.length > 0) ? c.specific : c.common;
        return Promise.resolve(_this._postformRules);
    });
};

/*public*/ Board.prototype.generateFileName = function(file) {
    return Global.IPC.send("fileName").then(function(base) {
        var ext = Path.extname(file.name);
        if (Util.isString(ext))
            ext = ext.substr(1);
        if (!ext || Board.MimeTypesForExtensions[ext.toLowerCase()] != file.mimeType)
            ext = Board.DefaultExtensions[file.mimeType];
        return Promise.resolve({
            name: (base + "." + ext),
            thumbName: (base + "s." + (Board.ThumbExtensionsForMimeType[file.mimeType] || ext))
        });
    });
};

/*public*/ Board.prototype.processFile = function(file) {
    var p;
    if (!file.hash) {
        p = FS.read(file.path, "b").then(function(data) {
            file.hash = Tools.sha1(data);
            return Promise.resolve();
        });
    } else {
        p = Promise.resolve();
    }
    var thumbPath = Path.dirname(file.path) + "/" + UUID.v1();
    file.thumbPath = thumbPath;
    return p.then(function() {
        if (Tools.isAudioType(file.mimeType)) {
            file.dimensions = null;
            file.extraData = {};
            return new Promise(function(resolve, reject) {
                ffmpeg.ffprobe(file.path, function(err, metadata) {
                    if (err)
                        return reject(err);
                    resolve(metadata);
                });
            }).then(function(metadata) {
                file.extraData.duration = durationToString(metadata.format.duration);
                file.extraData.bitrate = Math.floor(+metadata.format.bit_rate / 1024);
                return musicMetadata(FSSync.createReadStream(file.path));
            }).then(function(metadata) {
                file.extraData.album = metadata.album || "";
                file.extraData.artist = (metadata.artist && metadata.artist.length > 0) ? metadata.artist[0] : "";
                file.extraData.title = metadata.title || "";
                file.extraData.year = metadata.year || "";
                return Promise.resolve(metadata);
            }).catch(function(err) {
                Global.error(err.stack || err);
                file.extraData.album = "";
                file.extraData.artist = "";
                file.extraData.title = "";
                file.extraData.year = "";
                return Promise.resolve();
            }).then(function(metadata) {
                if (metadata && metadata.picture && metadata.picture.length > 0)
                    return FS.write(thumbPath, metadata.picture[0].data);
                else
                    return generateRandomImage(file.hash, file.mimeType, thumbPath);
            }).then(function() {
                return ImageMagick.identify(thumbPath);
            }).then(function(info) {
                if (info.width <= 200 && info.height <= 200)
                    return Promise.resolve();
                return ImageMagick.convert([
                    thumbPath,
                    "-resize",
                    "200x200",
                    thumbPath
                ]);
            }).then(function() {
                return ImageMagick.identify(file.thumbPath);
            }).then(function(info) {
                file.thumbDimensions = {
                    width: info.width,
                    height: info.height
                };
            });
        } else if (Tools.isVideoType(file.mimeType)) {
            file.extraData = {};
            return new Promise(function(resolve, reject) {
                ffmpeg.ffprobe(file.path, function(err, metadata) {
                    if (err)
                        return reject(err);
                    resolve(metadata);
                });
            }).then(function(metadata) {
                if (!isNaN(+metadata.streams[0].width) && !isNaN(+metadata.streams[0].height)) {
                    file.dimensions = {
                        width: metadata.streams[0].width,
                        height: metadata.streams[0].height
                    };
                }
                file.extraData.duration = durationToString(metadata.format.duration);
                file.extraData.bitrate = Math.floor(+metadata.format.bit_rate / 1024);
                file.thumbPath += ".png";
                return new Promise(function(resolve, reject) {
                    ffmpeg(file.path).frames(1).on("error", reject).on("end", resolve).save(file.thumbPath);
                });
            }).catch(function(err) {
                Global.error(err.stack || err);
                file.thumbPath = thumbPath;
                return generateRandomImage(file.hash, file.mimeType, thumbPath);
            }).then(function() {
                return ImageMagick.identify(file.thumbPath);
            }).then(function(info) {
                if (info.width <= 200 && info.height <= 200)
                    return Promise.resolve();
                return ImageMagick.convert([
                    file.thumbPath,
                    "-resize",
                    "200x200",
                    file.thumbPath
                ]);
            }).then(function() {
                return ImageMagick.identify(file.thumbPath);
            }).then(function(info) {
                file.thumbDimensions = {
                    width: info.width,
                    height: info.height
                };
            });
        } else if (Tools.isImageType(file.mimeType)) {
            file.extraData = null;
            var suffix = ("image/gif" == file.mimeType) ? "[0]" : "";
            return ImageMagick.identify(file.path + suffix).then(function(info) {
                file.dimensions = {
                    width: info.width,
                    height: info.height
                };
                var args = [ file.path + suffix ];
                if (info.width > 200 || info.height > 200) {
                    args.push("-resize");
                    args.push("200x200");
                }
                args.push((("image/gif" == file.mimeType) ? "png:" : "") + thumbPath);
                return ImageMagick.convert(args);
            }).then(function() {
                return ImageMagick.identify(thumbPath);
            }).then(function(info) {
                file.thumbDimensions = {
                    width: info.width,
                    height: info.height
                };
            });
        } else if (Tools.isPdfType(file.mimeType)) {
            file.dimensions = null;
            file.extraData = null;
            return ImageMagick.convert([
                "-density",
                "300",
                file.path + "[0]",
                "-quality",
                "100",
                "+adjoin",
                "-resize",
                "200x200",
                "png:" + thumbPath
            ]).then(function() {
                return ImageMagick.identify(thumbPath);
            }).then(function(info) {
                file.thumbDimensions = {
                    width: info.width,
                    height: info.height
                };
            });
        } else {
            return Promise.reject(Tools.translate("Unsupported file type"));
        }
    });
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
    CodeMarkupElement: "CODE"
};

Board.MimeTypesForExtensions = {};
Board.DefaultExtensions = {};

var defineMimeTypeExtensions = function(mimeType) {
    var extensions = Array.prototype.slice.call(arguments, 1);
    extensions.forEach(function(extension) {
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

Board.board = function(name) {
    return Board.boards[name];
};

Board.addBoard = function(board) {
    if (!Board.prototype.isPrototypeOf(board))
        return;
    Board.boards[board.name] = board;
};

Board.boardInfos = function(includeHidden) {
    includeHidden = (includeHidden || (typeof includeHidden == "undefined"));
    var list = [];
    Tools.toArray(Board.boards).sort(function(b1, b2) {
        return (b1.name < b2.name) ? -1 : 1;
    }).forEach(function(board) {
        if (!board.enabled || (!includeHidden && board.hidden))
            return;
        list.push({
            name: board.name,
            title: board.title
        });
    });
    return list;
};

Board.boardNames = function(includeHidden) {
    includeHidden = (includeHidden || (typeof includeHidden == "undefined"));
    var list = [];
    Tools.toArray(Board.boards).sort(function(b1, b2) {
        return (b1.name < b2.name) ? -1 : 1;
    }).forEach(function(board) {
        if (!board.enabled || (!includeHidden && board.hidden))
            return;
        list.push(board.name);
    });
    return list;
};

Board.sortThreadsByDate = function(a, b) {
    if (a.fixed == b.fixed) {
        if (a.updatedAt < b.updatedAt)
            return 1;
        else if (a.updatedAt > b.updatedAt)
            return -1;
        else
            return 0;
    } else if (a.fixed) {
        return -1;
    } else {
        return 1;
    }
};

Board.sortThreadsByCreationDate = function(a, b) {
    if (a.createdAt > b.createdAt)
        return -1;
    else if (a.createdAt < b.createdAt)
        return 1;
    else
        return 0;
};

Board.sortThreadsByPostCount = function(a, b) {
    if (a.postCount > b.postCount)
        return -1;
    else if (a.postCount < b.postCount)
        return 1;
    else
        return 0;
};

Board.initialize = function() {
    var reinit = Tools.hasOwnProperties(Board.boards);
    Board.boards = {};

    FSSync.readdirSync(__dirname).forEach(function(file) {
        if ("index.js" == file || "board.js" == file || "js" != file.split(".").pop())
            return;
        var id = "./" + file.split(".").shift();
        if (reinit)
            delete require.cache[require.resolve(id)];
        var board = require(id);
        if (Util.isArray(board)) {
            board.forEach(function(board) {
                Board.addBoard(board);
            });
        } else {
            Board.addBoard(board);
        }
    });

    if (config("board.useDefaultBoards", true)) {
        Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

        Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"),
            { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

        Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

        Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

        Board.addBoard(require("./templates/with-user-agents")("d",
            Tools.translate.noop("Board /d/iscussion", "boardTitle")));
        Board.addBoard(require("./templates/with-external-links")("echo",
            Tools.translate.noop("Boardsphere echo", "boardTitle")));

        Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

        Board.addBoard(new Board("int", "/int/ernational",
            { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

        Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

        Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"),
            { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

        board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
        board.defineProperty("supportedCaptchaEngines", function() {
            var ids = config("board.pr.supportedCaptchaEngines",
                config("board.supportedCaptchaEngines", ["codecha"]));
            if (!Util.isArray(ids))
                ids = [];
            return ids.map(function(id) {
                return Captcha.captcha(id).info();
            });
        });
        board.defineSetting("markupElements", board.markupElements.concat(Board.MarkupElements.CodeMarkupElement));
        Board.addBoard(board);

        Board.addBoard(new Board("rf", Tools.translate.noop("Refuge", "boardTitle"),
            { defaultUserName: Tools.translate.noop("Whiner", "defaultUserName") }));

        Board.addBoard(require("./templates/with-votings")("rpg",
            Tools.translate.noop("Role-playing games", "boardTitle")));
        Board.addBoard(require("./templates/with-likes")("soc", Tools.translate.noop("Social life", "boardTitle"),
            { defaultUserName: Tools.translate.noop("Life of the party", "defaultUserName") }));

        Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"),
            { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));
    }

    Board._banners = {};
    Board.boardNames().forEach(function(boardName) {
        var path = __dirname + "/../public/img/banners/" + boardName;
        if (FSSync.existsSync(path)) {
            Board._banners[boardName] = FSSync.readdirSync(path).filter(function(fileName) {
                return ".gitignore" != fileName;
            });
        } else {
            Board._banners[boardName] = [];
        }
    });
};

module.exports = Board;

var Database = require("../helpers/database");
