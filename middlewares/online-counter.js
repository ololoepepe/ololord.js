'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (req, res, next) {
  OnlineCounter.alive(req.ip);
  next();
};

var _onlineCounter = require('../helpers/online-counter');

var OnlineCounter = _interopRequireWildcard(_onlineCounter);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

;
//# sourceMappingURL=online-counter.js.map
