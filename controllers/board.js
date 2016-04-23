var express = require("express");
var FS = require("q-io/fs");
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

router.get("/:boardName", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedHTML(req, res, next, `page-${board.name}-0`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/catalog.html", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        var sortMode = (req.query.sort || "date").toLowerCase();
        if (["recent", "bumps"].indexOf(sortMode) < 0)
            sortMode = "date";
        controller.sendCachedHTML(req, res, next, `catalog-${sortMode}-${board.name}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/catalog.json", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    var c = {};
    controller.checkBan(req, res, board.name).then(function() {
        var sortMode = (req.query.sort || "date").toLowerCase();
        if (["recent", "bumps"].indexOf(sortMode) < 0)
            sortMode = "date";
        controller.sendCachedJSON(req, res, next, `catalog-${sortMode}-${board.name}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/archive.html", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedHTML(req, res, next, `archive-${board.name}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/archive.json", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedJSON(req, res, next, `archive-${board.name}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/rss.xml", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    var c = {};
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedRSS(req, res, next, board.name);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/:page.html", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedHTML(req, res, next, `page-${board.name}-${req.params.page}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/:page.json", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    var c = {};
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedJSON(req, res, next, `page-${board.name}-${req.params.page}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/res/:threadNumber.html", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedHTML(req, res, next, `thread-${board.name}-${req.params.threadNumber}`);
    }).catch(function(err) {
        next(err);
    });
});

router.get("/:boardName/res/:threadNumber.json", function(req, res, next) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        var err = new Error();
        err.status = 404;
        return next(err);
    }
    var c = {};
    controller.checkBan(req, res, board.name).then(function() {
        controller.sendCachedJSON(req, res, next, `thread-${board.name}-${req.params.threadNumber}`);
    }).catch(function(err) {
        next(err);
    });
});

router.generateJSON = function() {
    return BoardModel.generateJSON();
};

module.exports = router;
