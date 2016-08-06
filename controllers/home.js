'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

router.paths = function () {
  return ['/'];
};

router.render = function () {
  return {
    'index.html': Renderer.render('pages/home', { title: Tools.translate('ololord.js', 'pageTitle') }),
    'notFound.html': Renderer.render('pages/notFound', {
      title: Tools.translate('Error 404', 'pageTitle'),
      notFoundImageFileName: (0, _underscore2.default)(MiscModel.notFoundImageFileNames()).sample()
    })
  };
};

module.exports = router;
//# sourceMappingURL=home.js.map
