'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

router.get('/misc/base.json', function (req, res) {
  res.json(MiscModel.base());
});

router.get('/misc/boards.json', function (req, res) {
  res.json(MiscModel.boards());
});

router.get('/misc/board/:board.json', function (req, res) {
  res.json(MiscModel.board(req.params.board));
});

router.get('/misc/tr.json', function (req, res) {
  res.json(MiscModel.translations());
});

module.exports = router;
//# sourceMappingURL=misc.js.map
