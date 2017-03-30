'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, res, next) {
    var levels, maxLevelIndex, maxLevel, test;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return UsersModel.getRegisteredUserLevels(req.hashpass);

          case 3:
            levels = _context.sent;
            maxLevelIndex = (0, _underscore2.default)(levels).toArray().map(function (level) {
              return Tools.REGISTERED_USER_LEVELS.indexOf(level);
            }).sort(function (level1, level2) {
              return level2 - level1;
            })[0];
            maxLevel = Tools.REGISTERED_USER_LEVELS[maxLevelIndex] || null;

            req.level = function (boardName) {
              if (!boardName || typeof boardName !== 'string') {
                return maxLevel;
              }
              return levels[boardName] || null;
            };
            req.levels = levels;

            test = function test(level, boardName, strict) {
              var lvl = void 0;
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

            Tools.REGISTERED_USER_LEVELS.forEach(function (lvl) {
              var Level = lvl.toLowerCase();
              Level = Level.charAt(0).toUpperCase() + Level.slice(1);
              req['is' + Level] = test.bind(req, lvl);
            });
            next();
            _context.next = 17;
            break;

          case 13:
            _context.prev = 13;
            _context.t0 = _context['catch'](0);

            _logger2.default.error(_context.t0.stack || _context.t0);
            next();

          case 17:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 13]]);
  }));

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();
//# sourceMappingURL=registered-user.js.map
