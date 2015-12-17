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

var router = express.Router();

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
                Global.error(err.stack || err);
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
                    return Promise.reject(Tools.translate("Failed to download file"));
                return response.body.read();
            }).then(function(data) {
                c.size = data.length;
                if (c.size < 1)
                    return Promise.reject(Tools.translate("File is empty"));
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
            return Promise.reject(Tools.translate("Invalid board"));
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
        controller.error(res, err, true);
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
            return Promise.reject(Tools.translate("Invalid board"));
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
        controller.error(res, err, true);
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
            return Promise.reject(Tools.translate("Invalid board"));
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
        controller.error(res, err, true);
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
        controller.error(res, err, true);
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
            return Promise.reject(Tools.translate("Invalid board"));
        transaction.board = board;
        return controller.checkBan(req, res, c.board.name, true);
    }).then(function() {
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var fileCount = c.files.length;
        if (fileCount < 1)
            return Promise.reject(Tools.translate("No file specified"));
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
        controller.error(res, err, true);
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
        controller.error(res, err, true);
    });
});

router.post("/deleteFile", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.deleteFile(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
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
        controller.error(res, err, true);
    });
});

router.post("/editAudioTags", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.editAudioTags(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/banUser", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(res, Tools.translate("Not enough rights"), true);
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
            if (expiresAt) {
                var timeOffset = ("local" == req.settings.time) ? +req.settings.timeZoneOffset
                    : config("site.timeOffset", 0);
                var hours = Math.floor(timeOffset / 60);
                var minutes = Math.abs(timeOffset) % 60;
                var tz = ((timeOffset > 0) ? "+" : "") + ((Math.abs(hours) < 10) ? "0" : "") + hours + ":"
                    + ((minutes < 10) ? "0" : "") + minutes;
                expiresAt = moment(expiresAt + " " + tz, "YYYY/MM/DD HH:mm ZZ");
                if (+expiresAt < (+Tools.now() + Tools.Second))
                    expiresAt = null;
            } else {
                expiresAt = null;
            }
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
        controller.error(res, err, true);
    });
});

router.post("/delall", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return controller.checkBan(req, res, c.fields.boardName, true);
    }).then(function() {
        return Database.delall(req, c.fields);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
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
        controller.error(res, err, true);
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
        controller.error(res, err, true);
    });
});

router.post("/sendChatMessage", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.sendMessage(req, fields.boardName, +fields.postNumber, fields.text);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/deleteChatMessages", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.deleteMessages(req, fields.boardName, fields.postNumber);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/search", function(req, res) {
    var c = { model: {} };
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        c.query = fields.query || "";
        if (!c.query)
            return Promise.reject(Tools.translate("Search query is empty"));
        if (c.query.length > config("site.maxSearchQueryLength", 50))
            return Promise.reject(Tools.translate("Search query is too long"));
        var boardName = fields.boardName || "";
        if ("*" == boardName)
            boardName = "";
        c.model.searchQuery = c.query;
        c.model.searchBoard = boardName;
        c.phrases = Tools.splitCommand(c.query);
        if (!c.phrases || !c.phrases.command)
            return Promise.reject(Tools.translate("Invalid search query"));
        c.phrases = [c.phrases.command].concat(c.phrases.arguments);
        c.query = {
            requiredPhrases: [],
            excludedPhrases: [],
            possiblePhrases: []
        };
        c.phrases.forEach(function(phrase) {
            if (phrase.substr(0, 1) == "+")
                c.query.requiredPhrases.push(phrase.substr(1).toLowerCase());
            else if (phrase.substr(0, 1) == "-")
                c.query.excludedPhrases.push(phrase.substr(1).toLowerCase());
            else
                c.query.possiblePhrases.push(phrase.toLowerCase());
        });
        return Database.findPosts(c.query, boardName);
    }).then(function(posts) {
        c.model.searchResults = posts.map(function(post) {
            var text = post.rawText;
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300)
                text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100)
                subject = subject.substr(0, 97) + "...";
            c.query.requiredPhrases.concat(c.query.possiblePhrases).forEach(function(phrase) {
                var ind = text.toLowerCase().indexOf(phrase);
                while (ind >= 0) {
                    var nphrase = "<b><font color=\"red\">" + phrase + "</font></b>";
                    text = text.substr(0, ind) + nphrase + text.substr(ind + phrase.length);
                    ind = text.toLowerCase().indexOf(phrase, ind + nphrase.length);
                }
            });
            return {
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                subject: subject,
                text: text
            };
        });
        res.send(c.model);
    }).catch(function(err) {
        controller.error(res, err, true);
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

module.exports = router;
