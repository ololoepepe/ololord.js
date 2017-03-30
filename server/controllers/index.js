'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _middlewares = require('../middlewares');

var _middlewares2 = _interopRequireDefault(_middlewares);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var EXCLUDED_ROUTERS = new Set(['index.js', 'home.js', 'board.js']);

var app = (0, _express2.default)();
var router = _express2.default.Router();
app.routers = [];

function initialize() {
  app.use(_middlewares2.default);

  router.use('/redirect', function (req, res, next) {
    if (!req.query.source) {
      return next();
    }
    res.redirect(307, '/' + (0, _config2.default)('site.pathPrefix') + req.query.source.replace(/^\//, ''));
  });

  Tools.loadPlugins([__dirname, __dirname + '/custom'], function (fileName, _1, _2, path) {
    return !EXCLUDED_ROUTERS.has(fileName) || path.split('/').slice(-2, -1)[0] === 'custom';
  }).forEach(function (plugin) {
    router.use('/', plugin);
    app.routers.push(plugin);
  });

  ['./board', './home'].forEach(function (id) {
    var r = Tools.requireWrapper(require(id));
    router.use('/', r);
    app.routers.push(r);
  });

  app.use(router);

  app.use('*', function (req, res, next) {
    next(Tools.create404Error(req.baseUrl));
  });

  app.use(function (err, req, res, next) {
    Tools.series(req.formFiles, function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file) {
        var exists;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                exists = _fs2.default.exists(file.path);

                if (!exists) {
                  _context.next = 5;
                  break;
                }

                _context.next = 5;
                return _fs2.default.remove(file.path);

              case 5:
                _context.next = 10;
                break;

              case 7:
                _context.prev = 7;
                _context.t0 = _context['catch'](0);

                _logger2.default.error(_context.t0.stack || _context.t0);

              case 10:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 7]]);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
    switch (err.status) {
      case 404:
        {
          _logger2.default.error(Tools.preferIPv4(req.ip), err.path, 404);
          res.status(404).sendFile('notFound.html', { root: __dirname + '/../../public' });
          break;
        }
      default:
        {
          _logger2.default.error(Tools.preferIPv4(req.ip), req.path, err.stack || err);
          if (err.hasOwnProperty('ban')) {} else {
            if ((0, _underscore2.default)(err).isError()) {
              var message = err.message;
            } else {
              var message = typeof err === 'string' ? err : '';
            }
          }
          res.json({ message: message });
          break;
        }
    }
  });
}

app.initialize = initialize;

exports.default = app;
//# sourceMappingURL=index.js.map
