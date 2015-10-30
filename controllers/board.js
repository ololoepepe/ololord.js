var Crypto = require("crypto");
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

var postingSpeedString = function(board, lastPostNumber) {
    var msecs = board.launchDate.valueOf();
    if (isNaN(msecs))
        return "-";
    var zeroSpeedString = function(nonZero) {
        if (lastPostNumber && msecs)
            return "1 " + nonZero;
        else
            return "0 " + Tools.translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return (ss.split(".").pop() != "0") ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = (new Date()).valueOf() - msecs;
    var duptime = uptimeMsecs / Tools.Hour;
    var uptime = Math.floor(duptime);
    var shour = Tools.translate("post(s) per hour.", "postingSpeed");
    if (!uptime) {
        return zeroSpeedString(shour);
    } else if (Math.floor(lastPostNumber / uptime) > 0) {
        return speedString(duptime) + " " + shour;
    } else {
        duptime /= 24;
        uptime = Math.floor(duptime);
        var sday = Tools.translate("post(s) per day.", "postingSpeed");
        if (!uptime) {
            return zeroSpeedString(sday);
        } else if (Math.floor(lastPostNumber / uptime) > 0) {
            return speedString(duptime) + " " + sday;
        } else {
            duptime /= (365.0 / 12.0);
            uptime = Math.floor(duptime);
            var smonth = Tools.translate("post(s) per month.", "postingSpeed");
            if (!uptime) {
                return zeroSpeedString(smonth);
            } else if (Math.floor(lastPostNumber / uptime) > 0) {
                return speedString(duptime) + " " + smonth;
            } else {
                duptime /= 12.0;
                uptime = Math.floor(duptime);
                var syear = Tools.translate("post(s) per year.", "postingSpeed");
                if (!uptime)
                    return zeroSpeedString(syear);
                else if (Math.floor(lastPostNumber / uptime) > 0)
                    return speedString(duptime) + " " + syear;
                else
                    return "0 " + syear;
            }
        }
    }
};

var renderFileInfo = function(fi) {
    fi.sizeKB = fi.size / 1024;
    fi.sizeText = fi.sizeKB.toFixed(2) + "KB";
    if (fi.mimeType.substr(0, 6) == "image/" || fi.mimeType.substr(0, 6) == "video/") {
        if (fi.dimensions)
            fi.sizeText += ", " + fi.dimensions.width + "x" + fi.dimensions.height;
    }
    var tr = controller.translationsModel().tr;
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
    post.isOp = (post.number == post.threadNumber);
    post.ownIp = (req.ip == post.user.ip);
    post.ownHashpass = (req.hashpass == post.user.hashpass);
    post.opIp = (post.user.ip == opPost.user.ip);
    if (Database.compareRegisteredUserLevels(req.level, Database.Moder) < 0)
        post.user.ip = "";
    if (Database.compareRegisteredUserLevels(post.user.level, Database.User) >= 0) {
        var md5 = Crypto.createHash("md5");
        md5.update(post.hashpass + config("site.tripcodeSalt", ""));
        post.tripcode = "!" + md5.digest("base64").substr(0, 10);
    }
    post.user.hashpass = "";
    board.renderPost(post, req, opPost);
    if (!board.showWhois)
        return Promise.resolve();
    return Tools.flagName(post.geolocation.countryCode).then(function(flagName) {
        post.geolocation.flagName = flagName || "default.png";
        if (!post.geolocation.countryName)
            post.geolocation.countryName = "Unknown country";
        return Promise.resolve();
    });
};

var renderPage = function(model, board, req, json) {
    var promises = model.threads.map(function(thread) {
        return renderPost(thread.opPost, board, req, thread.opPost).then(function() {
            return Promise.all(thread.lastPosts.map(function(post) {
                return renderPost(post, board, req, thread.opPost);
            }));
        });
    });
    return Promise.all(promises).then(function() {
        model = merge.recursive(model, controller.headModel(board, req));
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts;
        if (!json || json.translations)
            model.tr = controller.translationsModel();
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
        return renderPost(post, board, req, model.thread.opPost);
    });
    promises.unshift(renderPost(model.thread.opPost, board, req, model.thread.opPost));
    return Promise.all(promises).then(function() {
        model = merge.recursive(model, controller.headModel(board, req));
        model = merge.recursive(model, controller.boardModel(board));
        model.board.postingSpeed = postingSpeedString(board, model.lastPostNumber);
        model.extraScripts = board.extraScripts;
        if (!json || json.translations)
            model.tr = controller.translationsModel();
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
        model.board.postingSpeed = postingSpeedString(board, model.lastPostNumber);
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
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        board.renderBoardPage(req, res).then(function(result) {
            if (result)
                return;
            return boardModel.getPage(board, req.hashpass).then(function(model) {
                console.time("render");
                model.currentPage = 0;
                return renderPage(model, board, req);
            }).then(function(data) {
                console.timeEnd("render");
                res.send(data);
            });
        }).catch(function(err) {
            res.send("Error: " + err);
            console.log(err.stack);
        });
    }
});

router.get("/:boardName/catalog.html", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        return boardModel.getCatalog(board, req.hashpass, req.query.sort).then(function(model) {
            return renderCatalog(model, board, req);
        }).then(function(data) {
            res.send(data);
        }).catch(function(err) {
            res.send("Error: " + err);
        });
    }
});

router.get("/:boardName/catalog.json", function(req, res) {
    var board = Board.board(req.params.boardName);
    if (!board) {
        res.send("No such board: " + req.params.boardName);
    } else {
        boardModel.getCatalog(board, req.hashpass, req.query.sort).then(function(model) {
            return renderCatalog(model, board, req, true);
        }).then(function(data) {
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
        board.renderThread(req, res).then(function(result) {
            if (result)
                return;
            return boardModel.getThread(board, req.hashpass, req.params.threadNumber).then(function(model) {
                console.time("renderThread");
                return renderThread(model, board, req);
            }).then(function(data) {
                console.timeEnd("renderThread");
                res.send(data);
            });
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
