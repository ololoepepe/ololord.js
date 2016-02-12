var FS = require("q-io/fs");
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

Object.defineProperty(module.exports, "Extensions", { value: Extensions });
Object.defineProperty(module.exports, "Paths", { value: Paths });
Object.defineProperty(module.exports, "Types", { value: Types });

var cleanup = function(type) {
    switch (type) {
    case Types.HTML:
    case Types.JSON:
    case Types.RSS:
        break;
    default:
        return Promise.resolve();
    }
    var path = Paths[type];
    return FS.list(path).then(function(fileNames) {
        return Tools.series(fileNames.filter(function(fileName) {
            return ".gitignore" != fileName;
        }).map(function(fileName) {
            return path + "/" + fileName;
        }), function(fileName) {
            return Tools.removeFile(fileName);
        });
    });
};

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

var path = function(type, id) {
    switch (type) {
    case Types.HTML:
    case Types.JSON:
    case Types.RSS:
        break;
    default:
        return Promise.resolve();
    }
    if (!id)
        return Paths[type];
    if (Util.isArray(id))
        id = id.join("-");
    return Paths[type] + "/" + id + "." + Extensions[type];
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

module.exports.cleanup = function() {
    return Tools.series(Types, function(type) {
        return cleanup(type);
    });
};

module.exports.cleanupHTML = function() {
    return cleanup(Types.HTML);
};

module.exports.cleanupJSON = function() {
    return cleanup(Types.JSON);
};

module.exports.cleanupRSS = function() {
    return cleanup(Types.RSS);
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

module.exports.pathHTML = function() {
    return path(Types.HTML, Array.prototype.slice.call(arguments, 0));
};

module.exports.pathJSON = function() {
    return path(Types.JSON, Array.prototype.slice.call(arguments, 0));
};

module.exports.pathRSS = function() {
    return path(Types.RSS, Array.prototype.slice.call(arguments, 0));
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

module.exports.setHTML = function(id, data) {
    return set(Types.HTML, id, data);
};

module.exports.setJSON = function(id, data) {
    return set(Types.JSON, id, data);
};

module.exports.setRSS = function(id, data) {
    return set(Types.RSS, id, data);
};
