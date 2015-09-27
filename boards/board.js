var Localize = require("localize");

var config = require("../helpers/config");
var Database = require("../helpers/database");
var promisify = require("../helpers/promisify.js");
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
    defineSetting(this, "archiveLimit", 0);
    defineSetting(this, "bumpLimit", 500);
    defineSetting(this, "captchaQuota", 0);
    defineSetting(this, "draftsEnabled", true);
    defineSetting(this, "enabled", true);
    defineSetting(this, "hidden", false);
    defineSetting(this, "postingEnabled", true);
    defineSetting(this, "postLimit", 1000);
    defineSetting(this, "showWhois", false);
    defineSetting(this, "supportedCaptchaEngines", []); //TODO
    defineSetting(this, "supportedFileTypes", []); //TODO
    defineSetting(this, "threadLimit", 200);
    defineSetting(this, "threadsPerPage", 20);
    //Object.defineProperty(this, "title", { value: title });
};

/*public*/ Board.prototype.getBannerFileName = function() {
    var randomFile = function(files) {
        if (!files || !files.length || files.length < 1)
            return;
        return files[Tools.randomInt(0, files.length - 1)];
    };
    if (banners[this.name])
        return promisify.proxy(randomFile(banners[this.name]));
    return QFS.readdir(__dirname + "/../public/img/banners/" + this.name).then(function(files) {
        banners[this.name] = files;
        return promisify.proxy(files);
    });
};

/*public*/ Board.prototype.getUserCaptchaQuota = function(userIp) {
    var _this = this;
    return Database.getModel(Database.ModelType.CaptchaQuota).then(function(model) {
        return model.findOne({
            boardName: _this.name,
            userIp: userIp
        });
    });
};

/*public*/ Board.prototype.captchaSolved = function(userIp, transaction) {
    var _this = this;
    var _model;
    var _previous;
    var _t;
    return Database.getModel(Database.ModelType.CaptchaQuota).then(function(model) {
        _model = model;
        if (transaction)
            return promisify.proxy(transaction);
        return model.db.transaction();
    }).then(function(t) {
        _t = t;
        return Database.getOrCreate(_model, {
            boardName: _this.name,
            userIp: userIp
        }, { transaction: _t });
    }).then(function(item) {
        if (!item)
            return promisify.error("Internal database error");
        _previous = item.quota;
        item.quota = _this.captchaQuota;
        return item.save({ transaction: _t });
    }).then(function() {
        return promisify.proxy(_previous);
    });
};

/*public*/ Board.prototype.captchaUsed = function(userIp, transaction) {
    var _this = this;
    var _model;
    var _previous;
    var _t;
    return Database.getModel(Database.ModelType.CaptchaQuota).then(function(model) {
        _model = model;
        if (transaction)
            return promisify.proxy(transaction);
        return model.db.transaction();
    }).then(function(t) {
        _t = t;
        return _model.findOne({
            boardName: _this.name,
            userIp: userIp
        }, { transaction: _t });
    }).then(function(item) {
        if (!item) {
            _previous = null;
            return promisify.proxy();
        }
        _previous = item.quota;
        --item.quota;
        return (item.quota > 0) ? item.save({ transaction: _t }) : item.remove({ transaction: _t });
    }).then(function() {
        return promisify.proxy(_previous);
    });
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

/*public*/ /*lord.PopupMessage.prototype.show = function() {
    if (this.hideTimer)
        return;
    document.body.appendChild(this.msg);
    lord.popups.push(this);
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
};*/

module.exports = Board;
