var express = require("express");

var controller = require("../helpers/controller");
var Highlight = require("highlight.js");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/markup.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("Markup", "pageTitle");
    var tr = {};
    var translate = function(sourceText, disambiguation) {
        tr[disambiguation] = Tools.translate(sourceText, disambiguation);
    };
    translate("Basic markup", "basicMarkup");
    translate("bold text", "boldText");
    translate("collapsible spoiler text", "cspoilerText");
    translate("collapsible spoiler title", "cspoilerTitle");
    translate("Code markup", "codeMarkup");
    translate("combined text", "combinedText");
    translate("double hyphen", "doubleHyphen");
    translate("em dash", "emDash");
    translate("en dash", "enDash");
    translate("italics", "italics");
    translate("Link markup", "linkMarkup");
    translate("first list item", "listItem1");
    translate("second list item", "listItem2");
    translate("third list item", "listItem3");
    translate("List markup", "listMarkup");
    translate("Link to a post on another board", "postBoardLinkDescription");
    translate("Link to a post on the same board", "postLinkDescription");
    translate("Preformatted\ntext", "preformattedText");
    translate("quadriple hyphen", "quadripleHyphen");
    translate("quotation", "quotation");
    translate("Auto replacement", "replacementMarkup");
    translate("monospace font", "monospace");
    translate("monospace \\`` font with escaped \\`` characters", "monospaceEscaped");
    translate("no markup", "nomarkup");
    translate("no markup \\'' with escaped \\'' characters", "nomarkupEscaped");
    translate("spoiler", "spoiler");
    translate("striked out text", "strikedoutText");
    translate("subscript", "subscriptText");
    translate("superscript", "superscriptText");
    translate("tooltip", "tooltip");
    translate("text with tooltip", "tooltipText");
    translate("striked out", "strikedoutWord1");
    translate("word", "strikedoutWord2");
    translate("underlined text", "underlinedText");
    model.tr = tr;
    model.strikedoutTextWakaba = (new Array(tr.strikedoutText.length + 1)).join("^H");
    model.codeToMarkup = "static const int x = 0;";
    Highlight.configure({
        tabReplace: "    ",
        useBR: true
    });
    var result = Highlight.highlight("cpp", model.codeToMarkup, true);
    model.markedUpCode = "<div class=\"codeBlock cpp hljs\">" + Highlight.fixMarkup(result.value) + "</div>";
    controller(req, "markup", model).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        res.send("Error: " + err);
        console.log(err.stack);
    });
});

module.exports = router;
