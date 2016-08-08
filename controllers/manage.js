'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

router.paths = function () {
  return ['/manage.html'];
};

router.render = function (path) {
  if ('/manage.html' === path) {
    return { 'manage.html': Renderer.render('pages/manage', { title: Tools.translate('Management', 'pageTitle') }) };
  }
};

module.exports = router;
//# sourceMappingURL=manage.js.map
