var BodyParser = require("body-parser");
var Crypto = require("crypto");
var express = require("express");
var Formidable = require("formidable");
var FSSync = require("fs");
var HTTP = require("http");
var promisify = require("promisify-node");
var UUID = require("uuid");

var Board = require("../boards");
var config = require("../helpers/config");
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
    var date = Tools.now();
    date.setTime(date.getTime() + Tools.Billion * 1000);
    res.cookie("hashpass", hashpass, {
        expires: date,
        path: "/"
    });
    res.redirect(req.body.source || ("/" + config("site.pathPrefix", "")));
});

router.post("/logout", function(req, res) {
    var date = Tools.now();
    date.setTime(date.getTime() + Tools.Billion * 1000);
    res.cookie("hashpass", "", {
        expires: date,
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
    var tmpFiles = [];
    Tools.forIn(files, function(file, fieldName) {
        if (file.size < 1)
            return FSSync.unlink(file.path);
        file.fieldName = fieldName;
        file.mimeType = Tools.mimeType(file.path);
        setFileRating(file, file.fieldName.substr(5));
        tmpFiles.push(file);
        transaction.filePaths.push(file.path);
    });
    var urls = [];
    Tools.forIn(fields, function(url, key) {
        if (key.substr(0, 9) != "file_url_")
            return;
        urls.push({
            url: url,
            formFieldName: key
        });
    });
    var promises = urls.map(function(url) {
        var path = __dirname + "/../tmp/upload_" + UUID.v1();
        var ws = FSSync.createWriteStream(path);
        transaction.filePaths.push(path);
        return new Promise(function(resolve, reject) {
            HTTP.get(url.url, function(response) {
                response.pipe(ws);
                ws.on("finish", function() {
                    ws.close(function() {
                        var file = {
                            name: url.url.split("/").pop(),
                            size: FSSync.statSync(path).size,
                            path: path,
                            mimeType: Tools.mimeType(path)
                        };
                        setFileRating(file, url.formFieldName.substr(9));
                        resolve(file);
                    });
                });
            }).on("error", function(err) {
                FSSync.unlink(path);
                reject(err);
            });
        });
    });
    return Promise.all(promises).then(function(downloadedFiles) {
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
    var board = Board.board(fields.board);
    if (!board)
        return { error: Tools.translate("No such board", "error") };
    var email = fields.email || "";
    var name = fields.name || "";
    var subject = fields.subject || "";
    var text = fields.text || "";
    var password = fields.password || "";
    var fileHashes = fields.fileHashes ? fields.fileHashes.split(",") : [];
    var fileCount = files.length + fileHashes.length;
    var maxFileSize = board.maxFileSize;
    var maxFileCount = board.maxFileCount;
    if (email.length > board.maxEmailFieldLength)
        return { error: Tools.translate("E-mail is too long", "error") };
    if (name.length > board.maxNameFieldLength)
        return { error: Tools.translate("Name is too long", "error") };
    if (subject.length > board.maxSubjectFieldLength)
        return { error: Tools.translate("Subject is too long", "error") };
    if (text.length > board.maxTextFieldLength)
        return { error: Tools.translate("Comment is too long", "error") };
    if (password.length > board.maxPasswordFieldLength)
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

var parseForm = function(req) {
    var form = new Formidable.IncomingForm();
    form.uploadDir = __dirname + "/../tmp";
    form.hash = "sha1";
    return new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    fields: fields,
                    files: files
                });
            }
        });
    });
};

router.post("/createPost", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.board);
        if (!board)
            return Promise.reject("Invalid board");
        transaction.board = c.fields.board;
        console.time("posting");
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files) || c.board.testParameters(c.fields, c.files);
        if (testResult) {
            res.send({ errorMessage: testResult.error });
            return;
        }
        return Database.createPost(req, c.fields, c.files, transaction);
    }).then(function(post) {
        console.timeEnd("posting");
        res.send(post);
    }).catch(function(err) {
        console.log(err);
        transaction.rollback();
        res.send(err);
    });
});

router.post("/createThread", function(req, res) {
    var c = {};
    var transaction = new Database.Transaction();
    parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.board);
        if (!board)
            return Promise.reject("Invalid board");
        transaction.board = c.fields.board;
        console.time("posting");
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var testResult = testParameters(c.fields, c.files, true) || c.board.testParameters(c.fields, c.files, true);
        if (testResult) {
            res.send({ errorMessage: testResult.error });
            return;
        }
        return Database.createThread(req, c.fields, c.files, transaction);
    }).then(function(thread) {
        console.timeEnd("posting");
        res.send(thread);
    }).catch(function(err) {
        console.log(err);
        transaction.rollback();
        res.send(err);
    });
});

rootRouter.use(router);

module.exports = rootRouter;
