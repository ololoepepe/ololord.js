var ChildProcess = require("child_process");
var Crypto = require("crypto");
var equal = require("deep-equal");
var escapeHtml = require("escape-html");
var Formidable = require("formidable");
var FS = require("q-io/fs");
var FSSync = require("fs");
var merge = require("merge");
var Path = require("path");
var Util = require("util");
var XRegExp = require("xregexp");

var config = require("./config");

var translate = require("cute-localize")({
    locale: config("site.locale", "en"),
    silent: true
});

var flags = {};
var styles = null;
var codeStyles = null;
var rootZones = require("../misc/root-zones.json").reduce(function(acc, zone) {
    acc[zone] = {};
    return acc;
}, {});

var ExternalLinkRegexpPattern = (function() {
    var schema = "https?:\\/\\/|ftp:\\/\\/";
    var ip = "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}"
             "([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
    var hostname = "([\\w\\p{L}\\.\\-]+)\\.([\\p{L}]{2,17}\\.?)";
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

module.exports.mapIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            arr.push(f(obj[x], x));
    }
    return arr;
};

module.exports.filterIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var nobj = {};
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var item = obj[x];
            if (f(item, x))
                nobj[x] = item;
        }
    }
    return nobj;
};

module.exports.toArray = function(obj) {
    var arr = [];
    var i = 0;
    forIn(obj, function(val) {
        arr[i] = val;
        ++i;
    });
    return arr;
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

var hasOwnProperties = function(obj) {
    if (!obj)
        return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            return true;
    }
    return false;
};

module.exports.hasOwnProperties = hasOwnProperties;

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

module.exports.forever = function() {
    var date = new Date();
    date.setTime(date.getTime() + module.exports.Billion * 1000);
    return date;
};

module.exports.externalLinkRootZoneExists = function(zoneName) {
    return rootZones.hasOwnProperty(zoneName);
};

module.exports.ipNum = function(ip) {
    if (typeof ip != "string" || !/^([0-9]+\.){3}[0-9]+$/gi.test(ip))
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
        return Promise.resolve(null);
    try {
        return new Promise(function(resolve, reject) {
            var out = ChildProcess.exec(`file --brief --mime-type ${fileName}`, {
                timeout: 5000,
                encoding: "utf8",
                stdio: [
                    0,
                    "pipe",
                    null
                ]
            }, function(err, out) {
                if (err)
                    reject(err);
                resolve(out ? out.replace(/\r*\n+/g, "") : null);
            });
        });
    } catch (err) {
        return Promise.resolve(null);
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

module.exports.getWords = getWords;

module.exports.indexPost = function(post, wordIndex) {
    if (!wordIndex)
        wordIndex = {};
    ["rawText", "subject"].forEach(function(source) {
        var words = getWords(post[source]);
        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            if (!wordIndex.hasOwnProperty(word.word))
                wordIndex[word.word] = [];
            wordIndex[word.word].push({
                boardName: post.boardName,
                postNumber: post.number,
                source: source,
                position: word.pos
            });
        }
    });
    return wordIndex;
};

module.exports.complement = function(map1, map2) {
    var map = {};
    forIn(map1, function(value, key) {
        if (!map2.hasOwnProperty(key))
            map[key] = value;
    });
    return map;
};

module.exports.intersection = function(map1, map2) {
    var map = {};
    forIn(map1, function(value, key) {
        if (map2.hasOwnProperty(key))
            map[key] = value;
    });
    return hasOwnProperties(map1) ? map : map2;
}

module.exports.sum = function(map1, map2) {
    return merge.recursive(map1, map2);
};

var localeBasedFileName = function(fileName, locale) {
    if (!fileName || !Util.isString(fileName))
        return Promise.resolve(null);
    if (!Util.isString(locale))
        locale = config("site.locale", "en");
    var ext = Path.extname(fileName);
    var baseFileName = Path.dirname(fileName) + "/" + Path.basename(fileName, ext);
    var list = [];
    list.push(baseFileName + "." + locale + ext);
    list.push(baseFileName + ".en" + ext);
    list.push(fileName);
    var f = function() {
        var fn = list.shift();
        return FS.exists(fn).then(function(exists) {
            return exists ? fn : null;
        });
    };
    return f().then(function(fn) {
        if (fn)
            return fn;
        if (list.length > 0)
            return f();
        return null;
    });
};
module.exports.localeBasedFileName = localeBasedFileName;

module.exports.getRules = function(name, infix, locale) {
    var fileName = __dirname + "/../misc/rules/" + name + "/rules" + (infix ? ("." + infix) : "") + ".txt";
    return localeBasedFileName(fileName, locale).then(function(fileName) {
        if (!fileName)
            return null;
        return FS.read(fileName);
    }).then(function(data) {
        if (!data)
            return [];
        return data.split(/\r*\n+/gi).filter(function(rule) {
            return rule;
        });
    });
};

module.exports.splitCommand = function(cmd) {
    var args = [];
    var arg = "";
    var quot = 0;
    for (var i = 0; i < cmd.length; ++i) {
        var c = cmd[i];
        if (/\s/.test(c)) {
            if (quot) {
                arg += c;
            } else if (arg.length > 0) {
                args.push(arg);
                arg = "";
            }
        } else {
            if ("\"" == c && (i < 1 || "\\" != cmd[i - 1])) {
                switch (quot) {
                case 1:
                    quot = 0;
                    break;
                case -1:
                    arg += c;
                    break;
                case 0:
                default:
                    quot = 1;
                    break;
                }
            } else if ("'" == c && (i < 1 || "\\" != cmd[i - 1])) {
                switch (quot) {
                case 1:
                    arg += c;
                    break;
                case -1:
                    quot = 0;
                    break;
                case 0:
                default:
                    quot = -1;
                    break;
                }
            } else {
                if (("\"" == c || "'" == c) && (i > 0 || "\\" == cmd[i - 1]) && arg.length > 0)
                    arg = arg.substring(0, arg.length - 1);
                arg += c;
            }
        }
    }
    if (arg.length > 0) {
        if (quot)
            return null;
        args.push(arg);
    }
    var command = null;
    if (args.length > 0)
        command = args.shift();
    return {
        command: command,
        arguments: args
    };
};

module.exports.password = function(pwd) {
    if (!pwd)
        return null;
    var sha1 = Crypto.createHash("sha1");
    sha1.update(pwd);
    return sha1.digest("hex");
}

module.exports.parseForm = function(req) {
    var form = new Formidable.IncomingForm();
    form.uploadDir = __dirname + "/../tmp";
    form.hash = "sha1";
    return new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    fields: fields,
                    files: files
                });
            }
        });
    });
};

module.exports.proxy = function() {
    var proxy = config("system.fileDownloadProxy");
    if (!proxy)
        return null;
    var parts = proxy.split(":");
    var auth = config("system.fileDownloadProxyAuth");
    return {
        host: parts[0],
        port: (parts[1] ? +parts[1] : null),
        auth: (auth ? ("Basic " + new Buffer(auth).toString("base64")) : null)
    };
};
