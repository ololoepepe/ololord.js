var equal = require("deep-equal");
var FS = require("q-io/fs");
var Promise = require("promise");

var flags = {};

module.exports.forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

module.exports.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

module.exports.extend = function (Child, Parent) {
    var F = function() {};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
};

module.exports.arr = function(obj) {
    var arr = [];
    if (!obj || !obj.length)
        return arr;
    for (var i = 0; i < obj.length; ++i)
        arr.push(obj[i]);
    return arr;
};

module.exports.contains = function(s, subs) {
    if (typeof s == "string" && typeof subs == "string")
        return s.replace(subs, "") != s;
    if (!s || !s.length || s.length < 1)
        return false;
    for (var i = 0; i < s.length; ++i) {
        if (equal(s[i], subs))
            return true;
    }
    return false;
};

module.exports.replace = function(where, what, withWhat) {
    if (typeof where != "string" || (typeof what != "string" && !(what instanceof RegExp)) || typeof withWhat != "string")
        return;
    var sl = where.split(what);
    return (sl.length > 1) ? sl.join(withWhat) : sl.pop();
};

module.exports.toUTC = function(date) {
    if (!(date instanceof Date))
        return;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(),
        date.getUTCMinutes(), date.getUTCSeconds(), date.getMilliseconds());
};

module.exports.hashpass = function(req) {
    var s = req.cookies.hashpass;
    if (typeof s != "string" || !s.match(/^([0-9a-fA-F]){40}$/))
        return;
    return s;
};

module.exports.flagName = function(countryCode) {
    var fn = countryCode.toUpperCase() + ".png";
    if (flags.hasOwnProperty(fn))
        return Promise.resolve(fn);
    FS.exists(__dirname + "/../public/img/flag/" + fn).then(function(exists) {
        if (exists)
            flags[fn] = true;
        return Promise.resolve(exists ? fn : "");
    });
};
