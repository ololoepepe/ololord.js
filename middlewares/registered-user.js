"use strict";

var Database = require("../helpers/database");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

module.exports = function (req, res, next) {
    Database.registeredUserLevels(req).then(function (levels) {
        levels = levels || {};
        var maxLevel = Tools.toArray(levels).sort(function () {
            return -1 * Database.compareRegisteredUserLevels(arguments);
        });
        maxLevel = maxLevel.length > 0 ? maxLevel[0] : null;
        req.level = function (boardName) {
            if (!boardName) return maxLevel;
            return levels[boardName] || null;
        };
        req.levels = levels;
        var test = function test(level, boardName, strict) {
            var lvl;
            if (boardName && typeof boardName != "boolean") {
                lvl = req.levels[boardName];
            } else {
                lvl = maxLevel;
                strict = boardName;
            }
            if (strict) return !Database.compareRegisteredUserLevels(lvl, level);else return Database.compareRegisteredUserLevels(lvl, level) >= 0;
        };
        Object.keys(Database.RegisteredUserLevels).forEach(function (lvl) {
            req["is" + lvl] = test.bind(req, Database.RegisteredUserLevels[lvl]);
        });
        next();
    }).catch(function (err) {
        Global.error(err.stack || err);
        next();
    });
};
//# sourceMappingURL=registered-user.js.map
