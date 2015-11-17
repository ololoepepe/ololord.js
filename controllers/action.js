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
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

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
            if (proxy) {
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

var setMarkupModeCookie = function(res, fields) {
    res.cookie("markupMode", fields.markupMode, {
        expires: Tools.forever(),
        path: "/"
    });
};

router.post("/createPost", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!board)
            return Promise.reject("Invalid board");
        transaction.board = board;
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files) || c.board.testParameters(c.fields, c.files);
        if (testResult)
            return Promise.reject(testResult.error);
        return Database.createPost(req, c.fields, c.files, transaction);
    }).then(function(post) {
        setMarkupModeCookie(res, c.fields);
        if (req.ascetic) {
            res.redirect("/" + config("site.pathPrefix", "")
                + `${c.board.name}/res/${post.threadNumber}#${post.number}`);
        } else {
            res.send({
                boardName: post.boardName,
                postNumber: post.number
            });
        }
    }).catch(function(err) {
        transaction.rollback();
        setMarkupModeCookie(res, c.fields);
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/createThread", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!board)
            return Promise.reject("Invalid board");
        transaction.board = board;
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files, true) || c.board.testParameters(c.fields, c.files, true);
        if (testResult)
            return Promise.reject(testResult.error);
        return Database.createThread(req, c.fields, c.files, transaction);
    }).then(function(thread) {
        setMarkupModeCookie(res, c.fields);
        if (req.ascetic) {
            res.redirect("/" + config("site.pathPrefix", "") + `${c.board.name}/res/${thread.number}`);
        } else {
            res.send({
                boardName: thread.boardName,
                threadNumber: thread.number
            });
        }
    }).catch(function(err) {
        transaction.rollback();
        setMarkupModeCookie(res, c.fields);
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/editPost", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        return Database.editPost(req, result.fields);
    }).then(function(result) {
        if (req.ascetic) {
            res.redirect("/" + config("site.pathPrefix", "")
                + `editPost.html?boardName=${c.boardName}&postNumber=${c.postNumber}`);
        } else {
            res.send({});
        }
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
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
        if (req.ascetic) {
            res.redirect("/" + config("site.pathPrefix", "")
                + `${c.board.name}/res/${result.threadNumber}#${result.postNumber}`);
        } else {
            res.send({
                boardName: result.boardName,
                postNumber: result.postNumber,
                threadNumber: result.threadNumber
            });
        }
    }).catch(function(err) {
        transaction.rollback();
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/deletePost", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.deletePost(req, result.fields);
    }).then(function(result) {
        if (req.ascetic) {
            var path = result.boardName;
            if (result.threadNumber)
                path += "/res/" + result.threadNumber + ".html";
            res.redirect("/" + config("site.pathPrefix", "") + path);
        } else {
            res.send({});
        }
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/deleteFile", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.deleteFile(req, result.fields);
    }).then(function(result) {
        if (req.ascetic) {
            var path = result.boardName + "/res/" + result.threadNumber + ".html";
            if (result.threadNumber != result.postNumber)
                path += "#" + result.postNumber;
            res.redirect("/" + config("site.pathPrefix", "") + path);
        } else {
            res.send({});
        }
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/editAudioTags", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Database.editAudioTags(req, result.fields);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/banUser", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights", !req.ascetic);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        var bans = [];
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
            bans.push({
                boardName: value,
                expiresAt: +expiresAt ? expiresAt : null,
                level: level,
                reason: result.fields["banReason_" + value],
                postNumber: +result.fields["banPostNumber_" + value] || null
            });
        });
        return Database.banUser(req, result.fields.userIp, bans);
    }).then(function(result) {
        if (req.ascetic) {
            res.redirect("/" + config("site.pathPrefix", "")
                + `banUser.html?boardName=${c.boardName}&postNumber=${c.postNumber}&userIp=${c.userIp}`);
        } else {
            res.send({});
        }
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/delall", function(req, res) {
    if (Database.compareRegisteredUserLevels(req.level, "MODER") < 0)
        return controller.error(req, res, "Not enough rights", !req.ascetic);
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return Database.delall(req, result.fields);
    }).then(function(result) {
        if (req.ascetic) {
            var path = "/" + config("site.pathPrefix", "");
            if (c.fields.boardName != "*")
                path += c.fields.boardName;
            res.redirect(path);
        } else {
            res.send({});
        }
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/changeSettings", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        var textCookies = ["mode", "style", "codeStyle", "stickyToolbar", "shrinkPosts", "markupMode", "time",
            "timeZoneOffset", "captchaEngine", "maxAllowedRating", "draftsByDefault", "hidePostformRules",
            "minimalisticPostform"];
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
        res.redirect("/" + config("site.pathPrefix", "") + "settings.html");
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/setThreadFixed", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return Database.setThreadFixed(req, result.fields);
    }).then(function(result) {
        if (req.ascetic)
            res.redirect("/" + config("site.pathPrefix", "") + `${c.boardName}/res/${c.threadNumber}.html`);
        else
            res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
    });
});

router.post("/setThreadClosed", function(req, res) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return Database.setThreadClosed(req, result.fields);
    }).then(function(result) {
        if (req.ascetic)
            res.redirect("/" + config("site.pathPrefix", "") + `${c.boardName}/res/${c.threadNumber}.html`);
        else
            res.send({});
    }).catch(function(err) {
        controller.error(req, res, err, !req.ascetic);
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
