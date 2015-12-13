var FSSync = require("fs");

var Board = require("./board");
var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "js" != file.split(".").pop())
        return;
    Board.addBoard(require("./" + file.split(".").shift()));
});

Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

Board.addBoard(new Board("int", "/int/ernational",
    { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
Object.defineProperty(board, "supportedCaptchaEngines", {
    get: function() {
        return [Captcha.captcha("codecha").info()];
    }
});
Object.defineProperty(board, "markupElements", {
    value: [
        Board.MarkupElements.BoldMarkupElement,
        Board.MarkupElements.ItalicsMarkupElement,
        Board.MarkupElements.StrikedOutMarkupElement,
        Board.MarkupElements.UnderlinedMarkupElement,
        Board.MarkupElements.SpoilerMarkupElement,
        Board.MarkupElements.QuotationMarkupElement,
        Board.MarkupElements.CodeMarkupElement,
        Board.MarkupElements.SubscriptMarkupElement,
        Board.MarkupElements.SuperscriptMarkupElement,
        Board.MarkupElements.UrlMarkupElement
    ]
});
Board.addBoard(board);

Board.addBoard(new Board("rf", Tools.translate.noop("Refuge", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Whiner", "defaultUserName") }));

Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"),
    { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));

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
