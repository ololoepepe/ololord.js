var Board = require("./board");
var Tools = require("../helpers/tools");

Board.addBoard(new Board("3dpd", Tools.translate.noop("3D pron", "boardTitle")));

Board.addBoard(new Board("a", Tools.translate.noop("/a/nime", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Kamina", "defaultUserName") }));

Board.addBoard(new Board("b", Tools.translate.noop("/b/rotherhood", "boardTitle")));

Board.addBoard(new Board("cg", Tools.translate.noop("Console games", "boardTitle")));

Board.addBoard(require("./d"));

Board.addBoard(require("./echo"));

Board.addBoard(new Board("h", Tools.translate.noop("/h/entai", "boardTitle")));

Board.addBoard(new Board("int", Tools.translate.noop("/int/ernational", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Vladimir Putin", "defaultUserName") }));

Board.addBoard(new Board("mlp", Tools.translate.noop("My Little Pony", "boardTitle")));

Board.addBoard(new Board("po", Tools.translate.noop("/po/litics", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Armchair warrior", "defaultUserName") }));

board = new Board("pr", Tools.translate.noop("/pr/ogramming", "boardTitle"));
Object.defineProperty(board, "supportedCaptchaEngines", { value: "codecha" });
board.extraScripts = function() {
    return [ { value: "var lord = lord || {}; lord.reloadCaptchaFunction = function() { lord.reloadPage(); };" } ];
};
Board.addBoard(board);

Board.addBoard(new Board("rf", Tools.translate.noop("Refuge", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Whiner", "defaultUserName") }));

//rpg

Board.addBoard(new Board("soc", Tools.translate.noop("Social life", "boardTitle"),
    { defaultUserName: Tools.translate.noop("Life of the party", "defaultUserName") }));

Board.addBoard(new Board("vg", Tools.translate.noop("Video games", "boardTitle"),
    { defaultUserName: Tools.translate.noop("PC Nobleman", "defaultUserName") }));

module.exports = Board;
