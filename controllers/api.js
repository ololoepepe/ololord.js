var express = require("express");
var HTTP = require("q-io/http");
var URL = require("url");
var Util = require("util");

var Board = require("../boards");
var boardModel = require("../models/board");
var Captcha = require("../captchas");
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
        return board.renderPost(post, req, posts[0]);
    });
};

router.get("/posts.json", function(req, res) {
    var posts = postIdentifiers(req);
    boardModel.getPosts(posts, req.hashpass).then(function(posts) {
        var promises = posts.map(renderPost.bind(null, req));
        return Promise.all(promises);
    }).then(function(posts) {
        res.json(posts);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/post.json", function(req, res) {
    boardModel.getPosts(postIdentifiers(req, true), req.hashpass).then(function(posts) {
        return renderPost(req, posts[0]);
    }).then(function(post) {
        res.json(post || null);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/threadInfo.json", function(req, res) {
    var board = Board.board(req.query.boardName);
    var threadNumber = +req.query.threadNumber;
    boardModel.getThreadInfo(board, req.hashpass, threadNumber).then(function(thread) {
        res.json(thread);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/fileInfos.json", function(req, res) {
    var list = [];
    if (Util.isArray(req.query.fileNames)) {
        req.query.fileNames.forEach(function(fileName) {
            list.push({ fileName: fileName });
        });
    } else if (req.query.fileNames) {
        list.push({ fileName: req.query.fileNames });
    }
    if (Util.isArray(req.query.fileHashes)) {
        req.query.fileHashes.forEach(function(fileHashes) {
            list.push({ fileHash: fileHash });
        });
    } else if (req.query.fileHashes) {
        list.push({ fileHash: req.query.fileHashes });
    }
    boardModel.getFileInfos(list, req.hashpass).then(function(fileInfos) {
        res.json(fileInfos);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/fileInfo.json", function(req, res) {
    boardModel.getFileInfos([{
        fileName: req.query.fileName,
        fileHash: req.query.fileHash
    }], req.hashpass).then(function(fileInfos) {
        res.json(fileInfos[0]);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/lastPosts.json", function(req, res) {
    if (req.query.threads) {
        var threads = req.query.threads;
        if (Util.isString(threads))
            threads = [threads];
        var promises = threads.map(function(thread) {
            var board = Board.board(thread.split(":").shift());
            if (!board)
                return Promise.resolve(null);
            var threadNumber = +thread.split(":")[1];
            if (isNaN(threadNumber) || threadNumber <= 0)
                return Promise.resolve(null);
            var lastPostNumber = +thread.split(":").pop();
            return boardModel.getLastPosts(board, req.hashpass, threadNumber, lastPostNumber);
        });
        Promise.all(promises).then(function(results) {
            var promises = results.map(function(posts) {
                return Promise.all(posts.map(renderPost.bind(null, req)));
            });
            return Promise.all(promises);
        }).then(function(results) {
            res.json(results);
        }).catch(function(err) {
            controller.error(req, res, err, true);
        });
    } else {
        var board = Board.board(req.query.boardName);
        var threadNumber = +req.query.threadNumber;
        var lastPostNumber = +req.query.lastPostNumber;
        boardModel.getLastPosts(board, req.hashpass, threadNumber, lastPostNumber).then(function(posts) {
            var promises = posts.map(renderPost.bind(null, req));
            return Promise.all(promises);
        }).then(function(posts) {
            res.json(posts);
        }).catch(function(err) {
            controller.error(req, res, err, true);
        });
    }
});

router.get("/lastPostNumbers.json", function(req, res) {
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
        controller.error(req, res, err, true);
    });
});

router.get("/lastPostNumber.json", function(req, res) {
    boardModel.getLastPostNumbers([req.query.boardName]).then(function(lastPostNumbers) {
        res.json(lastPostNumbers[0]);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/captchaQuota.json", function(req, res) {
    Database.getUserCaptchaQuota(req.query.boardName, req.ip).then(function(quota) {
        res.json(quota);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/bannedUser.json", function(req, res) {
    Database.bannedUser(req.query.ip).then(function(user) {
        res.json(user);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/bannedUsers.json", function(req, res) {
    Database.bannedUsers().then(function(users) {
        res.json(users);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/coubVideoInfo.json", function(req, res) {
    var url = "https://coub.com/api/oembed.json?url=coub.com/view/" + (req.query.videoId || "");
    HTTP.request({
        url: url,
        timeout: Tools.Minute
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject("Failed to get Coub video info");
        return response.body.read();
    }).then(function(data) {
        try {
            res.json(JSON.parse(data.toString()));
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/fileHeaders.json", function(req, res) {
    if (!req.query.url)
        return controller.error(req, res, "Invalid url", true);
    var proxy = Tools.proxy();
    var url = URL.parse(req.query.url);
    var p;
    if (proxy && !/vk\.me$/i.test(url.hostname)) {
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
        console.log(req.query.url);
        console.log(response.status, response.headers);
        if (response.status != 200)
            return Promise.reject("Failed to get file headers");
        res.json(response.headers);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

Captcha.captchaIds().forEach(function(id) {
    Captcha.captcha(id).apiRoutes().forEach(function(route) {
        router[route.method](route.path, route.handler);
    });
});

Board.boardNames().forEach(function(name) {
    Board.board(name).apiRoutes().forEach(function(route) {
        router[route.method](route.path, route.handler);
    });
});

module.exports = router;
