var FS = require("q-io/fs");

import * as Files from './files';

var rootPath = __dirname + "/../public";

module.exports.readFile = function(fileName) {
    return FS.read(rootPath + "/" + fileName);
};

module.exports.writeFile = function(fileName, data) {
    return Files.writeFile(rootPath + "/" + fileName, data);
};

module.exports.removeFile = function(fileName) {
    return FS.remove(rootPath + "/" + fileName);
};
