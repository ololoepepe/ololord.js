var Localize = require("localize");
var Promise = require("promise");
var promisify = require("promisify-node");

var Cache = require("../helpers/cache");
var Captcha = require("../captchas");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

//var loc = new Localize("../translations");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: (function(o, name, def) {
            return config("board." + o.name + "." + name, config("board." + name, def));
        }).bind(o, o, name, def)
    });
};

var boards = {};
var banners = {};
var captchaQuota = {};

var Board = function(name, title, options) {
    Object.defineProperty(this, "name", { value: name });
    Object.defineProperty(this, "title", { value: title });
    Object.defineProperty(this, "defaultUserName", { value: ((options && options.defaultUserName)
        ? options.defaultUserName : "Anonymous") });
    defineSetting(this, "archiveLimit", 0);
    defineSetting(this, "bumpLimit", 500);
    Object.defineProperty(this, "captchaEnabled", {
        get: function() {
            return config("board.captchaEnabled", true) && config("board." + name + ".captchaEnabled", true);
        }
    });
    defineSetting(this, "captchaQuota", 0);
    defineSetting(this, "draftsEnabled", true);
    defineSetting(this, "enabled", true);
    defineSetting(this, "hidden", false);
    defineSetting(this, "maxEmailFieldLength", 150);
    defineSetting(this, "maxNameFieldLength", 50);
    defineSetting(this, "maxSubjectFieldLength", 150);
    defineSetting(this, "maxTextLength", 15000);
    defineSetting(this, "maxPasswordFieldLength", 50);
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
    defineSetting(this, "postLimit", 1000);
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
                    title: captcha.title
                });
            });
            return list;
        }
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
    defineSetting(this, "threadLimit", 200);
    defineSetting(this, "threadsPerPage", 20);
    Object.defineProperty(this, "launchDate", {
        get: function() {
            return new Date(config("board." + name + ".launchDate", config("board.launchDate")));
        }
    });
    //Object.defineProperty(this, "title", { value: title });
};

/*public*/ Board.prototype.getBannerFileName = function() {
    var randomFile = function(files) {
        if (!files || !files.length || files.length < 1)
            return;
        return files[Tools.randomInt(0, files.length - 1)];
    };
    if (banners[this.name])
        return Promise.resolve(randomFile(banners[this.name]));
    return QFS.readdir(__dirname + "/../public/img/banners/" + this.name).then(function(files) {
        banners[this.name] = files;
        return Promise.resolve(files);
    });
};

/*public*/ Board.prototype.getUserCaptchaQuota = function(userIp) {
    var _this = this;
    return Database.CaptchaQuota.findOne({
        boardName: _this.name,
        userIp: userIp
    });
};

/*public*/ Board.prototype.captchaSolved = function(userIp) {
    var _this = this;
    var _previous;
    return Database.CaptchaQuota.db.transaction(function(t) {
        return Database.getOrCreate(Database.CaptchaQuota, {
            boardName: _this.name,
            userIp: userIp
        }).then(function(item) {
            if (!item)
                return Promise.reject("Internal database error");
            _previous = item.quota;
            item.quota = _this.captchaQuota;
            return item.save();
        });
    }).then(function() {
        return Promise.resolve(_previous);
    });
};

/*public*/ Board.prototype.captchaUsed = function(userIp) {
    var _this = this;
    var _model;
    var _previous;
    return model.db.transaction(function(t) {
        return Database.CaptchaQuota.findOne({
            boardName: _this.name,
            userIp: userIp
        }).then(function(item) {
            if (!item) {
                _previous = null;
                return Promise.resolve();
            }
            _previous = item.quota;
            --item.quota;
            return (item.quota > 0) ? item.save() : item.remove();
        });
    }).then(function() {
        return Promise.resolve(_previous);
    });
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

/*public*/ Board.prototype.postExtraData = function(fields, files) {
    return Promise.resove(null);
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

Board.board = function(name) {
    return boards[name];
};

Board.addBoard = function(board) {
    if (!Board.prototype.isPrototypeOf(board))
        return;
    boards[board.name] = board;
};

Board.boardInfos = function(includeHidden) {
    includeHidden = !!(includeHidden || (typeof includeHidden == "undefined"));
    var list = [];
    Tools.forIn(boards, function(board) {
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
    var list = [];
    Tools.forIn(boards, function(board) {
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

module.exports = Board;

var Database = require("../helpers/database");
