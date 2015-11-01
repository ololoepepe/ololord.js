var express = require("express");
var merge = require("merge");
var Util = require("util");

var Board = require("../boards");
var boardModel = require("../models/board");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

var renderPage = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return controller.renderPost(thread.opPost, board, req, thread.opPost).then(function() {
            return Promise.all(thread.lastPosts.map(function(post) {
                return controller.renderPost(post, board, req, thread.opPost);
            }));
        });
    });
    return Promise.all(promises).then(function() {
        model = merge.recursive(model, controller.headModel(board, req));
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts;
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
        model.postformRules = rules;
        model.isSpecialThumbName = function(thumbName) {
            return false; //TODO
        };
        model.specialThumbName = function(thumbName) {
            return thumbName.replace("/", "_");
        };
        model.minimalisticPostform = function() {
            return "mobile" == this.deviceType || this.settings.minimalisticPostform;
        };
        model.customPostBodyPart = {};
        for (var i = 0; i < 60; i += 10)
            model.customPostBodyPart[i] = board.customPostBodyPart(i);
        if (json)
            return Promise.resolve(JSON.stringify(model));
        else
            return controller(req, "boardPage", model);
    });
};

var renderThread = function(model, board, req, json) {
    var promises = model.thread.posts.map(function(post) {
        return controller.renderPost(post, board, req, model.thread.opPost);
    });
    promises.unshift(controller.renderPost(model.thread.opPost, board, req, model.thread.opPost));
    return Promise.all(promises).then(function() {
        model = merge.recursive(model, controller.headModel(board, req));
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts;
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        return board.postformRules();
    }).then(function(rules) {
        model.postformRules = rules;
        model.isSpecialThumbName = function(thumbName) {
            return false; //TODO
        };
        model.specialThumbName = function(thumbName) {
            return thumbName.replace("/", "_");
        };
        model.minimalisticPostform = function() {
            return "mobile" == this.deviceType || this.settings.minimalisticPostform;
        };
        model.customPostBodyPart = {};
        for (var i = 0; i < 60; i += 10)
            model.customPostBodyPart[i] = board.customPostBodyPart(i);
        if (json)
            return Promise.resolve(JSON.stringify(model));
        else
            return controller(req, "thread", model);
    });
};

var renderCatalog = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return renderPost(thread.opPost, board, req, thread.opPost);
    });
    return Promise.all(promises).then(function() {
        model = merge.recursive(model, controller.headModel(board, req));
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = controller.postingSpeedString(board, model.lastPostNumber);
        model.sortMode = req.query.sort || "date";
        if (!json || json.translations)
            model.tr = controller.translationsModel();
        model.isSpecialThumbName = function(thumbName) {
            return false; //TODO
        };
        model.specialThumbName = function(thumbName) {
            return thumbName.replace("/", "_");
        };
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
    board.renderBoardPage(req, res).then(function(result) {
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
