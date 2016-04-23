var express = require("express");

var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Highlight = require("highlight.js");
var Tools = require("../helpers/tools");

var langNames = require("../misc/lang-names.json");

var router = express.Router();

router.generateHTML = function() {
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
    translate("Supported languages", "supportedCodeLanguagesText");
    translate("Language name", "codeLanguageNameText");
    translate("Language ID", "codeLanguageIdText");
    translate("LaTeX code markup", "latexMarkup");
    translate("Block LaTeX", "latexText");
    translate("Inline LaTeX", "inlineLatexText");
    model.tr = tr;
    model.strikedoutTextWakaba = (new Array(tr.strikedoutText.length + 1)).join("^H");
    model.codeToMarkup = "static const int x = 0;";
    Highlight.configure({
        tabReplace: "    ",
        useBR: true
    });
    var result = Highlight.highlight("cpp", model.codeToMarkup, true);
    model.markedUpCode = "<div class=\"codeBlock cpp hljs\" title=\"C++\">" + Highlight.fixMarkup(result.value)
        + "</div>";
    model.langs = Highlight.listLanguages().map(function(lang) {
        return {
            id: lang,
            name: langNames[lang] || lang
        };
    });
    if (config("site.twitter.integrationEnabled", true))
        model.extraScripts = [ { fileName: "3rdparty/twitter.js" } ];
    model.latexToMarkup = "v=v_0+\\frac{at^2}{2}";
    model.inlineLatexToMarkup = "E=mc^2";
    return Tools.markupLatex(model.latexToMarkup).then(function(html) {
        model.markedUpLatex = html;
        return Tools.markupLatex(model.inlineLatexToMarkup, true);
    }).then(function(html) {
        model.markedUpInlineLatex = html;
        return controller("markup", model);
    }).then(function(data) {
        return Promise.resolve({ "markup.html": data });
    });
};

module.exports = router;
