var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

import Logger from '../helpers/logger';
import * as UsersModel from '../models/users';

module.exports = function(req, res, next) {
    UsersModel.getRegisteredUserLevels(req.hashpass).then(function(levels) {
        levels = levels || {};
        var maxLevel = Tools.toArray(levels).sort(function() {
            return -1 * Tools.compareRegisteredUserLevels(arguments);
        });
        maxLevel = (maxLevel.length > 0) ? maxLevel[0] : null;
        req.level = function(boardName) {
            if (!boardName)
                return maxLevel;
            return levels[boardName] || null;
        };
        req.levels = levels;
        var test = function(level, boardName, strict) {
            var lvl;
            if (boardName && typeof boardName != "boolean") {
                lvl = req.levels[boardName];
            } else {
                lvl = maxLevel;
                strict = boardName;
            }
            if (strict)
                return !Tools.compareRegisteredUserLevels(lvl, level);
            else
                return Tools.compareRegisteredUserLevels(lvl, level) >= 0;
        };
        Object.keys(Database.RegisteredUserLevels).forEach(function(lvl) {
            req[`is${lvl}`] = test.bind(req, Database.RegisteredUserLevels[lvl]);
        });
        next();
    }).catch(function(err) {
        Logger.error(err.stack || err);
        next();
    });
};
