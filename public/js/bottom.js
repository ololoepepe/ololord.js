/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.models = {};
lord.partials = {};
lord.templates = {};

/**/

(function() {
    var baseModelHtml = lord.get("misc/base.json") || "";
    ["base", "boards", "tr", "partials", "templates"].forEach(function(modelName) {
        var html = ("base" == modelName) ? baseModelHtml : lord.id("model-" + modelName).innerHTML;
        lord.models[modelName] = JSON.parse(html);
    });
    lord.model("partials").forEach(function(partialName) {
        var html = lord.id("partial-" + partialName).innerHTML;
        lord.partials[partialName] = html;
    });
    var templates = {};
    lord.model("templates").forEach(function(templateName) {
        var html = lord.id("template-" + templateName).innerHTML;
        templates[templateName] = html;
    });
    ["custom-footer", "custom-header"].forEach(function(templateName) {
        var html = lord.get("templates/" + templateName + ".jst");
        if (html)
            templates[templateName] = html;
    });
    lord.forIn(templates, function(html, templateName) {
        lord.templates[templateName] = doT.template(html, {
            evaluate: /\{\{([\s\S]+?)\}\}/g,
            interpolate: /\{\{=([\s\S]+?)\}\}/g,
            encode: /\{\{!([\s\S]+?)\}\}/g,
            use: /\{\{#([\s\S]+?)\}\}/g,
            define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
            conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
            iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
            varname: 'it',
            strip: false,
            append: true,
            selfcontained: false
        }, lord.partials);
    });
    var style = lord.getLocalObject("style", "photon");
    var codeStyle = lord.getLocalObject("codeStyle", "default");
    var styleHtml = "<link rel='stylesheet' type='text/css' href='/" + lord.models["base"].site.pathPrefix;
    document.open();
    document.write(styleHtml + "css/" + style +".css'>");
    if (lord.deviceType("desktop"))
        document.write("<style type='text/css'>input, select { font-size: 14.4px; }</style>");
    document.write(styleHtml + "css/3rdparty/highlight.js/" + codeStyle + ".css'>");
    document.write(styleHtml + "css/3rdparty/jquery-ui/" + style + "/jquery-ui.min.css'>");
    document.close();
    var path;
    var boardName;
    var pathname = window.location.pathname;
    var matchThread = pathname.match(/\/(([^\/])+\/(res|arch)\/\d+)\.html$/i);
    var matchCatalog = pathname.match(/\/(([^\/])+\/catalog)\.html$/i);
    var matchArchive = pathname.match(/\/(([^\/])+\/archive)\.html$/i);
    var matchPage = pathname.match(/\/(([^\/])+\/\d+)\.html$/i);
    var matchBoard = pathname.match(/\/([^\/\.]+)(\/)?$/i);
    if (matchThread) {
        path = matchThread[1] + ".json";
        boardName = matchThread[2];
    } else if (matchCatalog) {
        path = matchCatalog[1] + ".json" + (window.location.search || "?sort=date");
        boardName = matchCatalog[2];
    } else if (matchArchive) {
        path = matchArchive[1] + ".json";
        boardName = matchArchive[2];
    } else if (matchPage) {
        path = matchPage[1] + ".json";
        boardName = matchPage[2];
    } else if (matchBoard) {
        path = matchBoard[1] + "/0.json";
        boardName = matchBoard[1];
    }
    if (path) {
        try {
            var contentModel = JSON.parse(lord.get(path));
            var model = lord.model(["base", "tr", "boards", "board/" + boardName], true);
            model.settings = lord.settings();
            lord.appendExtrasToModel(model);
            var threads = contentModel.threads || [contentModel.thread];
            var html = "";
            threads.forEach(function(thread) {
                model.thread = thread;
                html += "<hr />";
                var templateName = (matchThread || matchBoard || matchPage) ? "thread"
                    : (matchArchive ? "archiveThread" : "catalogThread");
                html += lord.template(templateName, model, true);
            });
            lord._contentModel = contentModel;
            lord._contentHtml = html;
        } catch (err) {
            console.log(err);
        }
    }
})();
