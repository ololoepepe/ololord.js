var FS = require("q-io/fs");

var configFileName = __dirname + "/../config.json";
var config = require(configFileName);

var setHooks = {};

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
    var hook = setHooks[key];
    if (hook)
        hook(value, key);
    FS.write(configFileName, JSON.stringify(config, null, 4));
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
    FS.write(configFileName, JSON.stringify(config, null, 4), "utf8");
    return prev;
};

c.setConfigFile = function(fileName) {
    configFileName = fileName;
    config = require(fileName);
    for (var key in setHooks) {
        if (!setHooks.hasOwnProperty(key))
            return;
        setHooks[key](c(key));
    }
};

c.installSetHook = function(key, hook) {
    setHooks[key] = hook;
};

module.exports = c;
