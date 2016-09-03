import _ from 'underscore';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as UsersModel from '../models/users';

export default async function(req, res, next) {
  try {
    let levels = await UsersModel.getRegisteredUserLevels(req.hashpass);
    let maxLevelIndex = _(levels).toArray().map((level) => {
      return Tools.REGISTERED_USER_LEVELS.indexOf(level);
    }).sort((level1, level2) => { return level2 - level1; })[0];
    let maxLevel = Tools.REGISTERED_USER_LEVELS[maxLevelIndex] || null;
    req.level = (boardName) => {
      if (!boardName || typeof boardName !== 'string') {
        return maxLevel;
      }
      return levels[boardName] || null;
    };
    req.levels = levels;
    let test = function(level, boardName, strict) {
      let lvl;
      if (boardName && typeof boardName !== 'boolean') {
        lvl = req.levels[boardName];
      } else {
        lvl = maxLevel;
        strict = boardName;
      }
      if (strict) {
        return !Tools.compareRegisteredUserLevels(lvl, level);
      } else {
        return Tools.compareRegisteredUserLevels(lvl, level) >= 0;
      }
    };
    Tools.REGISTERED_USER_LEVELS.forEach((lvl) => {
      let Level = lvl.toLowerCase();
      Level = Level.charAt(0).toUpperCase() + Level.slice(1)
      req[`is${Level}`] = test.bind(req, lvl);
    });
    next();
  } catch (err) {
    Logger.error(err.stack || err);
    next();
  }
}
