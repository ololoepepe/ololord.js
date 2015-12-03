var BodyParser = require("body-parser");
var Crypto = require("crypto");
var express = require("express");
var FS = require("q-io/fs");
var FSSync = require("fs");
var HTTP = require("q-io/http");
var moment = require("moment");
var UUID = require("uuid");

var Board = require("../boards");
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var markup = require("../helpers/markup");
var Tools = require("../helpers/tools");
var vk = require("../helpers/vk")(config("site.vkontakte.accessToken", ""));

var rootRouter = express.Router();

var router = express.Router();

router.use(BodyParser.urlencoded({ extended: false }));

router.post("/login", function(req, res) {
    var hashpass = req.body.hashpass;
    if (typeof hashpass != "string")
        hashpass = "";
    if (hashpass && !hashpass.match(/^([0-9a-fA-F]{40})$/)) {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(hashpass);
        hashpass = sha1.digest("hex");
    }
    res.cookie("hashpass", hashpass, {
        expires: Tools.forever(),
        path: "/"
    });
    res.redirect(req.body.source || ("/" + config("site.pathPrefix", "")));
});

router.post("/redirect", function(req, res) {
    res.redirect(req.body.url || ("/" + config("site.pathPrefix", "")));
});

router.post("/logout", function(req, res) {
    res.cookie("hashpass", "", {
        expires: Tools.forever(),
        path: "/"
    });
    res.redirect(req.body.source || ("/" + config("site.pathPrefix", "")));
});

rootRouter.use(router);

router = express.Router();

var getFiles = function(fields, files, transaction) {
    var setFileRating = function(file, id) {
        file.rating = "SFW";
        var r = fields["file_" + id + "_rating"];
        if (["R-15", "R-18", "R-18G"].indexOf(r) >= 0)
            file.rating = r;
    };
    var tmpFiles = Tools.filterIn(files, function(file) {
        if (file.size < 1) {
            FS.remove(file.path).catch(function(err) {
                console.log(err.stack);
            });
            return false;
        }
        return true;
    });
    var promises = Tools.mapIn(tmpFiles, function(file, fieldName) {
        file.fieldName = fieldName;
        setFileRating(file, file.fieldName.substr(5));
        transaction.filePaths.push(file.path);
        return Tools.mimeType(file.path).then(function(mimeType) {
            file.mimeType = mimeType;
            return Promise.resolve(file);
        });
    });
    return Promise.all(promises).then(function(files) {
        tmpFiles = files;
        var urls = [];
        Tools.forIn(fields, function(url, key) {
            if (key.substr(0, 9) != "file_url_")
                return;
            urls.push({
                url: url,
                formFieldName: key
            });
        });
        promises = urls.map(function(url) {
            var path = __dirname + "/../tmp/upload_" + UUID.v1();
            transaction.filePaths.push(path);
            var c = {};
            var proxy = Tools.proxy();
            var p;
            if (url.url.replace("vk://", "") != url.url) {
                p = vk("audio.getById", {audios: url.url.split("/")[2]}).then(function(result) {
                    return HTTP.request({
                        url: result.response[0].url,
                        timeout: Tools.Minute
                    });
                });
            } else if (proxy) {
                p = HTTP.request({
                    host: proxy.host,
                    port: proxy.port,
                    headers: { "Proxy-Authorization": proxy.auth },
                    path: url.url,
                    timeout: Tools.Minute
                });
            } else {
                p = HTTP.request({
                    url: url.url,
                    timeout: Tools.Minute
                });
            }
            return p.then(function(response) {
                if (response.status != 200)
                    return Promise.reject("Failed to download file");
                return response.body.read();
            }).then(function(data) {
                c.size = data.length;
                if (c.size < 1)
                    return Promise.reject("File is empty");
                return FS.write(path, data);
            }).then(function() {
                c.file = {
                    name: url.url.split("/").pop(),
                    size: c.size,
                    path: path
                };
                setFileRating(c.file, url.formFieldName.substr(9));
                return Tools.mimeType(path);
            }).then(function(mimeType) {
                c.file.mimeType = mimeType;
                return Promise.resolve(c.file);
            });
        });
        return Promise.all(promises);
    }).then(function(downloadedFiles) {
        tmpFiles = tmpFiles.concat(downloadedFiles);
        var hashes = fields.fileHashes ? fields.fileHashes.split(",") : [];
        return Database.getFileInfosByHashes(hashes);
    }).then(function(fileInfos) {
        return tmpFiles.concat(fileInfos.map(function(fileInfo) {
            return {
                name: fileInfo.name,
                thumbName: fileInfo.thumb.name,
                size: fileInfo.size,
                boardName: fileInfo.boardName,
                mimeType: fileInfo.mimeType,
                rating: fileInfo.rating,
                copy: true
            };
        }));
    });
};

var testParameters = function(fields, files, creatingThread) {
    var board = Board.board(fields.boardName);
    if (!board)
        return { error: 404 };
    var email = fields.email || "";
    var name = fields.name || "";
    var subject = fields.subject || "";
    var text = fields.text || "";
    var password = fields.password || "";
    var fileCount = files.length;
    var maxFileSize = board.maxFileSize;
    var maxFileCount = board.maxFileCount;
    if (email.length > board.maxEmailLength)
        return { error: Tools.translate("E-mail is too long", "error") };
    if (name.length > board.maxNameLength)
        return { error: Tools.translate("Name is too long", "error") };
    if (subject.length > board.maxSubjectLength)
        return { error: Tools.translate("Subject is too long", "error") };
    if (text.length > board.maxTextFieldLength)
        return { error: Tools.translate("Comment is too long", "error") };
    if (password.length > board.maxPasswordLength)
        return { error: Tools.translate("Password is too long", "error") };
    if (creatingThread && maxFileCount && !fileCount)
        return { error: Tools.translate("Attempt to create a thread without attaching a file", "error") };
    if (text.length < 1 && !fileCount)
        return { error: Tools.translate("Both file and comment are missing", "error") };
    if (fileCount > maxFileCount) {
        return { error: Tools.translate("Too many files", "error") };
    } else {
        var err = files.reduce(function(err, file) {
            if (err)
                return err;
            if (file.size > maxFileSize)
                return Tools.translate("File is too big", "error");
            if (board.supportedFileTypes.indexOf(file.mimeType) < 0)
                return Tools.translate("File type is not supported", "error");
        }, "");
        if (err)
            return { error: err };
    }
    //NOTE: Yep, return nothing
};

router.post("/markupText", function(req, res) {
    var c = {};
    var date = Tools.now();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.board = Board.board(c.fields.boardName);
        if (!c.board)
            return Promise.reject("Invalid board");
        return controller.checkBan(req, res, c.board.name, true);
    }).then(function() {
        if (c.fields.text.length > c.board.maxTextFieldLength)
            return Promise.reject(Tools.translate("Comment is too long", "error"));
        var markupModes = [];
        Tools.forIn(markup.MarkupModes, function(val) {
            if (c.fields.markupMode && c.fields.markupMode.indexOf(val) >= 0)
                markupModes.push(val);
        });
        c.isRaw = !!c.fields.raw
            && Database.compareRegisteredUserLevels(req.level, Database.RegisteredUserLevels.Admin) >= 0;
        if (c.isRaw)
            return c.fields.text;
        return markup(c.board.name, c.fields.text, {
            markupModes: markupModes,
            referencedPosts: {}
        });
    }).then(function(text) {
        var data = {
            boardName: c.board.name,
            text: text || null,
            rawText: c.fields.text || null,
            options: {
                rawHtml: c.isRaw,
                signAsOp: !!c.fields.signAsOp,
                showTripcode: !!req.hashpass && !!c.fields.tripcode
            },
            createdAt: date.toISOString()
        };
        if (req.hashpass && c.fields.tripcode) {
            var md5 = Crypto.createHash("md5");
            md5.update(req.hashpass + config("site.tripcodeSalt", ""));
            data.tripcode = "!" + md5.digest("base64").substr(0, 10);
        }
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/createPost", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!c.board)
            return Promise.reject("Invalid board");
        transaction.board = c.board;
        return controller.checkBan(req, res, c.board.name, true);
    }).then(function() {
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files) || c.board.testParameters(c.fields, c.files);
        if (testResult)
            return Promise.reject(testResult.error);
        return Database.createPost(req, c.fields, c.files, transaction);
    }).then(function(post) {
        res.send({
            boardName: post.boardName,
            postNumber: post.number
        });
    }).catch(function(err) {
        transaction.rollback();
        controller.error(req, res, err, true);
    });
});

router.post("/createThread", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!c.board)
            return Promise.reject("Invalid board");
        transaction.board = c.board;
        return controller.checkBan(req, res, c.board.name, true);
    }).then(function() {
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files, true) || c.board.testParameters(c.fields, c.files, true);
        if (testResult)
            return Promise.reject(testResult.error);
        return Database.createThread(req, c.fields, c.files, transaction);
    }).then(function(thread) {
        res.send({
            boardName: thread.boardName,
            threadNumber: thread.number
        });
    }).catch(function(err) {
        transaction.rollback();
        controller.error(req, res, err, true);
    });
});

router.post("/editPost", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.editPost(req, c.fields);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/addFiles", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!board)
            return Promise.reject("Invalid board");
        transaction.board = board;
        return controller.checkBan(req, res, c.board.name, true);
    }).then(function() {
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var fileCount = c.files.length;
        if (fileCount < 1)
            return Promise.reject("No file specified");
        var maxFileSize = c.board.maxFileSize;
        var maxFileCount = c.board.maxFileCount;
        if (fileCount > maxFileCount) {
            return Promise.reject(Tools.translate("Too many files", "error"));
        } else {
            var err = c.files.reduce(function(err, file) {
                if (err)
                    return err;
                if (file.size > maxFileSize)
                    return Tools.translate("File is too big", "error");
                if (c.board.supportedFileTypes.indexOf(file.mimeType) < 0)
                    return Tools.translate("File type is not supported", "error");
            }, "");
            if (err)
                return Promise.reject(err);
        }
        return Database.addFiles(req, c.fields, c.files, transaction);
    }).then(function(result) {
        res.send({
            boardName: result.boardName,
            postNumber: result.postNumber,
            threadNumber: result.threadNumber
        });
    }).catch(function(err) {
        transaction.rollback();
        controller.error(req, res, err, true);
    });
});

router.post("/deletePost", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return controller.checkBan(req, res, c.fields.boardName, true);
    }).then(function() {
        return Database.deletePost(req, res, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/deleteFile", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.deleteFile(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/moveThread", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return controller.checkBan(req, res, c.fields.boardName, true);
    }).then(function() {
        return controller.checkBan(req, res, c.fields.targetBoardName, true);
    }).then(function() {
        return Database.moveThread(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/editAudioTags", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.editAudioTags(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/banUser", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights", true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.bans = [];
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        c.userIp = result.fields.userIp;
        Tools.forIn(result.fields, function(value, name) {
            if (name.substr(0, 9) != "banBoard_")
                return;
            var level = result.fields["banLevel_" + value];
            if ("NONE" == level)
                return;
            var expiresAt = result.fields["banExpires_" + value];
            expiresAt = expiresAt? moment(expiresAt, "DD.MM.YYYY:HH") : null;
            c.bans.push({
                boardName: value,
                expiresAt: +expiresAt ? expiresAt : null,
                level: level,
                reason: result.fields["banReason_" + value],
                postNumber: +result.fields["banPostNumber_" + value] || null
            });
        });
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.banUser(req, c.fields.userIp, c.bans);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/delall", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights", true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return controller.checkBan(req, res, c.fields.boardName, true);
    }).then(function() {
        return Database.delall(req, c.fields);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/changeSettings", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var textCookies = ["mode", "style", "codeStyle", "stickyToolbar", "shrinkPosts", "markupMode", "time",
            "timeZoneOffset", "captchaEngine", "maxAllowedRating", "hidePostformRules", "minimalisticPostform"];
        var hiddenBoards = [];
        Tools.forIn(result.fields, function(value, name) {
            if (name.substr(0, 6) == "board_") {
                hiddenBoards.push(name.substr(6));
            } else if (textCookies.indexOf(name) >= 0) {
                res.cookie(name, value, {
                    expires: Tools.forever(),
                    path: "/"
                });
            }
        });
        res.cookie("hiddenBoards", hiddenBoards.join("|"), {
            expires: Tools.forever(),
            path: "/"
        });
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/setThreadFixed", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.setThreadFixed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/setThreadClosed", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.setThreadClosed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/sendChatMessage", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.sendMessage(req, fields.boardName, +fields.postNumber, fields.text);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.post("/deleteChatMessages", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.deleteMessages(req, fields.boardName, fields.postNumber);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

Captcha.captchaIds().forEach(function(id) {
    Captcha.captcha(id).actionRoutes().forEach(function(route) {
        router[route.method](route.path, route.handler);
    });
});

Board.boardNames().forEach(function(name) {
    Board.board(name).actionRoutes().forEach(function(route) {
        router[route.method](route.path, route.handler);
    });
});

rootRouter.use(router);

module.exports = rootRouter;
