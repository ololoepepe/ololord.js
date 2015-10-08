var Crypto = require("crypto");
var express = require("express");
var merge = require("merge");
var Promise = require("promise");

var Board = require("../boards");
var boardModel = require("../models/board");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");

var router = express.Router();

var renderFileInfo = function(fi) {
    fi.sizeKB = fi.size / 1024;
    fi.sizeText = fi.sizeKB.toFixed(2) + "KB";
    if (fi.mimeType.substr(0, 6) == "image/" || fi.mimeType.substr(0, 6) == "video/") {
        if (fi.dimensions)
            fi.sizeText += ", " + fi.dimensions.width + "x" + fi.dimensions.height;
    }
    var tr = controller.translationsModel();
    if (fi.mimeType.substr(0, 6) == "audio/" || fi.mimeType.substr(0, 6) == "video/") {
        var ed = fi.extraData;
        if (ed.duration)
            fi.sizeText += ", " + ed.duration;
        if (fi.mimeType.substr(0, 6) == "audio/") {
            if (ed.bitrate)
                fi.sizeText += ", " + ed.bitrate + tr.kbps;
            fi.sizeTooltip = ed.artist ? ed.artist : tr.unknownArtist;
            fi.sizeTooltip += " - ";
            fi.sizeTooltip += ed.title ? ed.title : tr.unknownTitle;
            fi.sizeTooltip += " [";
            fi.sizeTooltip += ed.album ? ed.album : tr.unknownAlbum;
            fi.sizeTooltip += "]";
            if (ed.year)
                fi.sizeTooltip += " (" + ed.year + ")";
        } else if (fi.mimeType.substr(0, 6) == "video/") {
            fi.sizeTooltip = ed.bitrate + tr.kbps;
        }
    }
};

var renderPost = function(post, board, req, opPost) {
    post.fileInfos.forEach(function(fileInfo) {
        renderFileInfo(fileInfo);
    });
    if (post.number == post.threadNumber)
        post.isOp = true;
    if (req.ip == post.user.ip)
        post.ownIp = true;
    if (req.hashpass == post.user.hashpass)
        post.ownHashpass = true;
    if (post.user.ip == opPost.user.ip)
        post.opIp = true;
    if (req.level < Database.Moder)
        post.user.ip = "";
    if (post.user.level >= "USER") {
        var md5 = Crypto.createHash("md5");
        md5.update(post.hashpass + config("site.tripcodeSalt", ""));
        post.tripcode = "!" + md5.digest("base64").substr(0, 10);
    }
    post.user.hashpass = "";
    return Promise.resolve().then(function() {
        if (!board.showWhois)
            return Promise.resolve();
        return Tools.flagName(post.countryCode).then(function(flagName) {
            if (!flagName)
                post.flagName = "default.png";
            if (!post.countryName)
                post.countryName = "Unknown country";
            return Promise.resolve();
        });
    });
};

var renderPage = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return renderPost(thread.opPost, board, req, thread.opPost).then(function() {
            Promise.all(thread.lastPosts.map(function(post) {
                return renderPost(post, board, req, thread.opPost);
            }));
        });
    });
    return Promise.all(promises).then(function() {
        model = merge(model, controller.headModel(board, req));
        model = merge(model, controller.navbarModel());
        model.defaultUserName = board.defaultUserName;
        model.showWhois = board.showWhois;
        model.board = {
            name: board.name
        };
        model.loggedIn = !!req.hashpass;
        model.maxAllowedRating = req.maxAllowedRating;
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
            return controller(req, "boardPage/main", model);
    });
};

var renderThread = function(model, board, req, json) {
    var promises = model.thread.posts.map(function(post) {
        return renderPost(post, board, req, model.thread.opPost);
    });
    return Promise.all(promises).then(function() {
        model = merge(model, controller.headModel(board, req));
        model = merge(model, controller.navbarModel());
        model.defaultUserName = board.defaultUserName;
        model.showWhois = board.showWhois;
        model.board = {
            name: board.name
        };
        model.loggedIn = !!req.hashpass;
        model.maxAllowedRating = req.maxAllowedRating;
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
            return controller(req, "thread/main", model);
    });
};

router.get("/:boardName", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getPage(board, req.hashpass).then(function(model) {
            console.time("render");
            return renderPage(model, board, req);
        }).then(function(data) {
            console.timeEnd("render");
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

router.get("/:boardName/:page.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getPage(board, req.hashpass, req.params.page).then(function(model) {
            return renderPage(model, board, req);
        }).then(function(data) {
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

router.get("/:boardName/:page.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getPage(board, req.hashpass, req.params.page).then(function(model) {
            return renderPage(model, board, req, true);
        }).then(function(data) {
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

router.get("/:boardName/res/:threadNumber.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getThread(board, req.hashpass, req.params.threadNumber).then(function(model) {
            console.time("renderThread");
            return renderThread(model, board, req);
        }).then(function(data) {
            console.timeEnd("renderThread");
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

router.get("/:boardName/res/:threadNumber.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getThread(board, req.hashpass, req.params.threadNumber).then(function(model) {
            return renderThread(model, board, req, true);
        }).then(function(data) {
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

module.exports = router;
