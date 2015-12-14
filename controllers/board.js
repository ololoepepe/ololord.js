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

var renderPage = function(board, page) {
    var c = {};
    return BoardModel.getBoardPage(board, page).then(function(model) {
        c.model = model;
        c.model.title = board.title;
        c.model.includeBoardScripts = true;
        c.model.board = controller.boardModel(board).board;
        c.model.extraScripts = board.extraScripts();
        c.model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
        c.model.postformRules = rules;
        return controller("boardPage", c.model);
    });
};

router.get("/:boardName", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return controller.html(renderPage.bind(null, board, 0), "board", board.name, 0);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/:boardName/catalog.html", function(req, res) {
    var f = function(board, sortMode) {
        var c = {};
        return BoardModel.getCatalogPage(board, sortMode || "date").then(function(model) {
            c.model = model;
            c.model.title = board.title;
            c.model.includeBoardScripts = true;
            c.model.board = controller.boardModel(board).board;
            c.model.sortMode = sortMode || "date";
            c.model.tr = controller.translationsModel();
            return controller("catalogPage", c.model);
        });
    };
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return controller.html(f.bind(null, board, req.query.sort), "catalog", board.name, req.query.sort || "date");
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/:boardName/catalog.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getCatalogPage(board, req.query.sort, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/:boardName/rss.xml", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        res.send(Database.rss[board.name]);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/:boardName/:page.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return controller.html(renderPage.bind(null, board, req.params.page), "board", board.name, req.params.page);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/:boardName/:page.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getBoardPage(board, req.params.page, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/:boardName/res/:threadNumber.html", function(req, res) {
    var f = function(board, threadNumber) {
        var c = {};
        return BoardModel.getThreadPage(board, threadNumber).then(function(model) {
            c.model = model;
            c.model.title = board.title + " — " + c.model.thread.number;
            c.model.includeBoardScripts = true;
            c.model.includeThreadScripts = true;
            c.model.board = controller.boardModel(board).board;
            c.model.extraScripts = board.extraScripts();
            c.model.tr = controller.translationsModel();
            c.model.threadNumber = c.model.thread.number;
            return board.postformRules();
        }).then(function(rules) {
            c.model.postformRules = rules;
            return controller("threadPage", c.model);
        });
    };
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404);
    controller.checkBan(req, res, board.name).then(function() {
        return controller.html(f.bind(null, board, req.params.threadNumber), "thread", board.name,
            req.params.threadNumber);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err);
    });
});

router.get("/:boardName/res/:threadNumber.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board)
        return controller.error(res, 404, true);
    controller.checkBan(req, res, board.name).then(function() {
        return BoardModel.getThreadPage(board, req.params.threadNumber, true);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

module.exports = router;
