'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (req, res, next) {
  res.cookie('tmp_levels', JSON.stringify(req.levels || {}), { expires: null });
  next();
};
//# sourceMappingURL=cookies.js.map
