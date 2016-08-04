"use strict";

var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var users = new Map();
var quota = config("system.onlineCounter.quota", 5 * Tools.Minute);
var interval = config("system.onlineCounter.interval", Tools.Minute);

setInterval(function () {
    users.forEach(function (q, ip) {
        q -= interval;
        if (q > 0) users.set(ip, q);else users.delete(ip);
    });
}, interval);

module.exports.alive = function (ip) {
    users.set(ip, quota);
};

module.exports.unique = function () {
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
};

module.exports.clear = function () {
    users.clear();
};
//# sourceMappingURL=online-counter.js.map
