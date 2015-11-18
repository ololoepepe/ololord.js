var express = require("express");
var merge = require("merge");
var Util = require("util");

var Board = require("../boards");
var Captcha = require("../captchas");
var boardModel = require("../models/board");
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

var renderPage = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return board.renderPost(thread.opPost, req, thread.opPost).then(function() {
            return Promise.all(thread.lastPosts.map(function(post) {
                return board.renderPost(post, req, thread.opPost);
            }));
        });
    });
    return Promise.all(promises).then(function() {
        model.title = board.title;
        model.includeBoardScripts = true;
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts();
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
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
        model.customPostBodyPart = {};
        for (var i = 0; i < 60; i += 10)
            model.customPostBodyPart[i] = board.customPostBodyPart(i, req);
        model.customPostFormField = {};
        for (var i = 0; i < 120; i += 10)
            model.customPostFormField[i] = board.customPostFormField(i, req);
        model.customPostFormOption = {};
        for (var i = 0; i < 50; i += 10)
            model.customPostFormOption[i] = board.customPostFormOption(i, req);
        if (json)
            return Promise.resolve(JSON.stringify(model));
        else
            return controller(req, "boardPage", model);
    });
};

var renderThread = function(model, board, req, json) {
    var thread = merge.clone(model.thread);
    var promises = model.thread.posts.map(function(post) {
        return board.renderPost(post,req, model.thread.opPost);
    });
    promises.unshift(board.renderPost(model.thread.opPost, req, model.thread.opPost));
    return Promise.all(promises).then(function() {
        model.title = model.thread.title || (board.title + " — " + model.thread.number);
        model.includeBoardScripts = true;
        model.includeThreadScripts = true;
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts();
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
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
        model.customPostBodyPart = {};
        for (var i = 0; i < 60; i += 10)
            model.customPostBodyPart[i] = board.customPostBodyPart(i, req);
        model.customPostFormField = {};
        for (var i = 0; i < 120; i += 10)
            model.customPostFormField[i] = board.customPostFormField(i, req, thread);
        model.customPostFormOption = {};
        for (var i = 0; i < 50; i += 10)
            model.customPostFormOption[i] = board.customPostFormOption(i, req, thread);
        if (json)
            return Promise.resolve(JSON.stringify(model));
        else
            return controller(req, "thread", model);
    });
};

var renderCatalog = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return board.renderPost(thread.opPost, req, thread.opPost);
    });
    return Promise.all(promises).then(function() {
        model.title = board.title;
        model.includeBoardScripts = true;
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.sortMode = req.query.sort || "date";
        return board.getBannerFileName();
    }).then(function(bannerFileName) {
        if (bannerFileName)
            model.board.bannerFileName = bannerFileName;
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        if (json)
            return Promise.resolve(JSON.stringify(model));
        else
            return controller(req, "catalog", model);
    });
};

router.get("/:boardName", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return board.renderBoardPage(req, res);
    }).then(function(result) {
        if (result)
            return;
        return boardModel.getPage(board, req.hashpass).then(function(model) {
            model.currentPage = 0;
            return renderPage(model, board, req);
        }).then(function(data) {
            res.send(data);
        });
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/catalog.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    return boardModel.getCatalog(board, req.hashpass, req.query.sort).then(function(model) {
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
    boardModel.getCatalog(board, req.hashpass, req.query.sort).then(function(model) {
        return renderCatalog(model, board, req, true);
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
    res.send(Database.rss[board.name]);
});

router.get("/:boardName/:page.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404);
    board.renderBoardPage(req, res).then(function(result) {
        if (result)
            return;
        return boardModel.getPage(board, req.hashpass, req.params.page).then(function(model) {
            model.currentPage = req.params.page;
            return renderPage(model, board, req);
        }).then(function(data) {
            res.send(data);
        });
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/:page.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404, true);
    boardModel.getPage(board, req.hashpass, req.params.page).then(function(model) {
        return renderPage(model, board, req, true);
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
    board.renderThread(req, res).then(function(result) {
        if (result)
            return;
        return boardModel.getThread(board, req.hashpass, req.params.threadNumber).then(function(model) {
            return renderThread(model, board, req);
        }).then(function(data) {
            res.send(data);
        });
    }).catch(function(err) {
        controller.error(req, res, err);
    });
});

router.get("/:boardName/res/:threadNumber.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(req, res, 404, true);
    boardModel.getThread(board, req.hashpass, req.params.threadNumber).then(function(model) {
        return renderThread(model, board, req, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

module.exports = router;
