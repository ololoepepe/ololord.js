import _ from 'underscore';
var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var Crypto = require("crypto");
import escapeHTML from 'escape-html';
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

import config from './config';
import FSWatcher from './fs-watcher';
import Logger from './logger';

let translate = require("cute-localize")({
    locale: config("site.locale", "en"),
    extraLocations: __dirname + "/../translations/custom",
    silent: true
});

config.on('site.locale', (locale) => { translate.setLocale(locale); });

export { translate as translate };

var flags = {};
var rootZones = require("../misc/root-zones.json").reduce(function(acc, zone) {
    acc[zone] = {};
    return acc;
}, {});

mkpath.sync(config("system.tmpPath", __dirname + "/../tmp") + "/form");

const NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce((acc, prefix) => {
  return acc.concat(['combined', 'desktop', 'mobile'].map(suffix => `${prefix}base-${suffix}`));
}, []));
const STYLES_PATH = `${__dirname}/../public/css`;
const CODE_STYLES_PATH = `${__dirname}/../public/css/3rdparty/highlight.js`;
const JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const EXTERNAL_LINK_REGEXP_PATTERN = (function() {
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
export const BAN_LEVELS = ['NONE', 'READ_ONLY', 'NO_ACCESS'];
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

export let hashpass = function(req) {
    var s = req.cookies.hashpass;
    if (!mayBeHashpass(s))
        return;
    return s;
};

export let now = function() {
    return new Date();
};

export let externalLinkRootZoneExists = function(zoneName) {
    return rootZones.hasOwnProperty(zoneName);
};

export let toHtml = function(text, replaceSpaces) {
    text = escapeHTML(text).split("\n").join("<br />");
    if (replaceSpaces)
        text = text.split(" ").join("&nbsp;");
    return text;
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
            _(fields).each((val, key) => {
                if (1 == val.length)
                    fields[key] = val[0];
            });
            resolve({
                fields: fields,
                files: _(files).reduce((acc, files) => {
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
        _(arr).each((el, key) => {
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

export function loadPlugins(paths, filter) {
  if (typeof filter !== 'function') {
    if (typeof filter === 'undefined' || filter) {
      filter = (fileName) => { return 'index.js' !== fileName; };
    } else {
      filter = () => true;
    }
  }
  if (!_(paths).isArray()) {
    paths = [paths];
  }
  let list = paths.map((path, pathIndex) => {
    return FSSync.readdirSync(path).filter((fileName) => {
      return fileName.split('.').pop() === 'js';
    }).filter((fileName, index, fileNames) => {
      return filter(fileName, index, fileNames, path, pathIndex);
    }).map((fileName) => {
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

export function pad(what, length, ch) {
  what = '' + what;
  length = option(length, 'number', 2, { test: (l) => { return l > 0; } });
  if (!length) {
    return what;
  }
  if (length - what.length <= 0) {
    return what;
  }
  return Array(length - what.length + 1).join((ch || '0').toString()[0]) + what;
}

export function chunk(array, size) {
  return array.reduce((res, item, index) => {
    if (index % size === 0) {
      res.push([]);
    }
    res[res.length - 1].push(item);
    return res;
  }, []);
}
