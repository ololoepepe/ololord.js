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
    var settings = lord.settings();
    document.open();
    if (lord.deviceType("mobile")) {
        document.write('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, '
            + 'user-scalable=no" />');
    }
    var prefix = lord.model("base").site.pathPrefix;
    document.write('<link rel="stylesheet" type="text/css" href="/' + prefix + 'css/' + lord.deviceType() + '.css">');
    document.write('<link rel="stylesheet" type="text/css" href="/' + prefix + 'css/' + settings.style.name
        + '.css">');
    document.close();
    lord.createStylesheetLink("3rdparty/highlight.js/" + settings.codeStyle.name + ".css", true);
    lord.createStylesheetLink("3rdparty/jquery-ui/" + settings.style.name + "/jquery-ui.min.css", true);
})();
