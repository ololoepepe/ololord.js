var FS = require("fs");
var Handlebars = require("handlebars");
var Q = require("q");

var cache = require("./cache");
var promisify = require("./promisify.js");

var xif = function (v1, operator, v2, options) {
    switch (operator) {
    case "==":
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case "===":
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case "<":
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case "<=":
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case ">":
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case ">=":
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case "&&":
        return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case "||":
        return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
        return options.inverse(this);
    }
};

Handlebars.registerHelper("xif", xif);

Handlebars.registerHelper("xunless", function (v1, operator, v2, options) {
    return xif(v2, operator, v1, options);
});

var controller = function(templateName, modelData) {
    return cache.getp("template/" + templateName, "").then(function(template) {
        if (template)
            return promisify.proxy(template);
        return promisify(FS.readFile)(__dirname + "/../views/" + templateName + ".html", "UTF-8");
    }).then(function(data) {
        if (typeof data != "function")
            return promisify.proxy(Handlebars.compile(data));
        data.isInCache = true;
        return promisify.proxy(data);
    }).then(function(template) {
        if (!template.isInCache)
            cache.set("template/" + templateName, template);
        return promisify.proxy(template(modelData));
    }).catch(function(err) {
        console.log(err);
    });
};

module.exports = controller;
