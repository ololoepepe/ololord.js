"use strict";

var _files = require("./files");

var Files = _interopRequireWildcard(_files);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var FS = require("q-io/fs");

var rootPath = __dirname + "/../public";

module.exports.readFile = function (fileName) {
    return FS.read(rootPath + "/" + fileName);
};

module.exports.writeFile = function (fileName, data) {
    return Files.writeFile(rootPath + "/" + fileName, data);
};

module.exports.removeFile = function (fileName) {
    return FS.remove(rootPath + "/" + fileName);
};
//# sourceMappingURL=cache.js.map
