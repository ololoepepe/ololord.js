"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ipList = exports.plainText = exports.generateTripcode = exports.series = exports.withoutDuplicates = exports.sha256 = exports.preferIPv4 = exports.correctAddress = exports.proxy = exports.parseForm = exports.splitCommand = exports.toHtml = exports.externalLinkRootZoneExists = exports.now = exports.setLocale = exports.hashpass = exports.CODE_STYLES = exports.STYLES = exports.BAN_LEVELS = exports.REGISTERED_USER_LEVELS = exports.NODE_CAPTCHA_ID = exports.FILE_RATINGS = exports.EXTERNAL_LINK_REGEXP_PATTERN = exports.HOUR = exports.MINUTE = exports.SECOND = exports.translate = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.mayBeHashpass = mayBeHashpass;
exports.sha1 = sha1;
exports.option = option;
exports.testPostNumber = testPostNumber;
exports.cloned = cloned;
exports.addIPv4 = addIPv4;
exports.createWatchedResource = createWatchedResource;
exports.compareRegisteredUserLevels = compareRegisteredUserLevels;
exports.postingSpeedString = postingSpeedString;
exports.requireWrapper = requireWrapper;
exports.loadPlugins = loadPlugins;
exports.toHashpass = toHashpass;
exports.processError = processError;
exports.rerenderPostsTargetsFromString = rerenderPostsTargetsFromString;
exports.pad = pad;

var _underscore = require("underscore");

var _underscore2 = _interopRequireDefault(_underscore);

var _escapeHtml = require("escape-html");

var _escapeHtml2 = _interopRequireDefault(_escapeHtml);

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _fsWatcher = require("./fs-watcher");

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _logger = require("./logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var Crypto = require("crypto");
var equal = require("deep-equal");

var FS = require("q-io/fs");
var FSSync = require("fs");
var HTMLToText = require("html-to-text");
var merge = require("merge");
var mkpath = require("mkpath");
var Multiparty = require("multiparty");
var Path = require("path");
var promisify = require("promisify-node");
var Util = require("util");
var UUID = require("uuid");
var XRegExp = require("xregexp");

var translate = require("cute-localize")({
    locale: (0, _config2.default)("site.locale", "en"),
    extraLocations: __dirname + "/../translations/custom",
    silent: true
});

exports.translate = translate;


var flags = {};
var rootZones = require("../misc/root-zones.json").reduce(function (acc, zone) {
    acc[zone] = {};
    return acc;
}, {});

mkpath.sync((0, _config2.default)("system.tmpPath", __dirname + "/../tmp") + "/form");

var NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce(function (acc, prefix) {
    return acc.concat(['combined', 'desktop', 'mobile'].map(function (suffix) {
        return prefix + "base-" + suffix;
    }));
}, []));
var STYLES_PATH = __dirname + "/../public/css";
var CODE_STYLES_PATH = __dirname + "/../public/css/3rdparty/highlight.js";
var JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);

var SECOND = exports.SECOND = 1000;
var MINUTE = exports.MINUTE = 60 * SECOND;
var HOUR = exports.HOUR = 60 * MINUTE;
var EXTERNAL_LINK_REGEXP_PATTERN = exports.EXTERNAL_LINK_REGEXP_PATTERN = function () {
    var schema = "https?:\\/\\/|ftp:\\/\\/";
    var ip = "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}" + "(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])";
    var hostname = "([\\w\\p{L}\\.\\-]+)\\.([\\p{L}]{2,17}\\.?)";
    var port = ":\\d+";
    var path = "(\\/[\\w\\p{L}\\.\\-\\!\\?\\=\\+#~&%:;\'\"\\,\\(\\)\\[\\]«»]*)*\\/?";
    return "(" + schema + ")?(" + hostname + "|" + ip + ")(" + port + ")?" + path;
}();
var FILE_RATINGS = exports.FILE_RATINGS = ['SFW', 'R-15', 'R-18', 'R-18G'];
var NODE_CAPTCHA_ID = exports.NODE_CAPTCHA_ID = 'node-captcha';
var REGISTERED_USER_LEVELS = exports.REGISTERED_USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];
var BAN_LEVELS = exports.BAN_LEVELS = ['NONE', 'READ_ONLY', 'NO_ACCESS'];
var STYLES = exports.STYLES = FSSync.readdirSync(STYLES_PATH).filter(function (fileName) {
    return fileName.split('.').pop() === 'css' && !NON_THEME_STYLESHEETS.has(fileName.split('.').shift());
}).map(function (fileName) {
    var name = fileName.split('.').slice(0, -1).join('.');
    var match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(FSSync.readFileSync(STYLES_PATH + "/" + fileName, 'utf8'));
    return {
        name: name,
        title: match ? match[1] : name
    };
});

var CODE_STYLES = exports.CODE_STYLES = FSSync.readdirSync(CODE_STYLES_PATH).filter(function (fileName) {
    return fileName.split('.').pop() === 'css';
}).map(function (fileName) {
    var name = fileName.split('.').slice(0, -1).join('.');
    var match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(FSSync.readFileSync(CODE_STYLES_PATH + "/" + fileName, 'utf8'));
    return {
        name: name,
        title: match ? match[1] : name
    };
});

var hashpass = exports.hashpass = function hashpass(req) {
    var s = req.cookies.hashpass;
    if (!mayBeHashpass(s)) return;
    return s;
};

var setLocale = exports.setLocale = function setLocale(locale) {
    translate.setLocale(locale);
};

var now = exports.now = function now() {
    return new Date();
};

var externalLinkRootZoneExists = exports.externalLinkRootZoneExists = function externalLinkRootZoneExists(zoneName) {
    return rootZones.hasOwnProperty(zoneName);
};

var toHtml = exports.toHtml = function toHtml(text, replaceSpaces) {
    text = (0, _escapeHtml2.default)(text).split("\n").join("<br />");
    if (replaceSpaces) text = text.split(" ").join("&nbsp;");
    return text;
};

var splitCommand = exports.splitCommand = function splitCommand(cmd) {
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

function mayBeHashpass(password) {
    return typeof password === 'string' && password.match(/^([0-9a-fA-F]){40}$/);
}

var parseForm = exports.parseForm = function parseForm(req) {
    if (req.formFields) {
        return Promise.resolve({
            fields: req.formFields,
            files: req.formFiles || []
        });
    }
    var form = new Multiparty.Form();
    form.uploadDir = (0, _config2.default)("system.tmpPath", __dirname + "/../tmp") + "/form";
    form.autoFields = true;
    form.autoFiles = true;
    form.maxFieldsSize = 5 * 1024 * 1024;
    return new Promise(function (resolve, reject) {
        form.parse(req, function (err, fields, files) {
            if (err) return reject(err);
            (0, _underscore2.default)(fields).each(function (val, key) {
                if (1 == val.length) fields[key] = val[0];
            });
            resolve({
                fields: fields,
                files: (0, _underscore2.default)(files).reduce(function (acc, files) {
                    return acc.concat(files);
                }, []).map(function (file) {
                    file.name = file.originalFilename;
                    return file;
                })
            });
        });
    });
};

var proxy = exports.proxy = function proxy() {
    var proxy = (0, _config2.default)("system.fileDownloadProxy");
    if (!proxy) return null;
    var parts = proxy.split(":");
    var auth = (0, _config2.default)("system.fileDownloadProxyAuth");
    return {
        host: parts[0],
        port: parts[1] ? +parts[1] : null,
        auth: auth ? "Basic " + new Buffer(auth).toString("base64") : null
    };
};

var correctAddress = exports.correctAddress = function correctAddress(ip) {
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

var preferIPv4 = exports.preferIPv4 = function preferIPv4(ip) {
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

function sha1(data) {
    if (!data || typeof data !== 'string' && !Util.isBuffer(data)) {
        return null;
    }
    var hash = Crypto.createHash('sha1');
    hash.update(data);
    return hash.digest('hex');
}

var sha256 = exports.sha256 = function sha256(data) {
    if (!data) return null;
    var sha256 = Crypto.createHash("sha256");
    sha256.update(data);
    return sha256.digest("hex");
};

var withoutDuplicates = exports.withoutDuplicates = function withoutDuplicates(arr) {
    if (!arr || !Util.isArray(arr)) return arr;
    return arr.filter(function (item, i) {
        return arr.indexOf(item) == i;
    });
};

var series = exports.series = function series(arr, f, container) {
    if (container && (typeof container === "undefined" ? "undefined" : _typeof(container)) != "object") container = [];
    var isArray = Util.isArray(container);
    var isObject = (typeof container === "undefined" ? "undefined" : _typeof(container)) == "object";
    var p = Promise.resolve();
    if (Util.isArray(arr)) {
        arr.forEach(function (el, index) {
            p = p.then(function () {
                return f(el, index);
            }).then(function (result) {
                if (isArray) container.push(result);else if (isObject) container[el] = result;
            });
        });
    } else if (Util.isObject(arr)) {
        (0, _underscore2.default)(arr).each(function (el, key) {
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

var generateTripcode = exports.generateTripcode = function generateTripcode(source) {
    var md5 = Crypto.createHash("md5");
    md5.update(source + (0, _config2.default)("site.tripcodeSalt", ""));
    return "!" + md5.digest("base64").substr(0, 10);
};

var plainText = exports.plainText = function plainText(text, options) {
    if (!text) return "";
    text = "" + text;
    var uuid = UUID.v4();
    if (options && options.brToNewline) text = text.replace(/<br \/>/g, uuid);else text = text.replace(/<br \/>/g, " ");
    text = HTMLToText.fromString(text, {
        wordwrap: null,
        linkHrefBaseUrl: (0, _config2.default)("site.protocol", "http") + "://" + (0, _config2.default)("site.domain", "localhost:8080"),
        hideLinkHrefIfSameAsText: true,
        ignoreImages: true
    });
    if (options && options.brToNewline) text = text.split(uuid).join("\n");
    return text;
};

var ipList = exports.ipList = function ipList(s) {
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
    var ipv4 = preferIPv4(ip);
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

function compareRegisteredUserLevels(l1, l2) {
    return REGISTERED_USER_LEVELS.indexOf(l1) - REGISTERED_USER_LEVELS.indexOf(l2);
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
    var duptime = uptimeMsecs / HOUR;
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

function requireWrapper(m) {
    return m && m.default || m;
}

function loadPlugins(paths, filter) {
    if (typeof filter !== 'function') {
        if (typeof filter === 'undefined' || filter) {
            filter = function filter(fileName) {
                return 'index.js' !== fileName;
            };
        } else {
            filter = function filter() {
                return true;
            };
        }
    }
    if (!(0, _underscore2.default)(paths).isArray()) {
        paths = [paths];
    }
    var list = paths.map(function (path, pathIndex) {
        return FSSync.readdirSync(path).filter(function (fileName) {
            return fileName.split('.').pop() === 'js';
        }).filter(function (fileName, index, fileNames) {
            return filter(fileName, index, fileNames, path, pathIndex);
        }).map(function (fileName) {
            var id = require.resolve(path + "/" + fileName);
            if (require.cache.hasOwnProperty(id)) {
                delete require.cache[id];
            }
            var plugins = requireWrapper(require(id));
            if (!(0, _underscore2.default)(plugins).isArray()) {
                plugins = [plugins];
            }
            return plugins;
        });
    });
    return (0, _underscore2.default)(list).flatten();
}

function toHashpass(password, notHashpass) {
    if (notHashpass || !mayBeHashpass(password)) {
        password = sha1(password);
    }
    return password;
}

function processError(err, dir) {
    if ('ENOENT' === err.code) {
        err.status = 404;
    } else if (typeof dir !== 'undefined') {
        if (dir && 'ENOTDIR' === err.code) {
            err = new Error(Tools.translate('Not a directory'));
        } else if (!dir && 'EISDIR' === err.code) {
            err = new Error(Tools.translate('Not a file'));
        }
    }
    return err;
}

function rerenderPostsTargetsFromString(string) {
    if (!string || typeof string !== 'string') {
        return {};
    }
    return string.split(/\s+/).reduce(function (acc, part) {
        var _part$split = part.split(':');

        var _part$split2 = _toArray(_part$split);

        var boardName = _part$split2[0];

        var postNumbers = _part$split2.slice(1);

        if (boardName) {
            if (postNumbers.length > 0) {
                acc[boardName] = postNumbers.map(function (postNumber) {
                    return option(postNumber, 'number', 0, { test: testPostNumber });
                }).filter(function (postNumber) {
                    return !!postNumber;
                });
            } else {
                acc[boardName] = '*';
            }
        }
        return acc;
    }, {});
}

function pad(what, length, ch) {
    what = '' + what;
    length = option(length, 'number', 2, { test: function test(l) {
            return l > 0;
        } });
    if (!length) {
        return what;
    }
    if (length - what.length <= 0) {
        return what;
    }
    return Array(length - what.length).join((ch || '0').toString()[0]) + what;
}
//# sourceMappingURL=tools.js.map
