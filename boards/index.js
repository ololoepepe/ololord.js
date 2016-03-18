var FSSync = require("fs");
var Util = require("util");

var Board = require("./board");
var Captcha = require("../captchas");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "js" != file.split(".").pop())
        return;
    var board = require("./" + file.split(".").shift());
    if (Util.isArray(board)) {
        board.forEach(function(board) {
            Board.addBoard(board);
        });
    } else {
        Board.addBoard(board);
    }
});

if (config("board.useDefaultBoards", true)) {
    Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

    Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"),
        { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

    Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

    Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

    Board.addBoard(require("./templates/with-user-agents")("d",
        Tools.translate.noop("Board /d/iscussion", "boardTitle")));
    Board.addBoard(require("./templates/with-external-links")("echo",
        Tools.translate.noop("Boardsphere echo", "boardTitle")));

    Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

    Board.addBoard(new Board("int", "/int/ernational",
        { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

    Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

    Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"),
        { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

    board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
    board.defineProperty("supportedCaptchaEngines", function() {
        var ids = config("board.pr.supportedCaptchaEngines",
            config("board.supportedCaptchaEngines", ["codecha"]));
        if (!Util.isArray(ids))
            ids = [];
        return ids.map(function(id) {
            return Captcha.captcha(id).info();
        });
    });
    board.defineSetting("markupElements", board.markupElements.concat(Board.MarkupElements.CodeMarkupElement));
    Board.addBoard(board);

    Board.addBoard(new Board("rf", Tools.translate.noop("Refuge", "boardTitle"),
        { defaultUserName: Tools.translate.noop("Whiner", "defaultUserName") }));

    Board.addBoard(require("./templates/with-votings")("rpg",
        Tools.translate.noop("Role-playing games", "boardTitle")));
    Board.addBoard(require("./templates/with-likes")("soc", Tools.translate.noop("Social life", "boardTitle"),
        { defaultUserName: Tools.translate.noop("Life of the party", "defaultUserName") }));

    Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"),
        { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));
}

Board._banners = {};
Board.boardNames().forEach(function(boardName) {
    var path = __dirname + "/../public/img/banners/" + boardName;
    if (FSSync.existsSync(path)) {
        Board._banners[boardName] = FSSync.readdirSync(path).filter(function(fileName) {
            return ".gitignore" != fileName;
        });
    } else {
        Board._banners[boardName] = [];
    }
});

module.exports = Board;
