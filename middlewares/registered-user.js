"use strict";

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

var _users = require("../models/users");

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

module.exports = function (req, res, next) {
    UsersModel.getRegisteredUserLevels(req.hashpass).then(function (levels) {
        levels = levels || {};
        var maxLevel = Tools.toArray(levels).sort(function () {
            return -1 * Tools.compareRegisteredUserLevels(arguments);
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
            if (strict) return !Tools.compareRegisteredUserLevels(lvl, level);else return Tools.compareRegisteredUserLevels(lvl, level) >= 0;
        };
        Object.keys(Database.RegisteredUserLevels).forEach(function (lvl) {
            req["is" + lvl] = test.bind(req, Database.RegisteredUserLevels[lvl]);
        });
        next();
    }).catch(function (err) {
        _logger2.default.error(err.stack || err);
        next();
    });
};
//# sourceMappingURL=registered-user.js.map
