'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.alive = alive;
exports.unique = unique;
exports.clear = clear;

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var users = new Map();
var quota = (0, _config2.default)('system.onlineCounter.quota');
var interval = (0, _config2.default)('system.onlineCounter.interval');

setInterval(function () {
  users.forEach(function (q, ip) {
    q -= interval;
    if (q > 0) {
      users.set(ip, q);
    } else {
      users.delete(ip);
    }
  });
}, interval);

function alive(ip) {
  users.set(ip, quota);
}

function unique() {
  var o = {};
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = users.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var ip = _step.value;

      o[ip] = 1;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return o;
}

function clear() {
  users.clear();
}
//# sourceMappingURL=online-counter.js.map
