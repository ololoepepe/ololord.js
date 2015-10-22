var BodyParser = require("body-parser");
var Crypto = require("crypto");
var express = require("express");
var Formidable = require("formidable");
var Mime = require("mime");
var promisify = require("promisify-node");

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

var filesToArray = function(files) {
    var tmpFiles = [];
    Tools.forIn(files, function(file, fieldName) {
        if (file.size < 1)
            return;
        file.fieldName = fieldName;
        tmpFiles.push(file);
    });
    return tmpFiles;
};

var testParameters = function(fields, files, creatingThread) {
    var board = Board.board(fields.board);
    if (!board)
        return { error: Tools.translate("No such board") };
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
        return { error: Tools.translate("E-mail is too long") };
    if (name.length > board.maxNameFieldLength)
        return { error: Tools.translate("Name is too long") };
    if (subject.length > board.maxSubjectFieldLength)
        return { error: Tools.translate("Subject is too long") };
    if (text.length > board.maxTextFieldLength)
        return { error: Tools.translate("Comment is too long") };
    if (password.length > board.maxPasswordFieldLength)
        return { error: Tools.translate("Password is too long") };
    if (creatingThread && maxFileCount && !fileCount)
        return { error: Tools.translate("Attempt to create a thread without attaching a file") };
    if (text.length < 1 && !fileCount)
        return { error: Tools.translate("Both file and comment are missing") };
    if (fileCount > maxFileCount) {
        return { error: Tools.translate("Too many files") };
    } else {
        var err = files.reduce(function(err, file) {
            if (err)
                return err;
            if (file.size > maxFileSize)
                return Tools.translate("File is too big");
            if (board.supportedFileTypes.indexOf(Mime.lookup(file.path)) < 0)
                return Tools.translate("File type is not supported");
        }, "");
        if (err)
            return { error: err };
    }
    //NOTE: Yep, return nothing
};

router.post("/createPost", function(req, res) {
    var form = new Formidable.IncomingForm();
    form.uploadDir = __dirname + "/../tmp";
    form.parse(req, function(err, fields, files) {
        files = filesToArray(files);
        var testResult = testParameters(fields, files);
        if (testResult) {
            res.send({ errorMessage: testResult.error });
            return;
        }
        Database.createPost(req, fields, files).then(function() {
            //
        });
    });
});

router.post("/createThread", function(req, res) {
    var form = new Formidable.IncomingForm();
    form.uploadDir = __dirname + "/../tmp";
    form.parse(req, function(err, fields, files) {
        files = filesToArray(files);
        console.time("posting");
        var testResult = testParameters(fields, files);
        if (testResult) {
            res.send({ errorMessage: testResult.error });
            return;
        }
        Database.createThread(req, fields, files).then(function() {
            //
            console.timeEnd("posting");
        }).catch(function(err) {
            console.log(err);
        });
    });
});

rootRouter.use(router);

module.exports = rootRouter;
