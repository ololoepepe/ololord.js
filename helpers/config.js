var FS = require("q-io/fs");

var config = require("../config.json");

var c = function(key, def) {
    var parts = key.split(".");
    var o = config;
    while (parts.length > 0) {
        if (typeof o != "object")
            return def;
        o = o[parts.shift()];
    }
    return (undefined != o) ? o : def;
};

c.set = function(key, value) {
    var parts = key.split(".");
    var o = config;
    while (parts.length > 1) {
        if (typeof o != "object")
            return;
        var p = parts.shift();
        if (!o.hasOwnProperty(p))
            o[p] = {};
        o = o[p];
    }
    if (parts.length < 1 || typeof o != "object")
        return;
    var p = parts.shift();
    var prev = o[p];
    o[p] = value;
    FS.write(__dirname + "/../config.json", JSON.stringify(config, null, 4));
    return prev;
};

c.remove = function(key) {
    var parts = key.split(".");
    var o = config;
    while (parts.length > 1) {
        if (typeof o != "object")
            return;
        var p = parts.shift();
        if (!o.hasOwnProperty(p))
            o[p] = {};
        o = o[p];
    }
    if (parts.length < 1 || typeof o != "object")
        return;
    var p = parts.shift();
    var prev = o[p];
    delete o[p];
    FS.write(__dirname + "/../config.json", JSON.stringify(config, null, 4), "utf8");
    return prev;
};

module.exports = c;
