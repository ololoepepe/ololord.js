var FSSync = require("fs");

var Board = require("./board");
var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

Board.addBoard(new Board("int", Tools.translate.noop("/int/ernational", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

var codecha = Captcha.captcha("codecha");
board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
Object.defineProperty(board, "supportedCaptchaEngines", {
    get: function() {
        return [{
            id: codecha.id,
            title: codecha.title
        }];
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

Board.addBoard(new Board("soc", Tools.translate.noop("Social life", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Life of the party", "defaultUserName") }));

Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"),
    { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file)
        return;
    Board.addBoard(require("./" + file.split(".").shift()));
});

module.exports = Board;
