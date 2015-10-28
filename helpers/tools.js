var ChildProcess = require("child_process");
var equal = require("deep-equal");
var escapeHtml = require("escape-html");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Util = require("util");
var XRegExp = require("xregexp");

var config = require("./config");

var translate = require("cute-localize")({
    locale: config("site.locale", "en")
});

var flags = {};
var styles = null;
var codeStyles = null;

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

var forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

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
    if (!countryCode)
        return Promise.resolve("");
    var fn = countryCode.toUpperCase() + ".png";
    if (flags.hasOwnProperty(fn))
        return Promise.resolve(fn);
    return FS.exists(__dirname + "/../public/img/flag/" + fn).then(function(exists) {
        if (exists)
            flags[fn] = true;
        return Promise.resolve(exists ? fn : "");
    });
};

module.exports.translate = translate;

module.exports.setLocale = function(locale) {
    translate.setLocale(locale);
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

module.exports.styles = function() {
    if (styles)
        return styles;
    styles = [];
    var path = __dirname + "/../public/css";
    FSSync.readdirSync(path).forEach(function(fileName) {
        if (fileName.split(".").pop() != "css")
            return;
        var name = fileName.split(".").shift();
        var str = FSSync.readFileSync(path + "/" + fileName, "utf8");
        var match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(str);
        var title = match ? match[1] : name;
        styles.push({
            name: name,
            title: title
        });
    });
    return styles;
};

module.exports.codeStyles = function() {
    if (codeStyles)
        return codeStyles;
    codeStyles = [];
    var path = __dirname + "/../public/css/3rdparty/highlight.js";
    FSSync.readdirSync(path).forEach(function(fileName) {
        if (fileName.split(".").pop() != "css")
            return;
        var name = fileName.split(".").shift();
        var str = FSSync.readFileSync(path + "/" + fileName, "utf8");
        var match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(str);
        var title = match ? match[1] : name;
        codeStyles.push({
            name: name,
            title: title
        });
    });
    return codeStyles;
};

module.exports.mimeType = function(fileName) {
    if (!fileName || !Util.isString(fileName))
        return null;
    try {
        var out = ChildProcess.execSync(`file --brief --mime-type ${fileName}`, {
            timeout: 1000,
            encoding: "utf8",
            stdio: [
                0,
                "pipe",
                null
            ]
        });
        return out ? out.replace(/\r*\n+/g, "") : null;
    } catch (err) {
        return null;
    }
};

module.exports.isAudioType = function(mimeType) {
    return mimeType.substr(0, 6) == "audio/";
};

module.exports.isVideoType = function(mimeType) {
    return mimeType.substr(0, 6) == "video/";
};

module.exports.isPdfType = function(mimeType) {
    return mimeType == "application/pdf";
};

module.exports.isImageType = function(mimeType) {
    return mimeType.substr(0, 6) == "image/";
};

var getWords = function(text) {
    if (!text)
        return [];
    var rx = XRegExp("^\\pL|[0-9]$");
    var words = [];
    var word = "";
    var pos = 0;
    for (var i = 0; i < text.length; ++i) {
        var c = text[i];
        if (rx.test(c)) {
            word += c;
        } else if (word.length > 0) {
            words.push({
                word: word.toLowerCase(),
                pos: pos
            });
            word = "";
            ++pos;
        }
    }
    if (word.length > 0) {
        words.push({
            word: word.toLowerCase(),
            pos: pos
        });
    }
    return words;
};

module.exports.indexPost = function(post, wordIndex) {
    if (!wordIndex)
        wordIndex = {};
    ["rawText", "subject"].forEach(function(source) {
        var words = getWords(post[source]);
        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            if (!wordIndex.hasOwnProperty(word.word))
                wordIndex[word.word] = [];
            wordIndex[word.word].push(JSON.stringify({
                boardName: post.boardName,
                postNumber: post.number,
                source: source,
                position: word.pos
            }));
        }
    });
    return wordIndex;
};
