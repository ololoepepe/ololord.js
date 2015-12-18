var express = require("express");
var HTTP = require("q-io/http");
var Util = require("util");

var Board = require("../boards");
var boardModel = require("../models/board");
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var controller = require("../helpers/controller");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

var postIdentifiers = function(req, single) {
    if (!single) {
        var posts = req.query.posts;
        if (!posts)
            return [];
        if (Util.isString(posts))
            posts = [posts];
        return posts.map(function(post) {
            var boardName = post.split(":").shift();
            var postNumber = +post.split(":").pop();
            if (!boardName || isNaN(postNumber) || postNumber < 1)
                return null;
            return {
                boardName: boardName,
                postNumber: postNumber
            };
        });
    } else {
        var boardName = req.query.boardName;
        var postNumber = +req.query.postNumber;
        if (!boardName || isNaN(postNumber) || postNumber < 1)
            return [];
        return [ {
            boardName: boardName,
            postNumber: postNumber
        } ];
    }
};

var renderPost = function(req, post) {
    if (!post)
        return Promise.resolve(post);
    var board = Board.board(post.boardName);
    if (!board)
        return Promise.resolve(post);
    var p;
    if (post.threadNumber == post.number) {
        p = Promise.resolve([post]);
    } else {
        p = boardModel.getPosts([ {
            boardName: post.boardName,
            postNumber: post.threadNumber
        } ], req.hashpass);
    }
    return p.then(function(posts) {
        return board.renderPost(post, posts[0]);
    });
};

router.get("/api/post.json", function(req, res) {
    boardModel.getPosts(postIdentifiers(req, true), req.hashpass).then(function(posts) {
        return renderPost(req, posts[0]);
    }).then(function(post) {
        res.json(post || null);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/userIp.json", function(req, res) {
    Database.getPost(req.query.boardName, +req.query.postNumber).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("No such post"));
        if (Database.compareRegisteredUserLevels(req.level, Database.RegisteredUserLevels.Moder) < 0)
            return Promise.reject(Tools.translate("Not enough rights"));
        var result = { ip: post.user.ip };
        var ipv4 = Tools.preferIPv4(post.user.ip);
        if (ipv4 && ipv4 != post.user.ip)
            result.ipv4 = ipv4;
        res.json(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/threadInfo.json", function(req, res) {
    var board = Board.board(req.query.boardName);
    var threadNumber = +req.query.threadNumber;
    boardModel.getThreadInfo(board, req.hashpass, threadNumber).then(function(thread) {
        res.json(thread);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/fileInfo.json", function(req, res) {
    boardModel.getFileInfos([{
        fileName: req.query.fileName,
        fileHash: req.query.fileHash
    }], req.hashpass).then(function(fileInfos) {
        res.json(fileInfos[0]);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/lastPostNumbers.json", function(req, res) {
    var boardNames = req.query.boardNames;
    if (boardNames && !Util.isArray(boardNames))
        boardNames = [boardNames];
    if (!boardNames)
        boardNames = Board.boardNames();
    boardModel.getLastPostNumbers(boardNames).then(function(lastPostNumbers) {
        var r = {};
        lastPostNumbers.forEach(function(lastPostNumber, i) {
            r[boardNames[i]] = lastPostNumber;
        });
        res.json(r);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/lastPostNumber.json", function(req, res) {
    boardModel.getLastPostNumbers([req.query.boardName]).then(function(lastPostNumbers) {
        res.json({ lastPostNumber: lastPostNumbers[0] });
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/threadLastPostNumbers.json", function(req, res) {
    var threads = req.query.threads;
    if (Util.isString(threads))
        threads = [threads];
    var promises = (threads || []).map(function(thread) {
        var boardName = thread.split(":").shift();
        var threadNumber = +thread.split(":")[1];
        return boardModel.getThreadLastPostNumber(boardName, threadNumber);
    });
    Promise.all(promises).then(function(results) {
        res.json(results);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/threadLastPostNumber.json", function(req, res) {
    boardModel.getThreadLastPostNumber(req.query.boardName, req.query.threadNumber).then(function(number) {
        res.json({ lastPostNumber: number });
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/captchaQuota.json", function(req, res) {
    Database.getUserCaptchaQuota(req.query.boardName, req.ip).then(function(quota) {
        res.json({ quota: quota });
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/bannedUser.json", function(req, res) {
    var ip = req.query.ip;
    if (!ip)
        return controller.error(res, Tools.translate("Invalid IP address"), true);
    Database.userBans(ip).then(function(bans) {
        var user = {
            ip: ip,
            bans: bans
        };
        var ipv4 = Tools.preferIPv4(ip);
        if (ipv4 && ipv4 != ip)
            user.ipv4 = ipv4;
        res.json(user);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/fileHeaders.json", function(req, res) {
    if (!req.query.url)
        return controller.error(res, Tools.translate("Invalid URL"), true);
    var proxy = Tools.proxy();
    var p;
    if (proxy) {
        p = HTTP.request({
            method: "HEAD",
            host: proxy.host,
            port: proxy.port,
            headers: { "Proxy-Authorization": proxy.auth },
            path: req.query.url,
            timeout: Tools.Minute
        });
    } else {
        p = HTTP.request({
            method: "HEAD",
            url: req.query.url,
            timeout: Tools.Minute
        });
    }
    return p.then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to get file headers"));
        res.json(response.headers);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/chatMessages.json", function(req, res) {
    Chat.getMessages(req, req.query.lastRequestDate).then(function(result) {
        res.json(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

Captcha.captchaIds().forEach(function(id) {
    Captcha.captcha(id).apiRoutes().forEach(function(route) {
        router[route.method]("/api" + route.path, route.handler);
    });
});

Board.boardNames().forEach(function(name) {
    Board.board(name).apiRoutes().forEach(function(route) {
        router[route.method]("/api" + route.path, route.handler);
    });
});

module.exports = router;
