'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EXCLUDED_ROUTERS = new Set(['index.js', 'home.js', 'board.js']);

var router = _express2.default.Router();
var routers = [];

router.use('/redirect', function (req, res, next) {
  if (!req.query.source) {
    return next();
  }
  res.redirect(307, '/' + (0, _config2.default)('site.pathPrefix') + req.query.source.replace(/^\//, ''));
});

_fs2.default.readdirSync(__dirname).filter(function (fileName) {
  return !EXCLUDED_ROUTERS.has(fileName) && 'js' === fileName.split('.').pop();
}).forEach(function (fileName) {
  var r = require('./' + fileName.split('.').slice(0, -1).join('.'));
  router.use('/', r);
  routers.push(r);
});

['./board', './home'].forEach(function (id) {
  var r = require(id);
  router.use('/', r);
  routers.push(r);
});

router.use('*', function (req, res, next) {
  var err = new Error();
  err.status = 404;
  err.path = req.baseUrl;
  next(err);
});

router.use(function (err, req, res, next) {
  switch (err.status) {
    case 404:
      {
        _logger2.default.error(Tools.preferIPv4(req.ip), err.path, 404);
        res.status(404).sendFile('notFound.html', { root: __dirname + '/../public' });
        break;
      }
    default:
      {
        _logger2.default.error(Tools.preferIPv4(req.ip), req.path, err.stack || err);
        if (err.ban) {
          var model = { ban: err.ban };
        } else {
          if ((0, _underscore2.default)(err).isError()) {
            var model = {
              errorMessage: Tools.translate('Internal error'),
              errorDescription: err.message
            };
          } else if (err.error) {
            var model = {
              errorMessage: error.description ? err.error : Tools.translate('Error'),
              errorDescription: err.description || err.error
            };
          } else {
            var model = {
              errorMessage: Tools.translate('Error'),
              errorDescription: typeof err === 'string' ? err : ''
            };
          }
        }
        res.json(model);
        break;
      }
  }
});

router.routers = routers;

exports.default = router;
//# sourceMappingURL=index.js.map
