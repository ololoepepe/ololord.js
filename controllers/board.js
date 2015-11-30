var express = require("express");
var merge = require("merge");
var Util = require("util");

var Board = require("../boards");
var Captcha = require("../captchas");
var BoardModel = require("../models/board");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

var selectCaptchaEngine = function(req, board) {
    var captcha = req.settings.captchaEngine;
    var supportedCaptchaEngines = board.supportedCaptchaEngines;
    if (supportedCaptchaEngines.length < 1)
        return null;
    var ceid = captcha ? captcha.id : null;
    var isSupported = function(id) {
        for (var i = 0; i < supportedCaptchaEngines.length; ++i) {
            if (supportedCaptchaEngines[i].id == id)
                return true;
        }
        return false;
    };
    if (!ceid || !isSupported(ceid)) {
        if (isSupported("google-recaptcha"))
            ceid = "google-recaptcha";
        else
            ceid = supportedCaptchaEngines[0].id;
    }
    return Captcha.captcha(ceid);
};

var renderPage = function(model, board, req) {
    model.currentPage = +(req.params.page || 0);
    model.title = board.title;
    model.includeBoardScripts = true;
    model = merge.recursive(model, controller.boardModel(board));
    model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
    model.extraScripts = board.extraScripts();
    model.tr = controller.translationsModel();
    return board.postformRules().then(function(rules) {
        model.postformRules = rules;
        model.captchaEngine = selectCaptchaEngine(req, board);
        return model.captchaEngine.prepare(req);
    }).then(function(captchaPrepared) {
        model.captchaPrepared = captchaPrepared;
        return Database.getUserCaptchaQuota(board.name, req.ip);
    }).then(function(quota) {
        model.user = { captchaQuota: quota };
        return board.getBannerFileName();
    }).then(function(bannerFileName) {
        if (bannerFileName)
            model.board.bannerFileName = bannerFileName;
        model.minimalisticPostform = function() {
            return "mobile" == this.deviceType || this.settings.minimalisticPostform;
        };
        return controller(req, "boardPage", model);
    });
};

var renderThread = function(model, board, req) {
    model.title = model.thread.title || (board.title + " — " + model.thread.number);
    model.includeBoardScripts = true;
    model.includeThreadScripts = true;
    model.board = controller.boardModel(board).board;
    model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
    model.extraScripts = board.extraScripts();
    model.tr = controller.translationsModel();
    return board.postformRules().then(function(rules) {
        model.postformRules = rules;
        model.captchaEngine = selectCaptchaEngine(req, board);
        return model.captchaEngine.prepare(req);
    }).then(function(captchaPrepared) {
        model.captchaPrepared = captchaPrepared;
        return Database.getUserCaptchaQuota(board.name, req.ip);
    }).then(function(quota) {
        model.user = { captchaQuota: quota };
        return board.getBannerFileName();
    }).then(function(bannerFileName) {
        if (bannerFileName)
            model.board.bannerFileName = bannerFileName;
        model.minimalisticPostform = function() {
            return "mobile" == this.deviceType || this.settings.minimalisticPostform;
        };
        return controller(req, "threadPage", model);
    });
};

var renderCatalog = function(model, board, req, json) {
    model.title = board.title;
    model.includeBoardScripts = true;
    model = merge.recursive(model, controller.boardModel(board));
    model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
    model.sortMode = req.query.sort || "date";
    return board.getBannerFileName().then(function(bannerFileName) {
        if (bannerFileName)
            model.board.bannerFileName = bannerFileName;
        model.tr = controller.translationsModel();
        return controller(req, "catalog", model);
    });
};

router.get("/:boardName", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getBoardPage(board);
    }).then(function(model) {
        return renderPage(model, board, req);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/catalog.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getCatalogPage(board, req.query.sort);
    }).then(function(model) {
        return renderCatalog(model, board, req);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/catalog.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getCatalogPage(board, req.query.sort, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/:boardName/rss.xml", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        res.send(Database.rss[board.name]);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/:page.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name, false).then(function() {
        return BoardModel.getBoardPage(board, req.params.page)
    }).then(function(model) {
        return renderPage(model, board, req);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/:page.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getBoardPage(board, req.params.page, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/:boardName/res/:threadNumber.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getThreadPage(board, req.params.threadNumber);
    }).then(function(model) {
        return renderThread(model, board, req);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/res/:threadNumber.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getThreadPage(board, req.params.threadNumber, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

module.exports = router;
