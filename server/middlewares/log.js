'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _files = require('../core/files');

var Files = _interopRequireWildcard(_files);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var excludePaths = {};
var excludeRules = [];

function resetExcluded(val, key) {
  excludePaths = {};
  excludeRules = [];
  (val || []).forEach(function (rule) {
    if (rule.regexp) {
      excludeRules.push(new RegExp(rule.regexp, rule.flags));
    } else if (rule.string) {
      excludePaths[rule.string] = {};
    }
  });
}

_config2.default.on('system.log.middleware.exclude', resetExcluded);
resetExcluded((0, _config2.default)('system.log.middleware.exclude', []));

function exclude(path) {
  return excludePaths.hasOwnProperty(path) || excludeRules.some(function (rule) {
    return path.match(rule);
  });
}

exports.default = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(req, res, next) {
    var args, _ref2, fields, files;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!exclude(req.path)) {
              _context.next = 2;
              break;
            }

            return _context.abrupt('return', next());

          case 2:
            if (!(req.method.match(/^post|put|patch|delete$/i) && (0, _config2.default)('system.log.middleware.verbosity') === 'all')) {
              _context.next = 21;
              break;
            }

            args = [Tools.preferIPv4(req.ip), req.path, req.query];
            _context.prev = 4;
            _context.next = 7;
            return Files.parseForm(req);

          case 7:
            _ref2 = _context.sent;
            fields = _ref2.fields;
            files = _ref2.files;

            req.formFields = fields;
            req.formFiles = files;
            args.push(fields);
            _logger2.default.info.apply(_logger2.default, args);
            _context.next = 19;
            break;

          case 16:
            _context.prev = 16;
            _context.t0 = _context['catch'](4);

            _logger2.default.error(_context.t0);

          case 19:
            next();
            return _context.abrupt('return');

          case 21:
            _context.t1 = (0, _config2.default)('system.log.middleware.verbosity');
            _context.next = _context.t1 === 'all' ? 24 : _context.t1 === 'query' ? 24 : _context.t1 === 'path' ? 26 : _context.t1 === 'ip' ? 28 : 30;
            break;

          case 24:
            _logger2.default.info(Tools.preferIPv4(req.ip), req.path, req.query);
            return _context.abrupt('break', 31);

          case 26:
            _logger2.default.info(Tools.preferIPv4(req.ip), req.path);
            return _context.abrupt('break', 31);

          case 28:
            _logger2.default.info(Tools.preferIPv4(req.ip));
            return _context.abrupt('break', 31);

          case 30:
            return _context.abrupt('break', 31);

          case 31:
            next();

          case 32:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[4, 16]]);
  }));

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();
//# sourceMappingURL=log.js.map
