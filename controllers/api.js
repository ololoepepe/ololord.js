var express = require("express");
var FS = require("q-io/fs");
var HTTP = require("q-io/http");
var Util = require("util");

var Board = require("../boards");
var boardModel = require("../models/board");
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var controller = require("../helpers/controller");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Permissions = require("../helpers/permissions");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/api/post.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        return boardModel.getPosts([{
            boardName: req.query.boardName,
            postNumber: +req.query.postNumber
        }], req.hashpass);
    }).then(function(posts) {
        var post = posts[0];
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
    }).then(function(post) {
        res.json(post || null);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/userIp.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        if (Database.compareRegisteredUserLevels(req.level(), Permissions.seeUserIp()) < 0)
            return Promise.reject(Tools.translate("Not enough rights"));
        return Database.getPost(req.query.boardName, +req.query.postNumber);
    }).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("No such post"));
        var result = { ip: post.user.ip };
        var ipv4 = Tools.preferIPv4(post.user.ip);
        if (ipv4 && ipv4 != post.user.ip)
            result.ipv4 = ipv4;
        res.json(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/threadInfo.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        var board = Board.board(req.query.boardName);
        var threadNumber = +req.query.threadNumber;
        return boardModel.getThreadInfo(board, req.hashpass, threadNumber);
    }).then(function(thread) {
        res.json(thread);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/fileInfo.json", function(req, res) {
    boardModel.getFileInfos([{
        fileName: req.query.fileName,
        fileHash: req.query.fileHash
    }], req.hashpass).then(function(fileInfos) {
        res.json(fileInfos[0]);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/fileExistence.json", function(req, res) {
    if (!req.query.fileName && !req.query.fileHash)
        return controller.error(req, res, Tools.translate("Neither file name nor hash is specified", "error"), true);
    var identifier = req.query.fileName || req.query.fileHash;
    var p;
    if (req.query.fileName)
        p = Database.db.hexists("fileInfos", identifier);
    else
        p = Database.db.exists("fileHashes:" + identifier);
    p.then(function(exists) {
        res.json(!!exists);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/lastPostNumbers.json", function(req, res) {
    var boardNames = req.query.boardNames;
    if (boardNames && !Util.isArray(boardNames))
        boardNames = [boardNames];
    if (!boardNames)
        boardNames = Board.boardNames();
    controller.checkBan(req, res, boardNames).then(function() {
        return boardModel.getLastPostNumbers(boardNames);
    }).then(function(lastPostNumbers) {
        var r = {};
        lastPostNumbers.forEach(function(lastPostNumber, i) {
            r[boardNames[i]] = lastPostNumber;
        });
        res.json(r);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/lastPostNumber.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        return boardModel.getLastPostNumbers([req.query.boardName]);
    }).then(function(lastPostNumbers) {
        res.json({ lastPostNumber: lastPostNumbers[0] });
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/threadLastPostNumbers.json", function(req, res) {
    var threads = req.query.threads;
    if (Util.isString(threads))
        threads = [threads];
    var boardNames = (threads || []).map(function(thread) {
        return thread.split(":").shift();
    });
    controller.checkBan(req, res, boardNames).then(function() {
        var promises = (threads || []).map(function(thread) {
            var boardName = thread.split(":").shift();
            var threadNumber = +thread.split(":")[1];
            return boardModel.getThreadLastPostNumber(boardName, threadNumber);
        });
        return Promise.all(promises);
    }).then(function(results) {
        res.json(results);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/threadLastPostNumber.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        return boardModel.getThreadLastPostNumber(req.query.boardName, req.query.threadNumber);
    }).then(function(number) {
        res.json({ lastPostNumber: number });
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/captchaQuota.json", function(req, res) {
    if (!req.query.boardName)
        return controller.error(req, res, Tools.translate("Invalid board"), true);
    controller.checkBan(req, res, req.query.boardName).then(function() {
        return Database.getUserCaptchaQuota(req.query.boardName, req.ip);
    }).then(function(quota) {
        res.json({ quota: quota });
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/bannedUsers.json", function(req, res) {
    if (!req.isModer())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    Database.userBans().then(function(users) {
        var newUsers = [];
        Tools.forIn(users, function(bans, ip) {
            var newBans = {};
            Tools.forIn(bans, function(ban, boardName) {
                if (!req.isModer(boardName))
                    return;
                newBans[boardName] = ban;
            });
            var user = {
                ip: ip,
                bans: newBans
            };
            var ipv4 = Tools.preferIPv4(ip);
            if (ipv4 && ipv4 != ip)
                user.ipv4 = ipv4;
            newUsers.push(user);
        });
        res.json(newUsers);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/bannedUser.json", function(req, res) {
    var ip = Tools.correctAddress(req.query.ip);
    if (!ip)
        return controller.error(req, res, Tools.translate("Invalid IP address"), true);
    if (!req.isModer())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    Database.userBans(ip).then(function(bans) {
        var newBans = {};
        Tools.forIn(bans, function(ban, boardName) {
            if (!req.isModer(boardName))
                return;
            newBans[boardName] = ban;
        });
        var user = {
            ip: ip,
            bans: newBans
        };
        var ipv4 = Tools.preferIPv4(ip);
        if (ipv4 && ipv4 != ip)
            user.ipv4 = ipv4;
        res.json(user);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/registeredUsers.json", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    Database.registeredUsers().then(function(users) {
        users.forEach(function(user) {
            user.ips = user.ips.map(function(ip) {
                var ipv4 = Tools.preferIPv4(ip);
                var o = { ip: ip };
                if (ipv4 && ipv4 != ip)
                    o.ipv4 = ipv4;
                return o;
            });
        });
        res.json(users);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/registeredUser.json", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    var hashpass = req.query.hashpass;
    if (!Tools.mayBeHashpass(hashpass))
        return controller.error(req, res, Tools.translate("Invalid hashpass"), true);
    Database.registeredUser(hashpass).then(function(user) {
        user.ips = user.ips.map(function(ip) {
            var ipv4 = Tools.preferIPv4(ip);
            var o = { ip: ip };
            if (ipv4 && ipv4 != ip)
                o.ipv4 = ipv4;
            return o;
        });
        res.json(user);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/fileHeaders.json", function(req, res) {
    if (!req.query.url)
        return controller.error(req, res, Tools.translate("Invalid URL"), true);
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
        controller.error(req, res, err, true);
    });
});

router.get("/api/chatMessages.json", function(req, res) {
    Chat.getMessages(req, req.query.lastRequestDate).then(function(result) {
        res.json(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/synchronization.json", function(req, res) {
    if (!req.query.key)
        return controller.error(req, res, Tools.translate("No key specified"), true);
    Database.db.get("synchronizationData:" + req.query.key).then(function(data) {
        res.json(data ? JSON.parse(data) : null);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/api/fileTree.json", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    var dir = req.query.dir;
    if (dir.slice(-1)[0] != "/")
        dir += "/";
    var path = __dirname + "/../" + dir;
    var c = { reply: "<ul class='jqueryFileTree'>" };
    FS.list(path).then(function(list) {
        return Tools.series(list, function(file) {
            return FS.stat(path + "/" + file).then(function(stat) {
                var a = `<a rel="${Tools.toHtml(dir + file)}">${Tools.toHtml(file)}</a>`;
                if (stat.isDirectory())
                    c.reply += `<li class="directory collapsed">${a}</li>`;
                else if (stat.isFile())
                    c.reply += `<li class="file ext_${file.split(".").pop() || ""}">${a}</li>`;
                return Promise.resolve();
            });
        });
    }).then(function() {
        c.reply += "</ul>";
        res.json({ html: c.reply });
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(req, res);
        else if ("ENOTDIR" == err.code)
            controller.error(req, res, Tools.translate("Not a directory"), true);
        else
            controller.error(req, res, err, true);
    });
});

router.get("/api/fileContent.json", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(req, res, Tools.translate("Not enough rights"), true);
    return FS.read(__dirname + "/../" + req.query.fileName).then(function(content) {
        res.json({ content: content });
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(req, res);
        else if ("EISDIR" == err.code)
            controller.error(req, res, Tools.translate("Not a file"), true);
        else
            controller.error(req, res, err, true);
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
