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
    var faqContentPlaceholder = lord.id("faqContentPlaceholder");
    if (faqContentPlaceholder) {
        var model = lord.model(["base", "tr", "boards"], true);
        model.settings = lord.settings();
        var data = lord.template("custom-faq", model);
        if (data)
            faqContentPlaceholder.parentNode.replaceChild(data, faqContentPlaceholder);
        setTimeout(function() {
            lord.hash(lord.hash());
        }, lord.Second);
    }
}, false);
