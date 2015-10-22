var equal = require("deep-equal");
var escapeHtml = require("escape-html");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Localize = require("localize");
var merge = require("merge");
var Promise = require("promise");

var config = require("./config");

var _strings = {};
var rootZones = null;

var forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

//NOTE: node-localize does not allow to exclude dirs, so searching for translations manually, excluding some dirs

var getStrings = function(dir) {
    var files = FSSync.readdirSync(dir);
    var strings = {};
    files.forEach(function(file) {
        var sl = file.split(".");
        if (sl.length != 2 || sl.pop() != "txt")
            return;
        var name = sl.shift();
        strings[name] = { def: FSSync.readFileSync(dir + "/" + file, "utf8") };
    });
    files.forEach(function(file) {
        var sl = file.split(".");
        if (sl.length != 3 || sl.pop() != "txt")
            return;
        var name = sl.shift();
        if (!strings.hasOwnProperty(name))
            return;
        var locale = sl.shift();
        strings[name][locale] = FSSync.readFileSync(dir + "/" + file, "utf8");
    });
    return strings;
};

var getTranslations = function(dir, exclude) {
    exclude = exclude || [];
    var files = FSSync.readdirSync(dir);
    return files.reduce(function(obj, file) {
        var stat = FSSync.statSync(dir + "/" + file);
        if (!stat)
            return obj;
        if (stat.isFile() && file == "translations.json") {
            return merge.recursive(obj, require(dir + "/" + file));
        } else if (stat.isDirectory() && "translations" == file) {
            var strings = getStrings(dir + "/" + file);
            _strings = merge.recursive(_strings, strings);
            var o = {};
            forIn(strings, function(s) {
                o[s.def] = {};
                forIn(s, function(tr, loc) {
                    o[s.def][loc] = tr;
                });
            });
            return merge.recursive(obj, o);
        } else if (stat.isDirectory() && (exclude.indexOf(file) < 0)) {
            return merge.recursive(obj, getTranslations(dir + "/" + file));
        }
        return obj;
    }, {});
};

var flags = {};
var loc = new Localize(getTranslations(__dirname + "/..", [".git", "node_modules"]));
forIn(_strings, function(s, name) {
    loc.strings[name] = s.def;
});
loc.translateWrapper = loc.translate;
loc.setLocale(config("site.locale", "en"));

var ExternalLinkRegexpPattern = (function() {
    var schema = "https?:\\/\\/|ftp:\\/\\/";
    var ip = "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}"
             "([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
    var hostname = "([\\w\\p{L}\\.\\-]+)\\.([a-z]{2,17}\\.?)";
    var port = ":\\d+";
    var path = "(\\/[\\w\\p{L}\\.\\-\\!\\?\\=\\+#~&%:\\,\\(\\)]*)*\\/?";
    return "(" + schema + ")?(" + hostname + "|" + ip + ")(" + port + ")?" + path + "(?!\\S)";
})();

Object.defineProperty(module.exports, "Billion", { value: (2 * 1000 * 1000 * 1000) });
Object.defineProperty(module.exports, "Second", { value: 1000 });
Object.defineProperty(module.exports, "Minute", { value: (60 * 1000) });
Object.defineProperty(module.exports, "Hour", { value: (60 * 60 * 1000) });
Object.defineProperty(module.exports, "ExternalLinkRegexpPattern", { value: ExternalLinkRegexpPattern });

module.exports.forIn = forIn;

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

module.exports.translate = function(what) {
    try {
        return loc.translateWrapper(what);
    } catch (err) {
        return what;
    }
};

module.exports.translateWrapper = module.exports.translate;

module.exports.translateVar = function(what) {
    try {
        return loc.translateWrapper(loc.strings[what]);
    } catch (err) {
        return what;
    }
};

module.exports.setLocale = function(locale) {
    loc.setLocale(locale);
};

module.exports.now = function() {
    return new Date();
};

module.exports.externalLinkRootZoneExists = function(zoneName) {
    if (rootZones)
        return rootZones.hasOwnProperty(zoneName);
    var list = FSSync.readFileSync(__dirname + "/../misc/root-zones.txt", "utf8").split(/\r?\n+/gi);
    rootZones = {};
    list.forEach(function(zone) {
        if (!zone)
            return;
        rootZones[zone] = true;
    });
    return rootZones.hasOwnProperty(zoneName);
};

module.exports.ipNum = function(ip) {
    if (typeof ip != "string" || !/^[0-9\.]$/gi.test(ip))
        return null;
    var sl = ip.split(".");
    if (sl.length != 4)
        return null;
    var n = +sl[3];
    if (isNaN(n))
        return null;
    var nn = +sl[2];
    if (isNaN(nn))
        return null;
    n += 256 * nn;
    nn = +sl[1];
    if (isNaN(nn))
        return null;
    n += 256 * 256 * nn;
    nn = +sl[0];
    if (isNaN(nn))
        return null;
    n += 256 * 256 * 256 * nn;
    if (!n)
        return null;
    return n;
};

module.exports.toHtml = function(text, replaceSpaces) {
    text = escapeHtml(text).split("\n").join("<br />");
    if (replaceSpaces)
        text = text.split(" ").join("&nbsp;");
    return text;
};
