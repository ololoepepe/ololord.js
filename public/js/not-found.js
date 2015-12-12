(function() {
    var html = lord.get("templates/custom-faq.jst");
    if (!html)
        return;
    lord.templates["custom-faq"] = doT.template(html, {
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
})();

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var notFoundImageFileNames = JSON.parse(lord.id("model-notFoundImageFileNames").innerHTML);
    if (notFoundImageFileNames.length > 0) {
        var notFoundImagePlaceholder = lord.id("notFoundImagePlaceholder");
        var model = lord.model("base");
        model.imageFileName = notFoundImageFileNames[Math.floor(Math.random() * notFoundImageFileNames.length)];
        var banner = lord.template("notFoundImage", model);
        notFoundImagePlaceholder.parentNode.replaceChild(banner, notFoundImagePlaceholder);
    }
}, false);



