var FS = require("q-io/fs");

var rootPath = __dirname + "/../public";

module.exports.readFile = function(fileName) {
    return FS.read(rootPath + "/" + fileName);
};

module.exports.writeFile = function(fileName, data) {
    var filePath = rootPath + "/" + fileName;
    var tmpFilePath = filePath + ".tmp";
    var path = filePath.split("/").slice(0, -1).join("/");
    return FS.exists(path).then(function(exists) {
        if (exists)
            return Promise.resolve();
        return FS.makeTree(path);
    }).then(function() {
        return FS.write(tmpFilePath, data);
    }).then(function() {
        return FS.rename(tmpFilePath, filePath);
    });
};

module.exports.removeFile = function(fileName) {
    return FS.remove(rootPath + "/" + fileName);
};
