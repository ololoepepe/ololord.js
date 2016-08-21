var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var users = new Map();
var quota = config("system.onlineCounter.quota", 5 * Tools.MINUTE); //TODO: magic numbers
var interval = config("system.onlineCounter.interval", Tools.MINUTE); //TODO: magic numbers

setInterval(function() {
    users.forEach(function(q, ip) {
        q -= interval;
        if (q > 0)
            users.set(ip, q);
        else
            users.delete(ip);
    });
}, interval);

module.exports.alive = function(ip) {
    users.set(ip, quota);
};

module.exports.unique = function() {
    var o = {};
    for (var ip of users.keys())
        o[ip] = 1;
    return o;
};

module.exports.clear = function() {
    users.clear();
};
