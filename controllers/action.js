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
var Global = require("../helpers/global");
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
            if (!/^file_url_\S+$/.test(key))
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
        return tmpFiles.concat(fileInfos.map(function(fileInfo, i) {
            var fi = {
                name: fileInfo.name,
                thumbName: fileInfo.thumb.name,
                size: fileInfo.size,
                boardName: fileInfo.boardName,
                mimeType: fileInfo.mimeType,
                rating: fileInfo.rating,
                copy: true
            };
            setFileRating(fi, fields.fileHashes.split(",")[i]);
            return fi;
        }));
    });
};

var testParameters = function(fields, files, creatingThread) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(404);
    var email = fields.email || "";
    var name = fields.name || "";
    var subject = fields.subject || "";
    var text = fields.text || "";
    var password = fields.password || "";
    var fileCount = files.length;
    var maxFileSize = board.maxFileSize;
    var maxFileCount = board.maxFileCount;
    if (email.length > board.maxEmailLength)
        return Promise.reject(Tools.translate("E-mail is too long"));
    if (name.length > board.maxNameLength)
        return Promise.reject(Tools.translate("Name is too long"));
    if (subject.length > board.maxSubjectLength)
        return Promise.reject(Tools.translate("Subject is too long"));
    if (text.length > board.maxTextFieldLength)
        return Promise.reject(Tools.translate("Comment is too long"));
    if (password.length > board.maxPasswordLength)
        return Promise.reject(Tools.translate("Password is too long"));
    if (creatingThread && maxFileCount && !fileCount)
        return Promise.reject(Tools.translate("Attempt to create a thread without attaching a file"));
    if (text.length < 1 && !fileCount)
        return Promise.reject(Tools.translate("Both file and comment are missing"));
    if (fileCount > maxFileCount) {
        return Promise.reject(Tools.translate("Too many files"));
    } else {
        var err = files.reduce(function(err, file) {
            if (err)
                return err;
            if (file.size > maxFileSize)
                return Tools.translate("File is too big");
            if (board.supportedFileTypes.indexOf(file.mimeType) < 0)
                return Tools.translate("File type is not supported");
        }, "");
        if (err)
            return Promise.reject(err);
    }
    return Promise.resolve();
};

router.post("/action/markupText", function(req, res) {
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
            return Promise.reject(Tools.translate("Comment is too long"));
        var markupModes = [];
        Tools.forIn(markup.MarkupModes, function(val) {
            if (c.fields.markupMode && c.fields.markupMode.indexOf(val) >= 0)
                markupModes.push(val);
        });
        return markup(c.board.name, c.fields.text, {
            markupModes: markupModes,
            referencedPosts: {},
            accessLevel: req.level(c.board.name)
        });
    }).then(function(text) {
        var data = {
            boardName: c.board.name,
            text: text || null,
            rawText: c.fields.text || null,
            options: {
                signAsOp: ("true" == c.fields.signAsOp),
                showTripcode: !!req.hashpass && ("true" == c.fields.tripcode)
            },
            createdAt: date.toISOString()
        };
        if (req.hashpass && c.fields.tripcode)
            data.tripcode = Tools.generateTripcode(req.hashpass);
        res.send(data);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/createPost", function(req, res) {
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
        return testParameters(c.fields, c.files);
    }).then(function() {
        return c.board.testParameters(req, c.fields, c.files);
    }).then(function() {
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

router.post("/action/createThread", function(req, res) {
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
        return testParameters(c.fields, c.files, true);
    }).then(function() {
        return c.board.testParameters(req, c.fields, c.files, true);
    }).then(function() {
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

router.post("/action/editPost", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.editPost(req, c.fields);
    }).then(function(result) {
        res.send({
            boardName: c.boardName,
            postNumber: c.postNumber
        });
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/addFiles", function(req, res) {
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
            return Promise.reject(Tools.translate("Too many files"));
        } else {
            var err = c.files.reduce(function(err, file) {
                if (err)
                    return err;
                if (file.size > maxFileSize)
                    return Tools.translate("File is too big");
                if (c.board.supportedFileTypes.indexOf(file.mimeType) < 0)
                    return Tools.translate("File type is not supported");
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

router.post("/action/deletePost", function(req, res) {
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

router.post("/action/deleteFile", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.deleteFile(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/moveThread", function(req, res) {
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

router.post("/action/editAudioTags", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.editAudioTags(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/banUser", function(req, res) {
    if (!req.isModer())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.bans = [];
        c.fields = result.fields;
        c.userIp = result.fields.userIp;
        Tools.forIn(result.fields, function(value, name) {
            if (!/^banBoard_\S+$/.test(name))
                return;
            var level = result.fields["banLevel_" + value];
            if ("NONE" == level)
                return;
            var expiresAt = result.fields["banExpires_" + value];
            if (expiresAt) {
                var timeOffset = +c.fields.timeOffset;
                if (isNaN(timeOffset) || timeOffset < -720 || timeOffset > 840)
                    timeOffset = config("site.timeOffset", 0);
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
        return Database.banUser(req, c.fields.userIp, c.bans);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/delall", function(req, res) {
    if (!req.isModer())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardNames = Tools.toArray(Tools.filterIn(c.fields, function(boardName, key) {
            return /^board_\S+$/.test(key);
        }));
        if (c.boardNames.length < 1)
            return Promise.reject(Tools.translate("No board specified"));
        return controller.checkBan(req, res, c.boardNames, true);
    }).then(function() {
        return Database.delall(req, c.fields.userIp, c.boardNames);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

var getRegisteredUserData = function(fields) {
    var levels = {};
    var password = fields.password;
    var ips = Tools.ipList(fields.ips);
    if (typeof ips == "string")
        return Promise.reject(ips);
    Tools.forIn(fields, function(value, name) {
        if (!/^accessLevelBoard_\S+$/.test(name))
            return;
        var level = fields["accessLevel_" + value];
        if ("NONE" == level)
            return;
        levels[value] = level;
    });
    return Promise.resolve({
        password: password,
        levels: levels,
        ips: ips
    });
};

router.post("/action/registerUser", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        return getRegisteredUserData(result.fields);
    }).then(function(result) {
        return Database.registerUser(result.password, result.levels, result.ips);
    }).then(function(hashpass) {
        res.json({ hashpass: hashpass });
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/unregisterUser", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        return Database.unregisterUser(result.fields.hashpass);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/updateRegisteredUser", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        return getRegisteredUserData(result.fields);
    }).then(function(result) {
        return Database.updateRegisteredUser(result.password, result.levels, result.ips);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/setThreadFixed", function(req, res) {
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

router.post("/action/setThreadClosed", function(req, res) {
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

router.post("/action/setThreadUnbumpable", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return controller.checkBan(req, res, c.boardName, true);
    }).then(function() {
        return Database.setThreadUnbumpable(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/sendChatMessage", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.sendMessage(req, fields.boardName, +fields.postNumber, fields.text);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/deleteChatMessages", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.deleteMessages(req, fields.boardName, fields.postNumber);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/synchronize", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.key = result.fields.key;
        if (!c.key)
            return Promise.reject(Tools.translate("No key specified"));
        var data = result.fields.data;
        try {
            data = JSON.parse(data);
        } catch (err) {
            return Promise.reject(err);
        }
        return Database.db.set("synchronizationData:" + c.key, JSON.stringify(data));
    }).then(function() {
        return Database.db.expire("synchronizationData:" + c.key, 300); //NOTE: 5 minutes
    }).then(function() {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/search", function(req, res) {
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
        c.model.phrases = c.query.requiredPhrases.concat(c.query.excludedPhrases).concat(c.query.possiblePhrases);
        c.model.phrases = Tools.withoutDuplicates(c.model.phrases);
        return Database.findPosts(c.query, boardName);
    }).then(function(posts) {
        c.model.searchResults = posts.map(function(post) {
            var text = post.rawText || "";
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300)
                text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100)
                subject = subject.substr(0, 97) + "...";
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

router.post("/action/superuserAddFile", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        var dir = result.fields.dir;
        if (dir.slice(-1)[0] != "/")
            dir += "/";
        var path = __dirname + "/../" + dir + result.fields.fileName;
        var files = Tools.toArray(result.files);
        if ("true" == result.fields.isDir)
            return FS.makeDirectory(path);
        else if (files.length < 1)
            return FS.write(path, "");
        else
            return FS.move(files[0].path, path);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(res);
        else
            controller.error(res, err, true);
    });
});

router.post("/action/superuserEditFile", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return FS.write(path, result.fields.content);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(res);
        else
            controller.error(res, err, true);
    });
});

router.post("/action/superuserRenameFile", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        var oldPath = __dirname + "/../" + result.fields.oldFileName;
        var newPath = oldPath.split("/").slice(0, -1).join("/") + "/" + result.fields.fileName;
        return FS.rename(oldPath, newPath);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(res);
        else
            controller.error(res, err, true);
    });
});

router.post("/action/superuserDeleteFile", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Tools.parseForm(req).then(function(result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return FS.removeTree(path);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            controller.notFound(res);
        else
            controller.error(res, err, true);
    });
});

router.post("/action/superuserRegenerateCache", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Global.IPC.send("stop").then(function() {
        return Global.IPC.send("regenerateCache");
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/superuserRerenderPosts", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = { boardNames: [] };
    Tools.parseForm(req).then(function(result) {
        Tools.forIn(result.fields, function(value, name) {
            if (!/^board_\S+$/.test(name))
                return;
            c.boardNames.push(value);
        });
        if (c.boardNames.length < 1)
            c.boardNames = Board.boardNames();
        return Global.IPC.send("stop");
    }).then(function() {
        return Database.rerenderPosts(c.boardNames);
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/superuserRebuildSearchIndex", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    Global.IPC.send("stop").then(function() {
        return Database.rebuildSearchIndex();
    }).then(function() {
        return Global.IPC.send("start");
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/superuserReload", function(req, res) {
    if (!req.isSuperuser())
        return controller.error(res, Tools.translate("Not enough rights"), true);
    var c = { list: [] };
    Tools.parseForm(req).then(function(result) {
        if ("true" == result.fields.boards)
            c.list.push("boards");
        if ("true" == result.fields.config)
            c.list.push("config");
        if ("true" == result.fields.templates)
            c.list.push("templates");
        if (c.list.length < 1)
            return Promise.resolve();
        return Global.IPC.send("stop");
    }).then(function() {
        return Tools.series(c.list, function(action) {
            switch (action) {
            case "boards":
                Board.initialize();
                return Global.IPC.send("reloadBoards");
            case "config":
                config.reload();
                return Global.IPC.send("reloadConfig");
            case "controller":
                return controller.initialize();
            default:
                return Promise.resolve();
            }
        });
    }).then(function() {
        if (c.list.length < 1)
            return Promise.resolve();
        return Global.IPC.send("start");
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

Captcha.captchaIds().forEach(function(id) {
    Captcha.captcha(id).actionRoutes().forEach(function(route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

Board.boardNames().forEach(function(name) {
    Board.board(name).actionRoutes().forEach(function(route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

module.exports = router;
