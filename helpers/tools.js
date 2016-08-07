"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ARCHIVE_PATHS_REGEXP = exports.ExternalLinkRegexpPattern = exports.Hour = exports.Minute = exports.Second = exports.Billion = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.option = option;
exports.testPostNumber = testPostNumber;
exports.selectParser = selectParser;
exports.selectStringifier = selectStringifier;
exports.cloned = cloned;
exports.addIPv4 = addIPv4;
exports.createWatchedResource = createWatchedResource;
exports.compareRegisteredUserLevels = compareRegisteredUserLevels;
exports.postingSpeedString = postingSpeedString;

var _underscore = require("underscore");

var _underscore2 = _interopRequireDefault(_underscore);

var _fsWatcher = require("./fs-watcher");

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _logger = require("./logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var Canvas = require("canvas");
var ChildProcess = require("child_process");
var Crypto = require("crypto");
var du = require("du");
var equal = require("deep-equal");
var escapeHtml = require("escape-html");
var FS = require("q-io/fs");
var FSSync = require("fs");
var HTMLToText = require("html-to-text");
var Image = Canvas.Image;
var Jdenticon = require("jdenticon");
var MathJax = require("mathjax-node/lib/mj-single.js");
var merge = require("merge");
var mkpath = require("mkpath");
var Multiparty = require("multiparty");
var Path = require("path");
var phash = require("phash-image");
var promisify = require("promisify-node");
var Util = require("util");
var UUID = require("uuid");
var XRegExp = require("xregexp");

var config = require("./config");

var translate = require("cute-localize")({
    locale: config("site.locale", "en"),
    extraLocations: __dirname + "/../translations/custom",
    silent: true
});

var flags = {};
var styles = null;
var codeStyles = null;
var rootZones = require("../misc/root-zones.json").reduce(function (acc, zone) {
    acc[zone] = {};
    return acc;
}, {});

MathJax.config({ MathJax: {} });
MathJax.start();

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/form");

var Billion = exports.Billion = 2 * 1000 * 1000 * 1000;
var Second = exports.Second = 1000;
var Minute = exports.Minute = 60 * 1000;
var Hour = exports.Hour = 60 * 60 * 1000;
var ExternalLinkRegexpPattern = exports.ExternalLinkRegexpPattern = function () {
    var schema = "https?:\\/\\/|ftp:\\/\\/";
    var ip = "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}" + "(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])";
    var hostname = "([\\w\\p{L}\\.\\-]+)\\.([\\p{L}]{2,17}\\.?)";
    var port = ":\\d+";
    var path = "(\\/[\\w\\p{L}\\.\\-\\!\\?\\=\\+#~&%:;\'\"\\,\\(\\)\\[\\]«»]*)*\\/?";
    return "(" + schema + ")?(" + hostname + "|" + ip + ")(" + port + ")?" + path;
}();
var ARCHIVE_PATHS_REGEXP = exports.ARCHIVE_PATHS_REGEXP = /^\/[^\/]+\/(archive|arch\/\d+)$/;

var forIn = function forIn(obj, f) {
    if (!obj || typeof f != "function") return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) f(obj[x], x);
    }
};

module.exports.forIn = forIn;

var mapIn = function mapIn(obj, f) {
    if (!obj || typeof f != "function") return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) arr.push(f(obj[x], x));
    }
    return arr;
};

module.exports.mapIn = mapIn;

module.exports.filterIn = function (obj, f) {
    if (!obj || typeof f != "function") return;
    var nobj = {};
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var item = obj[x];
            if (f(item, x)) nobj[x] = item;
        }
    }
    return nobj;
};

var toArray = function toArray(obj) {
    var arr = [];
    forIn(obj, function (val) {
        arr.push(val);
    });
    return arr;
};

module.exports.toArray = toArray;

module.exports.promiseIf = function (condition, ifTrue, ifFalse) {
    if (condition) return ifTrue();else if (typeof ifFalse == "function") return ifFalse();else return Promise.resolve();
};

module.exports.extend = function (Child, Parent) {
    var F = function F() {};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
};

module.exports.arr = function (obj) {
    var arr = [];
    if (!obj || !obj.length) return arr;
    for (var i = 0; i < obj.length; ++i) {
        arr.push(obj[i]);
    }return arr;
};

module.exports.contains = function (s, subs) {
    if (typeof s == "string" && typeof subs == "string") return s.replace(subs, "") != s;
    if (!s || !s.length || s.length < 1) return false;
    for (var i = 0; i < s.length; ++i) {
        if (equal(s[i], subs)) return true;
    }
    return false;
};

var hasOwnProperties = function hasOwnProperties(obj) {
    if (!obj) return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) return true;
    }
    return false;
};

module.exports.hasOwnProperties = hasOwnProperties;

module.exports.replace = function (where, what, withWhat) {
    if (typeof where != "string" || typeof what != "string" && !(what instanceof RegExp) || typeof withWhat != "string") return;
    var sl = where.split(what);
    return sl.length > 1 ? sl.join(withWhat) : sl.pop();
};

module.exports.toUTC = function (date) {
    if (!(date instanceof Date)) return;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getMilliseconds());
};

module.exports.hashpass = function (req) {
    var s = req.cookies.hashpass;
    if (!module.exports.mayBeHashpass(s)) return;
    return s;
};

module.exports.flagName = function (countryCode) {
    if (!countryCode) return Promise.resolve("");
    var fn = countryCode.toUpperCase() + ".png";
    if (flags.hasOwnProperty(fn)) return Promise.resolve(fn);
    return FS.exists(__dirname + "/../public/img/flags/" + fn).then(function (exists) {
        if (exists) flags[fn] = true;
        return Promise.resolve(exists ? fn : "");
    });
};

module.exports.translate = translate;

module.exports.setLocale = function (locale) {
    translate.setLocale(locale);
};

module.exports.now = function () {
    return new Date();
};

module.exports.forever = function () {
    var date = new Date();
    date.setTime(date.getTime() + module.exports.Billion * 1000);
    return date;
};

module.exports.externalLinkRootZoneExists = function (zoneName) {
    return rootZones.hasOwnProperty(zoneName);
};

module.exports.toHtml = function (text, replaceSpaces) {
    text = escapeHtml(text).split("\n").join("<br />");
    if (replaceSpaces) text = text.split(" ").join("&nbsp;");
    return text;
};

var NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce(function (acc, prefix) {
    return acc.concat(['combined', 'desktop', 'mobile'].map(function (suffix) {
        return prefix + "base-" + suffix;
    }));
}, []));

module.exports.styles = function () {
    if (styles) return styles;
    styles = [];
    var path = __dirname + "/../public/css";
    FSSync.readdirSync(path).forEach(function (fileName) {
        if (fileName.split(".").pop() != "css" || NON_THEME_STYLESHEETS.has(fileName.split(".").shift())) {
            return;
        }
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

module.exports.codeStyles = function () {
    if (codeStyles) return codeStyles;
    codeStyles = [];
    var path = __dirname + "/../public/css/3rdparty/highlight.js";
    FSSync.readdirSync(path).forEach(function (fileName) {
        if (fileName.split(".").pop() != "css") return;
        var name = fileName.split(".").slice(0, -1).join('.');
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

module.exports.mimeType = function (fileName) {
    if (!fileName || !Util.isString(fileName)) return Promise.resolve(null);
    try {
        return new Promise(function (resolve, reject) {
            ChildProcess.exec("file --brief --mime-type " + fileName, {
                timeout: 5000,
                encoding: "utf8",
                stdio: [0, "pipe", null]
            }, function (err, out) {
                if (err) reject(err);
                resolve(out ? out.replace(/\r*\n+/g, "") : null);
            });
        });
    } catch (err) {
        return Promise.resolve(null);
    }
};

module.exports.isAudioType = function (mimeType) {
    return "application/ogg" == mimeType || mimeType.substr(0, 6) == "audio/";
};

module.exports.isVideoType = function (mimeType) {
    return mimeType.substr(0, 6) == "video/";
};

module.exports.isPdfType = function (mimeType) {
    return mimeType == "application/pdf";
};

module.exports.isImageType = function (mimeType) {
    return mimeType.substr(0, 6) == "image/";
};

module.exports.splitCommand = function (cmd) {
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
                if (("\"" == c || "'" == c) && (i > 0 || "\\" == cmd[i - 1]) && arg.length > 0) arg = arg.substring(0, arg.length - 1);
                arg += c;
            }
        }
    }
    if (arg.length > 0) {
        if (quot) return null;
        args.push(arg);
    }
    var command = null;
    if (args.length > 0) command = args.shift();
    return {
        command: command,
        arguments: args
    };
};

module.exports.mayBeHashpass = function (password) {
    return typeof password == "string" && password.match(/^([0-9a-fA-F]){40}$/);
};

module.exports.parseForm = function (req) {
    if (req.formFields) {
        return Promise.resolve({
            fields: req.formFields,
            files: req.formFiles || []
        });
    }
    var form = new Multiparty.Form();
    form.uploadDir = config("system.tmpPath", __dirname + "/../tmp") + "/form";
    form.autoFields = true;
    form.autoFiles = true;
    form.maxFieldsSize = 5 * 1024 * 1024;
    return new Promise(function (resolve, reject) {
        form.parse(req, function (err, fields, files) {
            if (err) return reject(err);
            forIn(fields, function (val, key) {
                if (1 == val.length) fields[key] = val[0];
            });
            resolve({
                fields: fields,
                files: toArray(files).reduce(function (acc, files) {
                    return acc.concat(files);
                }, []).map(function (file) {
                    file.name = file.originalFilename;
                    return file;
                })
            });
        });
    });
};

module.exports.proxy = function () {
    var proxy = config("system.fileDownloadProxy");
    if (!proxy) return null;
    var parts = proxy.split(":");
    var auth = config("system.fileDownloadProxyAuth");
    return {
        host: parts[0],
        port: parts[1] ? +parts[1] : null,
        auth: auth ? "Basic " + new Buffer(auth).toString("base64") : null
    };
};

var correctAddress = function correctAddress(ip) {
    if (!ip || typeof ip !== 'string') return null;
    if ("::1" == ip) ip = "127.0.0.1";
    var match = ip.match(/^\:\:ffff\:(\d+\.\d+\.\d+\.\d+)$/);
    if (match) ip = match[1];
    if (ip.replace(":", "") == ip) ip = "::" + ip;
    try {
        var address = new Address6(ip);
        if (address.isValid()) return address.correctForm();
    } catch (err) {
        //
    }
    try {
        var address = Address6.fromAddress4(ip);
        if (address.isValid()) return address.correctForm();
    } catch (err) {
        //
    }
    return null;
};

module.exports.correctAddress = correctAddress;

module.exports.preferIPv4 = function (ip) {
    if (!ip) return null;
    try {
        var address = new Address6(ip);
        var ipv4 = address.to4();
        if (ipv4.isValid()) {
            ipv4 = ipv4.correctForm();
            return "0.0.0.1" == ipv4 ? "127.0.0.1" : ipv4;
        }
        if (address.isValid()) return address.correctForm();
        return ip;
    } catch (err) {
        //
    }
    return ip;
};

module.exports.sha1 = function (data) {
    if (!data || !Util.isString(data) && !Util.isBuffer(data)) return null;
    var sha1 = Crypto.createHash("sha1");
    sha1.update(data);
    return sha1.digest("hex");
};

module.exports.sha256 = function (data) {
    if (!data) return null;
    var sha256 = Crypto.createHash("sha256");
    sha256.update(data);
    return sha256.digest("hex");
};

var withoutDuplicates = function withoutDuplicates(arr) {
    if (!arr || !Util.isArray(arr)) return arr;
    return arr.filter(function (item, i) {
        return arr.indexOf(item) == i;
    });
};

module.exports.withoutDuplicates = withoutDuplicates;

module.exports.remove = function (arr, what, both) {
    if (!arr || !Util.isArray(arr)) return arr;
    if (Util.isUndefined(what)) return;
    if (!Util.isArray(what)) what = [what];
    for (var i = what.length - 1; i >= 0; --i) {
        var ind = arr.indexOf(what[i]);
        if (ind >= 0) {
            arr.splice(ind, 1);
            if (both) what.splice(i, 1);
        }
    }
};

module.exports.series = function (arr, f, container) {
    if (container && (typeof container === "undefined" ? "undefined" : _typeof(container)) != "object") container = [];
    var isArray = Util.isArray(container);
    var isObject = (typeof container === "undefined" ? "undefined" : _typeof(container)) == "object";
    var p = Promise.resolve();
    if (Util.isArray(arr)) {
        arr.forEach(function (el) {
            p = p.then(function () {
                return f(el);
            }).then(function (result) {
                if (isArray) container.push(result);else if (isObject) container[el] = result;
            });
        });
    } else if (Util.isObject(arr)) {
        forIn(arr, function (el, key) {
            p = p.then(function () {
                return f(el, key);
            }).then(function (result) {
                if (isArray) container.push(result);else if (isObject) container[key] = result;
            });
        });
    }
    if (!container) return p;
    return p.then(function () {
        return Promise.resolve(container);
    });
};

module.exports.generateTripcode = function (source) {
    var md5 = Crypto.createHash("md5");
    md5.update(source + config("site.tripcodeSalt", ""));
    return "!" + md5.digest("base64").substr(0, 10);
};

module.exports.plainText = function (text, options) {
    if (!text) return "";
    text = "" + text;
    var uuid = UUID.v4();
    if (options && options.brToNewline) text = text.replace(/<br \/>/g, uuid);else text = text.replace(/<br \/>/g, " ");
    text = HTMLToText.fromString(text, {
        wordwrap: null,
        linkHrefBaseUrl: config("site.protocol", "http") + "://" + config("site.domain", "localhost:8080"),
        hideLinkHrefIfSameAsText: true,
        ignoreImages: true
    });
    if (options && options.brToNewline) text = text.split(uuid).join("\n");
    return text;
};

module.exports.ipList = function (s) {
    var ips = (s || "").split(/\s+/).filter(function (ip) {
        return ip;
    });
    //TODO: IP ranges
    var err = ips.some(function (ip, i) {
        ip = correctAddress(ip);
        if (!ip) return true;
        ips[i] = ip;
    });
    if (err) return translate("Invalid IP address");
    return withoutDuplicates(ips);
};

module.exports.markupLatex = function (text, inline) {
    return new Promise(function (resolve, reject) {
        MathJax.typeset({
            math: text,
            format: inline ? "inline-TeX" : "TeX",
            svg: true
        }, function (data) {
            if (data.errors) return reject(data.errors[0] || data.errors);
            var html = data.svg;
            if (inline) html = "<span class=\"latex-inline\">" + html + "</span>";else html = "<div class=\"latex-block\">" + html + "</div>";
            resolve(html);
        });
    });
};

module.exports.generateImageHash = function (fileName) {
    return phash(fileName, true).then(function (hash) {
        return Promise.resolve(hash.toString());
    });
};

module.exports.generateRandomImage = function (hash, mimeType, thumbPath) {
    var canvas = new Canvas(200, 200);
    var ctx = canvas.getContext("2d");
    Jdenticon.drawIcon(ctx, hash, 200);
    return FS.read(__dirname + "/../thumbs/" + mimeType + ".png", "b").then(function (data) {
        var img = new Image();
        img.src = data;
        ctx.drawImage(img, 0, 0, 200, 200);
        return new Promise(function (resolve, reject) {
            canvas.pngStream().pipe(FSSync.createWriteStream(thumbPath).on("error", reject).on("finish", resolve));
        });
    });
};

module.exports.du = function (path) {
    return new Promise(function (resolve, reject) {
        du(path, function (err, size) {
            if (err) return reject(err);
            resolve(size);
        });
    });
};

module.exports.writeFile = function (filePath, data) {
    var tmpFilePath = filePath + ".tmp";
    var path = filePath.split("/").slice(0, -1).join("/");
    return FS.exists(path).then(function (exists) {
        if (exists) return Promise.resolve();
        return FS.makeTree(path);
    }).then(function () {
        return FS.write(tmpFilePath, data);
    }).then(function () {
        return FS.rename(tmpFilePath, filePath);
    });
};

module.exports.escaped = function (string) {
    return escapeHtml(string);
};

module.exports.escapedSelector = function (string) {
    if (typeof string !== 'string') {
        return string;
    }
    return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '-');
};

var JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);

function option(source, acceptable, def) {
    var _ref = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    var strict = _ref.strict;
    var invert = _ref.invert;
    var test = _ref.test;

    if (typeof source === 'undefined') {
        return def;
    }
    if (!(0, _underscore2.default)(acceptable).isArray()) {
        acceptable = [acceptable];
    }
    var converted = source;
    var accepted = acceptable.filter(function (a) {
        return typeof a === 'string' && JS_TYPES.has(a);
    }).some(function (a) {
        if ((typeof source === "undefined" ? "undefined" : _typeof(source)) === a) {
            return true;
        }
        if (strict) {
            return false;
        }
        switch (a) {
            case 'number':
                converted = +source;
                return !isNaN(converted);
            case 'boolean':
                converted = !!source;
                return true;
            case 'string':
                converted = '' + source;
                return true;
                break;
        }
    });
    if (invert) {
        accepted = !accepted;
    }
    if (typeof test === 'function') {
        accepted = accepted && test(converted);
    } else if ((0, _underscore2.default)(test).isRegExp()) {
        accepted = accepted && test.test(converted);
    }
    return accepted ? converted : def;
}

function testPostNumber(postNumber) {
    return postNumber > 0;
}

function selectParser(parse) {
    if (typeof parse === 'function') {
        return function (data) {
            if (typeof data === 'null' || typeof data === 'undefined') {
                return data;
            }
            return parse(data);
        };
    } else if (parse || typeof parse === 'undefined') {
        return function (data) {
            if (typeof data !== 'string') {
                return data;
            }
            return JSON.parse(data);
        };
    } else {
        return function (data) {
            return data;
        };
    }
}

function selectStringifier(stringify) {
    if (typeof stringify === 'function') {
        if (typeof data === 'null' || typeof data === 'undefined') {
            return data;
        }
        return stringify(data);
    } else if (stringify || typeof stringify === 'undefined') {
        return JSON.stringify.bind(null);
    } else {
        return function (data) {
            return data;
        };
    }
}

function cloned(value) {
    if ((0, _underscore2.default)(value).isArray()) {
        return value.slice(0).map(function (val) {
            return cloned(val);
        });
    } else if ((0, _underscore2.default)(value).isObject()) {
        return merge.recursive(true, value);
    } else {
        return value;
    }
}

function addIPv4(object, ip) {
    ip = ip || object && object.ip;
    if (!ip) {
        return object;
    }
    var ipv4 = module.exports.preferIPv4(ip);
    if (ipv4 && ipv4 !== ip) {
        object.ipv4 = ipv4;
    }
    return object;
}

function createWatchedResource(path, synchronous, asynchronous) {
    if (!FSSync.existsSync(path)) {
        return;
    }
    if (typeof asynchronous === 'function') {
        new _fsWatcher2.default(path).on('change', _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
            var exists;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.prev = 0;
                            _context.next = 3;
                            return FS.exists(path);

                        case 3:
                            exists = _context.sent;

                            if (!exists) {
                                _context.next = 7;
                                break;
                            }

                            _context.next = 7;
                            return asynchronous(path);

                        case 7:
                            _context.next = 12;
                            break;

                        case 9:
                            _context.prev = 9;
                            _context.t0 = _context["catch"](0);

                            _logger2.default.error(_context.t0.stack || _context.t0);

                        case 12:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, this, [[0, 9]]);
        })));
    }
    return synchronous(path);
}

var USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];

function compareRegisteredUserLevels(l1, l2) {
    return USER_LEVELS.indexOf(l1) - USER_LEVELS.indexOf(l2);
}

function postingSpeedString(launchDate, lastPostNumber) {
    launchDate = +launchDate;
    if (isNaN(launchDate)) return "-";
    var zeroSpeedString = function zeroSpeedString(nonZero) {
        if (lastPostNumber && launchDate) return "1 " + nonZero;else return "0 " + translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function speedString(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return ss.split(".").pop() != "0" ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = _underscore2.default.now() - launchDate;
    var duptime = uptimeMsecs / Hour;
    var uptime = Math.floor(duptime);
    var shour = translate("post(s) per hour.", "postingSpeed");
    if (!uptime) {
        return zeroSpeedString(shour);
    } else if (Math.floor(lastPostNumber / uptime) > 0) {
        return speedString(duptime) + " " + shour;
    } else {
        duptime /= 24;
        uptime = Math.floor(duptime);
        var sday = translate("post(s) per day.", "postingSpeed");
        if (!uptime) {
            return zeroSpeedString(sday);
        } else if (Math.floor(lastPostNumber / uptime) > 0) {
            return speedString(duptime) + " " + sday;
        } else {
            duptime /= 365.0 / 12.0;
            uptime = Math.floor(duptime);
            var smonth = translate("post(s) per month.", "postingSpeed");
            if (!uptime) {
                return zeroSpeedString(smonth);
            } else if (Math.floor(lastPostNumber / uptime) > 0) {
                return speedString(duptime) + " " + smonth;
            } else {
                duptime /= 12.0;
                uptime = Math.floor(duptime);
                var syear = translate("post(s) per year.", "postingSpeed");
                if (!uptime) return zeroSpeedString(syear);else if (Math.floor(lastPostNumber / uptime) > 0) return speedString(duptime) + " " + syear;else return "0 " + syear;
            }
        }
    }
}
//# sourceMappingURL=tools.js.map
