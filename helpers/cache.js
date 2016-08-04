"use strict";

var FS = require("q-io/fs");

var Tools = require("./tools");

var rootPath = __dirname + "/../public";

module.exports.readFile = function (fileName) {
    return FS.read(rootPath + "/" + fileName);
};

module.exports.writeFile = function (fileName, data) {
    return Tools.writeFile(rootPath + "/" + fileName, data);
};

module.exports.removeFile = function (fileName) {
    return FS.remove(rootPath + "/" + fileName);
};
//# sourceMappingURL=cache.js.map
