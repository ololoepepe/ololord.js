var Util = require("util");

var config = require("./config");
var Tools = require("./tools");

var basePath = config("system.tmpPath", __dirname + "/../tmp");

var Extensions = {};
var Paths = {};
var Types = {};

Extensions["HTML"] = "html";
Extensions["JSON"] = "json";
Extensions["RSS"] = "xml";

Paths["HTML"] = basePath + "/cache-html";
Paths["JSON"] = basePath + "/cache-json";
Paths["RSS"] = basePath + "/cache-rss";

Types["HTML"] = "HTML";
Types["JSON"] = "JSON";
Types["RSS"] = "RSS";

var get = function(type, id, ifModifiedSince) {
    switch (type) {
    case Types.HTML:
    case Types.JSON:
    case Types.RSS:
        break;
    default:
        return Promise.resolve();
    }
    if (ifModifiedSince && !Util.isDate(ifModifiedSince))
        ifModifiedSince = new Date(ifModifiedSince);
    return Tools.readFile(Paths[type] + "/" + id + "." + Extensions[type], ifModifiedSince);
};

var remove = function(type, id) {
    switch (type) {
    case Types.HTML:
    case Types.JSON:
    case Types.RSS:
        break;
    default:
        return Promise.resolve();
    }
    return Tools.removeFile(Paths[type] + "/" + id + "." + Extensions[type]);
};

var set = function(type, id, data) {
    switch (type) {
    case Types.HTML:
    case Types.JSON:
    case Types.RSS:
        break;
    default:
        return Promise.resolve();
    }
    return Tools.writeFile(Paths[type] + "/" + id + "." + Extensions[type], data);
};

module.exports.getHTML = function(id, ifModifiedSince) {
    return get(Types.HTML, id, ifModifiedSince);
};

module.exports.getJSON = function(id, ifModifiedSince) {
    return get(Types.JSON, id, ifModifiedSince);
};

module.exports.getRSS = function(id, ifModifiedSince) {
    return get(Types.RSS, id, ifModifiedSince);
};

module.exports.setHTML = function(id, data) {
    return set(Types.HTML, id, data);
};

module.exports.setJSON = function(id, data) {
    return set(Types.JSON, id, data);
};

module.exports.setRSS = function(id, data) {
    return set(Types.RSS, id, data);
};

module.exports.removeHTML = function(id) {
    return remove(Types.HTML, id);
};

module.exports.removeJSON = function(id) {
    return remove(Types.JSON, id);
};

module.exports.removeRSS = function(id) {
    return remove(Types.RSS, id);
};
