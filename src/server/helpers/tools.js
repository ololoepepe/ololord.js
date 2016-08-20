import _ from 'underscore';
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

import config from './config';
import FSWatcher from './fs-watcher';
import Logger from './logger';

let translate = require("cute-localize")({
    locale: config("site.locale", "en"),
    extraLocations: __dirname + "/../translations/custom",
    silent: true
});

export { translate as translate };

var flags = {};
var rootZones = require("../misc/root-zones.json").reduce(function(acc, zone) {
    acc[zone] = {};
    return acc;
}, {});

MathJax.config({ MathJax: {} });
MathJax.start();

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/form");

export const Billion = 2 * 1000 * 1000 * 1000;
export const Second = 1000;
export const Minute = 60 * 1000;
export const Hour = 60 * 60 * 1000;
export const ExternalLinkRegexpPattern = (function() {
    var schema = "https?:\\/\\/|ftp:\\/\\/";
    var ip = "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}"
        + "(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])";
    var hostname = "([\\w\\p{L}\\.\\-]+)\\.([\\p{L}]{2,17}\\.?)";
    var port = ":\\d+";
    var path = "(\\/[\\w\\p{L}\\.\\-\\!\\?\\=\\+#~&%:;\'\"\\,\\(\\)\\[\\]«»]*)*\\/?";
    return "(" + schema + ")?(" + hostname + "|" + ip + ")(" + port + ")?" + path;
})();
export const FILE_RATINGS = ['SFW', 'R-15', 'R-18', 'R-18G'];
export const NODE_CAPTCHA_ID = 'node-captcha';
export const REGISTERED_USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];

export let forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

export let mapIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            arr.push(f(obj[x], x));
    }
    return arr;
};

export let filterIn = function(obj, f) {
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

export let toArray = function(obj) {
    var arr = [];
    forIn(obj, function(val) {
        arr.push(val);
    });
    return arr;
};

export let promiseIf = function(condition, ifTrue, ifFalse) {
    if (condition)
        return ifTrue();
    else if (typeof ifFalse == "function")
        return ifFalse();
    else
        return Promise.resolve();
};

export let extend = function(Child, Parent) {
    var F = function() {};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
};

export let arr = function(obj) {
    var arr = [];
    if (!obj || !obj.length)
        return arr;
    for (var i = 0; i < obj.length; ++i)
        arr.push(obj[i]);
    return arr;
};

export let contains = function(s, subs) {
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

export let hasOwnProperties = function(obj) {
    if (!obj)
        return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            return true;
    }
    return false;
};

export let replace = function(where, what, withWhat) {
    if (typeof where != "string" || (typeof what != "string" && !(what instanceof RegExp)) || typeof withWhat != "string")
        return;
    var sl = where.split(what);
    return (sl.length > 1) ? sl.join(withWhat) : sl.pop();
};

export let toUTC = function(date) {
    if (!(date instanceof Date))
        return;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(),
        date.getUTCMinutes(), date.getUTCSeconds(), date.getMilliseconds());
};

export let hashpass = function(req) {
    var s = req.cookies.hashpass;
    if (!mayBeHashpass(s))
        return;
    return s;
};

export let flagName = function(countryCode) {
    if (!countryCode)
        return Promise.resolve("");
    var fn = countryCode.toUpperCase() + ".png";
    if (flags.hasOwnProperty(fn))
        return Promise.resolve(fn);
    return FS.exists(__dirname + "/../public/img/flags/" + fn).then(function(exists) {
        if (exists)
            flags[fn] = true;
        return Promise.resolve(exists ? fn : "");
    });
};

export let setLocale = function(locale) {
    translate.setLocale(locale);
};

export let now = function() {
    return new Date();
};

export let forever = function() {
    var date = new Date();
    date.setTime(date.getTime() + Billion * 1000);
    return date;
};

export let externalLinkRootZoneExists = function(zoneName) {
    return rootZones.hasOwnProperty(zoneName);
};

export let toHtml = function(text, replaceSpaces) {
    text = escapeHtml(text).split("\n").join("<br />");
    if (replaceSpaces)
        text = text.split(" ").join("&nbsp;");
    return text;
};

let NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce((acc, prefix) => {
  return acc.concat(['combined', 'desktop', 'mobile'].map(suffix => `${prefix}base-${suffix}`));
}, []));

const STYLES_PATH = `${__dirname}/../public/css`;

export const STYLES = FSSync.readdirSync(STYLES_PATH).filter((fileName) => {
  return fileName.split('.').pop() === 'css' && !NON_THEME_STYLESHEETS.has(fileName.split('.').shift());
}).map((fileName) => {
  let name = fileName.split('.').slice(0, -1).join('.');
  let match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(FSSync.readFileSync(`${STYLES_PATH}/${fileName}`, 'utf8'));
  return {
    name: name,
    title: (match ? match[1] : name)
  };
});

const CODE_STYLES_PATH = `${__dirname}/../public/css/3rdparty/highlight.js`;

export const CODE_STYLES = FSSync.readdirSync(CODE_STYLES_PATH).filter((fileName) => {
  return fileName.split('.').pop() === 'css';
}).map((fileName) => {
  let name = fileName.split('.').slice(0, -1).join('.');
  let match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(FSSync.readFileSync(`${CODE_STYLES_PATH}/${fileName}`, 'utf8'));
  return {
    name: name,
    title: (match ? match[1] : name)
  };
});

export let mimeType = function(fileName) {
    if (!fileName || !Util.isString(fileName))
        return Promise.resolve(null);
    try {
        return new Promise(function(resolve, reject) {
            ChildProcess.exec(`file --brief --mime-type ${fileName}`, {
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

export let isAudioType = function(mimeType) {
    return "application/ogg" == mimeType || mimeType.substr(0, 6) == "audio/";
};

export let isVideoType = function(mimeType) {
    return mimeType.substr(0, 6) == "video/";
};

export let isPdfType = function(mimeType) {
    return mimeType == "application/pdf";
};

export let isImageType = function(mimeType) {
    return mimeType.substr(0, 6) == "image/";
};

export let splitCommand = function(cmd) {
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

export function mayBeHashpass(password) {
  return (typeof password === 'string') && password.match(/^([0-9a-fA-F]){40}$/);
}

export let parseForm = function(req) {
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
    return new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
            if (err)
                return reject(err);
            forIn(fields, function(val, key) {
                if (1 == val.length)
                    fields[key] = val[0];
            });
            resolve({
                fields: fields,
                files: toArray(files).reduce(function(acc, files) {
                    return acc.concat(files);
                }, []).map(function(file) {
                    file.name = file.originalFilename;
                    return file;
                })
            });
        });
    });
};

export let proxy = function() {
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

export let correctAddress = function(ip) {
    if (!ip || typeof ip !== 'string')
        return null;
    if ("::1" == ip)
        ip = "127.0.0.1";
    var match = ip.match(/^\:\:ffff\:(\d+\.\d+\.\d+\.\d+)$/);
    if (match)
        ip = match[1];
    if (ip.replace(":", "") == ip)
        ip = "::" + ip;
    try {
        var address = new Address6(ip);
        if (address.isValid())
            return address.correctForm();
    } catch (err) {
        //
    }
    try {
        var address = Address6.fromAddress4(ip);
        if (address.isValid())
            return address.correctForm();
    } catch (err) {
        //
    }
    return null;
};

export let preferIPv4 = function(ip) {
    if (!ip)
        return null;
    try {
        var address = new Address6(ip);
        var ipv4 = address.to4();
        if (ipv4.isValid()) {
            ipv4 = ipv4.correctForm();
            return ("0.0.0.1" == ipv4) ? "127.0.0.1" : ipv4;
        }
        if (address.isValid())
            return address.correctForm();
        return ip;
    } catch (err) {
        //
    }
    return ip;
};

export function sha1(data) {
  if (!data || (typeof data !== 'string' && !Util.isBuffer(data))) {
    return null;
  }
  let hash = Crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
}

export let sha256 = function(data) {
    if (!data)
        return null;
    var sha256 = Crypto.createHash("sha256");
    sha256.update(data);
    return sha256.digest("hex");
};

export let withoutDuplicates = function(arr) {
    if (!arr || !Util.isArray(arr))
        return arr;
    return arr.filter(function(item, i) {
        return arr.indexOf(item) == i;
    });
};

export let remove = function(arr, what, both) {
    if (!arr || !Util.isArray(arr))
        return arr;
    if (Util.isUndefined(what))
        return;
    if (!Util.isArray(what))
        what = [what];
    for (var i = what.length - 1; i >= 0; --i) {
        var ind = arr.indexOf(what[i]);
        if (ind >= 0) {
            arr.splice(ind, 1);
            if (both)
                what.splice(i, 1);
        }
    }
};

export let series = function(arr, f, container) {
    if (container && typeof container != "object")
        container = [];
    var isArray = Util.isArray(container);
    var isObject = (typeof container == "object");
    var p = Promise.resolve();
    if (Util.isArray(arr)) {
        arr.forEach(function(el, index) {
            p = p.then(function() {
                return f(el, index);
            }).then(function(result) {
                if (isArray)
                    container.push(result);
                else if (isObject)
                    container[el] = result;
            });
        });
    } else if (Util.isObject(arr)) {
        forIn(arr, function(el, key) {
            p = p.then(function() {
                return f(el, key);
            }).then(function(result) {
                if (isArray)
                    container.push(result);
                else if (isObject)
                    container[key] = result;
            });
        });
    }
    if (!container)
        return p;
    return p.then(function() {
        return Promise.resolve(container);
    });
};

export let generateTripcode = function(source) {
    var md5 = Crypto.createHash("md5");
    md5.update(source + config("site.tripcodeSalt", ""));
    return "!" + md5.digest("base64").substr(0, 10);
};

export let plainText = function(text, options) {
    if (!text)
        return "";
    text = "" + text;
    var uuid = UUID.v4();
    if (options && options.brToNewline)
        text = text.replace(/<br \/>/g, uuid);
    else
        text = text.replace(/<br \/>/g, " ");
    text = HTMLToText.fromString(text, {
        wordwrap: null,
        linkHrefBaseUrl: config("site.protocol", "http") + "://" + config("site.domain", "localhost:8080"),
        hideLinkHrefIfSameAsText: true,
        ignoreImages: true
    });
    if (options && options.brToNewline)
        text = text.split(uuid).join("\n");
    return text;
};

export let ipList = function(s) {
    var ips = (s || "").split(/\s+/).filter(function(ip) {
        return ip;
    });
    //TODO: IP ranges
    var err = ips.some(function(ip, i) {
        ip = correctAddress(ip);
        if (!ip)
            return true;
        ips[i] = ip;
    });
    if (err)
        return translate("Invalid IP address");
    return withoutDuplicates(ips);
};

export let markupLatex = function(text, inline) {
    return new Promise(function(resolve, reject) {
        MathJax.typeset({
            math: text,
            format: inline ? "inline-TeX" : "TeX",
            svg: true
        }, function(data) {
            if (data.errors)
                return reject(data.errors[0] || data.errors);
            var html = data.svg;
            if (inline)
                html = `<span class="latex-inline">${html}</span>`;
            else
                html = `<div class="latex-block">${html}</div>`;
            resolve(html);
        });
    });
};

export let generateImageHash = function(fileName) {
    return phash(fileName, true).then(function(hash) {
        return Promise.resolve(hash.toString());
    });
};

export let generateRandomImage = function(hash, mimeType, thumbPath) {
    var canvas = new Canvas(200, 200);
    var ctx = canvas.getContext("2d");
    Jdenticon.drawIcon(ctx, hash, 200);
    return FS.read(__dirname + "/../thumbs/" + mimeType + ".png", "b").then(function(data) {
        var img = new Image;
        img.src = data;
        ctx.drawImage(img, 0, 0, 200, 200);
        return new Promise(function(resolve, reject) {
            canvas.pngStream().pipe(FSSync.createWriteStream(thumbPath).on("error", reject).on("finish", resolve));
        });
    });
};

export function du(path) {
    return new Promise(function(resolve, reject) {
        du(path, function(err, size) {
            if (err)
                return reject(err);
            resolve(size);
        });
    });
}

export let writeFile = function(filePath, data) {
    var tmpFilePath = filePath + ".tmp";
    var path = filePath.split("/").slice(0, -1).join("/");
    return FS.exists(path).then(function(exists) {
        if (exists)
            return Promise.resolve();
        return FS.makeTree(path);
    }).then(function() {
        return FS.write(tmpFilePath, data);
    }).then(function() {
        return FS.rename(tmpFilePath, filePath);
    });
};

export let escaped = function(string) {
  return escapeHtml(string);
}

export let escapedSelector = function(string) {
  if (typeof string !== 'string') {
    return string;
  }
  return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '-');
};

const JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);

export function option(source, acceptable, def, { strict, invert, test } = {}) {
  if (typeof source === 'undefined') {
    return def;
  }
  if (!_(acceptable).isArray()) {
    acceptable = [acceptable];
  }
  let converted = source;
  let accepted = acceptable.filter((a) => { return typeof a === 'string' && JS_TYPES.has(a); }).some((a) => {
    if (typeof source === a) {
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
  } else if (_(test).isRegExp()) {
    accepted = accepted && test.test(converted);
  }
  return accepted ? converted : def;
}

export function testPostNumber(postNumber) {
  return postNumber > 0;
}

export function cloned(value) {
  if (_(value).isArray()) {
    return value.slice(0).map(val => cloned(val));
  } else if (_(value).isObject()) {
    return merge.recursive(true, value);
  } else {
    return value;
  }
}

export function addIPv4(object, ip) {
  ip = ip || (object && object.ip);
  if (!ip) {
    return object;
  }
  let ipv4 = preferIPv4(ip);
  if (ipv4 && ipv4 !== ip) {
    object.ipv4 = ipv4;
  }
  return object;
}

export function createWatchedResource(path, synchronous, asynchronous) {
  if (!FSSync.existsSync(path)) {
    return;
  }
  if (typeof asynchronous === 'function') {
    (new FSWatcher(path)).on('change', async function() {
      try {
        let exists = await FS.exists(path);
        if (exists) {
          await asynchronous(path);
        }
      } catch (err) {
        Logger.error(err.stack || err);
      }
    });
  }
  return synchronous(path);
}

export function compareRegisteredUserLevels(l1, l2) {
  return REGISTERED_USER_LEVELS.indexOf(l1) - REGISTERED_USER_LEVELS.indexOf(l2);
}

export function postingSpeedString(launchDate, lastPostNumber) {
  launchDate = +launchDate;
    if (isNaN(launchDate))
        return "-";
    var zeroSpeedString = function(nonZero) {
        if (lastPostNumber && launchDate)
            return "1 " + nonZero;
        else
            return "0 " + translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return (ss.split(".").pop() != "0") ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = _.now() - launchDate;
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
            duptime /= (365.0 / 12.0);
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
                if (!uptime)
                    return zeroSpeedString(syear);
                else if (Math.floor(lastPostNumber / uptime) > 0)
                    return speedString(duptime) + " " + syear;
                else
                    return "0 " + syear;
            }
        }
    }
}

export function requireWrapper(m) {
  return (m && m.default) || m;
}

export function loadPlugins(path, filter) {
  if (typeof filter !== 'function') {
    if (typeof filter === 'undefined' || filter) {
      filter = (fileName) => { return 'index.js' !== fileName; };
    } else {
      filter = () => true;
    }
  }
  let list = FSSync.readdirSync(path).filter((fileName) => {
    return fileName.split('.').pop() === 'js';
  }).filter(filter).map((fileName) => {
    let id = require.resolve(`${path}/${fileName}`);
    if (require.cache.hasOwnProperty(id)) {
      delete require.cache[id];
    }
    let plugins = requireWrapper(require(id));
    if (!_(plugins).isArray()) {
      plugins = [plugins];
    }
    return plugins;
  });
  return _(list).flatten();
}

export function toHashpass(password, notHashpass) {
  if (notHashpass || !mayBeHashpass(password)) {
    password = sha1(password);
  }
  return password;
}

export function processError(err, dir) {
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

export function mixin(Parent, ...mixins) {
  if (typeof Parent !== 'function') {
    Parent = class {};
  }
  class Mixed extends Parent {};
  mixins.forEach((mixin) => {
    for (let prop in mixin) {
      Mixed.prototype[prop] = mixin[prop];
    }
  });
  return Mixed;
}

export function rerenderPostsTargetsFromString(string) {
  if (!string || typeof string !== 'string') {
    return {};
  }
  return string.split(/\s+/).reduce((acc, part) => {
    let [boardName, ...postNumbers] = part.split(':');
    if (boardName) {
      if (postNumbers.length > 0) {
        acc[boardName] = postNumbers.map((postNumber) => {
          return option(postNumber, 'number', 0, { test: testPostNumber })
        }).filter(postNumber => !!postNumber);
      } else {
        acc[boardName] = '*';
      }
    }
    return acc;
  }, {});
}
