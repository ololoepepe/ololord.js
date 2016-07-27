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
        return Promise.resolve({ "markup.html": controller("pages/markup", model) });
    });
};

module.exports = router;
