var Address6 = require("ip-address").Address6;
var Canvas = require("canvas");
var Crypto = require("crypto");
var ffmpeg = require("fluent-ffmpeg");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Image = Canvas.Image;
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

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("board." + o.name + "." + name, config("board." + name, def));
        },
        configurable: true
    });
};

var boards = {};
var banners = {};

var generateRandomImage = function(hash, mimeType, thumbPath) {
    var canvas = new Canvas(200, 200);
    var list = [
        { x: 0, y: 0, w: 200, h: 200 },
        { x: 25, y: 25, w: 50, h: 50 },
        { x: 125, y: 25, w: 50, h: 50 },
        { x: 25, y: 125, w: 50, h: 50 },
        { x: 125, y: 125, w: 50, h: 50 }
    ];
    var ctx = canvas.getContext("2d");
    for (var i = 0; i < 20; i += 4) {
        var r = parseInt(hash.substr(i, 2), 16);
        var g = parseInt(hash.substr(i + 2, 2), 16);
        var b = parseInt(hash.substr(i + 4, 2), 16);
        var a = i ? 0.7 : 1;
        var rect = list.shift();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
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
    Object.defineProperty(this, "name", {
        value: name,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        get: function() {
            return Tools.translate(title);
        },
        configurable: true
    });
    Object.defineProperty(this, "defaultUserName", {
        get: function() {
            if (options && options.defaultUserName)
                return Tools.translate(options && options.defaultUserName);
            else
                return Tools.translate("Anonymous", "defaultUserName");
        },
        configurable: true
    });
    Object.defineProperty(this, "captchaEnabled", {
        get: function() {
            return config("board.captchaEnabled", true) && config("board." + name + ".captchaEnabled", true);
        },
        configurable: true
    });
    defineSetting(this, "captchaQuota", 0);
    defineSetting(this, "enabled", true);
    defineSetting(this, "hidden", false);
    defineSetting(this, "maxEmailLength", 150);
    defineSetting(this, "maxNameLength", 50);
    defineSetting(this, "maxSubjectLength", 150);
    defineSetting(this, "maxTextLength", 15000);
    defineSetting(this, "maxPasswordLength", 50);
    defineSetting(this, "maxFileCount", 1);
    defineSetting(this, "maxFileSize", 10 * 1024 * 1024);
    defineSetting(this, "maxLastPosts", 3);
    defineSetting(this, "markupElements", [
        Board.MarkupElements.BoldMarkupElement,
        Board.MarkupElements.ItalicsMarkupElement,
        Board.MarkupElements.StrikedOutMarkupElement,
        Board.MarkupElements.UnderlinedMarkupElement,
        Board.MarkupElements.SpoilerMarkupElement,
        Board.MarkupElements.QuotationMarkupElement,
        Board.MarkupElements.SubscriptMarkupElement,
        Board.MarkupElements.SuperscriptMarkupElement,
        Board.MarkupElements.UrlMarkupElement
    ]);
    defineSetting(this, "postingEnabled", true);
    defineSetting(this, "showWhois", false);
    Object.defineProperty(this, "supportedCaptchaEngines", {
        get: function() {
            var ids = config("board." + name + ".supportedCaptchaEngines",
                config("board.supportedCaptchaEngines", Captcha.captchaIds()));
            var list = [];
            if (!(ids instanceof Array))
                ids = [];
            ids.forEach(function(id) {
                var captcha = Captcha.captcha(id);
                list.push({
                    id: captcha.id,
                    title: captcha.title,
                    publicKey: captcha.publicKey
                });
            });
            return list;
        },
        configurable: true
    });
    defineSetting(this, "supportedFileTypes", [
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
    defineSetting(this, "bumpLimit", 500);
    defineSetting(this, "postLimit", 1000);
    defineSetting(this, "threadLimit", 200);
    defineSetting(this, "archiveLimit", 0);
    defineSetting(this, "threadsPerPage", 20);
    Object.defineProperty(this, "launchDate", {
        get: function() {
            return new Date(config("board." + name + ".launchDate", config("board.launchDate")));
        },
        configurable: true
    });
};

/*public*/ Board.prototype.customBoardInfoFields = function() {
    return [];
};

/*public*/ Board.prototype.getBannerFileName = function() {
    var randomFile = function(files) {
        if (!files || !files.length || files.length < 1)
            return;
        return files[Tools.randomInt(0, files.length - 1)];
    };
    if (banners[this.name])
        return Promise.resolve(randomFile(banners[this.name]));
    var path = __dirname + "/../public/img/banners/" + this.name;
    return FS.exists(path).then(function(exists) {
        if (!exists)
            return Promise.resolve([]);
        return FS.list(path);
    }).then(function(files) {
        if (files.length < 1)
            return Promise.resolve(null);
        banners[this.name] = files.filter(function(fileName) {
            return ".gitignore" != fileName;
        });
        return Promise.resolve(randomFile(files));
    });;
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

/*public*/ Board.prototype.routes = function() {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/ Board.prototype.actionRoutes = function() {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/ Board.prototype.extraScripts = function() {
    return [];
};

/*public*/ Board.prototype.customPostHeaderPart = function(n, req, thread) {
    //
};

/*public*/ Board.prototype.customPostMenuAction = function(n, req, thread) {
    //
};

/*public*/ Board.prototype.customPostBodyPart = function(n, req, thread) {
    //
};

/*public*/ Board.prototype.customPostFormField = function(n, req, thread) {
    //
};

/*public*/ Board.prototype.customPostFormOption = function(n, req, thread) {
    //
};

/*public*/ Board.prototype.customEditPostDialogPart = function(n, req) {
    //
};

/*public*/ Board.prototype.testParameters = function(fields, files, creatingThread) {
    //
};

/*public*/ Board.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Board.prototype.addTranslations = function(translate) {
    //
};

var renderFileInfo = function(fi) {
    fi.sizeKB = fi.size / 1024;
    fi.sizeText = fi.sizeKB.toFixed(2) + "KB";
    if (fi.mimeType.substr(0, 6) == "image/" || fi.mimeType.substr(0, 6) == "video/") {
        if (fi.dimensions)
            fi.sizeText += ", " + fi.dimensions.width + "x" + fi.dimensions.height;
    }
    if (fi.mimeType.substr(0, 6) == "audio/" || fi.mimeType.substr(0, 6) == "video/") {
        var ed = fi.extraData;
        if (ed.duration)
            fi.sizeText += ", " + ed.duration;
        if (fi.mimeType.substr(0, 6) == "audio/") {
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
        } else if (fi.mimeType.substr(0, 6) == "video/") {
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
    if (post.options.showTripcode) {
        var md5 = Crypto.createHash("md5");
        md5.update(post.user.hashpass + config("site.tripcodeSalt", ""));
        post.tripcode = "!" + md5.digest("base64").substr(0, 10);
    }
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

/*public*/ Board.prototype.postformRules = function() {
    var c = {};
    var _this = this;
    return Tools.getRules("postform").then(function(rules) {
        c.common = rules;
        return Tools.getRules("postform", _this.name);
    }).then(function(rules) {
        c.specific = rules;
        for (var i = c.specific.length - 1; i >= 0; --i) {
            var rule = c.specific[i];
            if ("#include all" == rule) {
                Array.prototype.splice.apply(c.specific, [i, 1].concat(c.common));
            } else if (/^#include\s+\d+$/.test(rule)) {
                var n = +rule.replace(/#include\s+/, "");
                if (n >= 0 && n < c.common.length)
                    c.specific.splice(i, 1, c.common[n]);
            }
        };
        return Promise.resolve((c.specific.length > 0) ? c.specific : c.common);
    });
};

/*public*/ Board.prototype.generateFileName = function(file) {
    return Global.IPC.send("fileName", this.name).then(function(base) {
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
            var sha1 = Crypto.createHash("sha1");
            sha1.update(data);
            file.hash = sha1.digest("hex");
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
                console.log(err.stack ? err.stack : err);
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
                file.dimensions = {
                    width: metadata.streams[0].width,
                    height: metadata.streams[0].height
                };
                file.extraData.duration = durationToString(metadata.format.duration);
                file.extraData.bitrate = Math.floor(+metadata.format.bitrate / 1024);
                file.thumbPath += ".png";
                return new Promise(function(resolve, reject) {
                    ffmpeg(file.path).frames(1).on("error", reject).on("end", resolve).save(file.thumbPath);
                })
            }).catch(function(err) {
                console.log(err.stack ? err.stack : err);
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
            return Promise.reject("Unsupported file type");
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
    "application/pdf": "png",
    "audio/mpeg": "png",
    "audio/ogg": "png",
    "audio/wav": "png",
    "video/mp4": "png",
    "video/webm": "png"
};

Board.board = function(name) {
    return boards[name];
};

Board.addBoard = function(board) {
    if (!Board.prototype.isPrototypeOf(board))
        return;
    boards[board.name] = board;
};

Board.boardInfos = function(includeHidden) {
    includeHidden = (includeHidden || (typeof includeHidden == "undefined"));
    var list = [];
    Tools.toArray(boards).sort(function(b1, b2) {
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
    Tools.toArray(boards).sort(function(b1, b2) {
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

module.exports = Board;

var Database = require("../helpers/database");
