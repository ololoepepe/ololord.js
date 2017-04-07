'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.series = exports.CODE_STYLES = exports.STYLES = exports.BAN_LEVELS = exports.REGISTERED_USER_LEVELS = exports.NODE_CAPTCHA_ID = exports.FILE_RATINGS = exports.DAY = exports.HOUR = exports.MINUTE = exports.SECOND = exports.translate = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var series = exports.series = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(arr, f, container) {
    var isArray, isObject, p;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (container && (typeof container === 'undefined' ? 'undefined' : _typeof(container)) !== 'object') {
              container = [];
            }
            isArray = (0, _underscore2.default)(container).isArray();
            isObject = (typeof container === 'undefined' ? 'undefined' : _typeof(container)) === 'object';
            p = Promise.resolve();

            if ((0, _underscore2.default)(arr).isArray()) {
              arr.forEach(function (el, index) {
                p = p.then(function () {
                  return f(el, index);
                }).then(function (result) {
                  if (isArray) {
                    container.push(result);
                  } else if (isObject) {
                    container[el] = result;
                  }
                });
              });
            } else if ((0, _underscore2.default)(arr).isObject()) {
              (0, _underscore2.default)(arr).each(function (el, key) {
                p = p.then(function () {
                  return f(el, key);
                }).then(function (result) {
                  if (isArray) {
                    container.push(result);
                  } else if (isObject) {
                    container[key] = result;
                  }
                });
              });
            }

            if (container) {
              _context.next = 7;
              break;
            }

            return _context.abrupt('return', p);

          case 7:
            return _context.abrupt('return', p.then(function () {
              return container;
            }));

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function series(_x2, _x3, _x4) {
    return ref.apply(this, arguments);
  };
}();

exports.now = now;
exports.mayBeHashpass = mayBeHashpass;
exports.correctAddress = correctAddress;
exports.binaryAddress = binaryAddress;
exports.subnet = subnet;
exports.preferIPv4 = preferIPv4;
exports.crypto = crypto;
exports.sha1 = sha1;
exports.ipList = ipList;
exports.option = option;
exports.testPostNumber = testPostNumber;
exports.cloned = cloned;
exports.addIPv4 = addIPv4;
exports.compareRegisteredUserLevels = compareRegisteredUserLevels;
exports.requireWrapper = requireWrapper;
exports.loadPlugins = loadPlugins;
exports.toHashpass = toHashpass;
exports.processError = processError;
exports.pad = pad;
exports.chunk = chunk;
exports.escapeRegExp = escapeRegExp;
exports.create404Error = create404Error;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _ipAddress = require('ip-address');

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var translate = require('cute-localize')({
  locale: (0, _config2.default)('site.locale'),
  extraLocations: __dirname + '/../../translations/custom',
  silent: true
});

_config2.default.on('site.locale', function (locale) {
  translate.setLocale(locale);
});

exports.translate = translate;


var NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce(function (acc, prefix) {
  return acc.concat(['combined', 'desktop', 'mobile'].map(function (suffix) {
    return prefix + 'base-' + suffix;
  }));
}, []));
var STYLES_PATH = __dirname + '/../../public/css';
var CODE_STYLES_PATH = __dirname + '/../../public/css/3rdparty/highlight.js';
var JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);
var IP_V6_MAX_SUBNET = 128;
var IP_V4_MAX_SUBNET = 32;

var SECOND = exports.SECOND = 1000;
var MINUTE = exports.MINUTE = 60 * SECOND;
var HOUR = exports.HOUR = 60 * MINUTE;
var DAY = exports.DAY = 24 * HOUR;
var FILE_RATINGS = exports.FILE_RATINGS = ['SFW', 'R-15', 'R-18', 'R-18G'];
var NODE_CAPTCHA_ID = exports.NODE_CAPTCHA_ID = 'node-captcha';
var REGISTERED_USER_LEVELS = exports.REGISTERED_USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];
var BAN_LEVELS = exports.BAN_LEVELS = ['NONE', 'READ_ONLY', 'NO_ACCESS'];
var STYLES = exports.STYLES = _fs2.default.readdirSync(STYLES_PATH).filter(function (fileName) {
  return fileName.split('.').pop() === 'css' && !NON_THEME_STYLESHEETS.has(fileName.split('.').shift());
}).map(function (fileName) {
  var name = fileName.split('.').slice(0, -1).join('.');
  var match = /\/\*\!\s*([^\*]+?)\s*\*\//gi.exec(_fs2.default.readFileSync(STYLES_PATH + '/' + fileName, 'utf8'));
  return {
    name: name,
    title: match ? match[1] : name
  };
});

var CODE_STYLES = exports.CODE_STYLES = _fs2.default.readdirSync(CODE_STYLES_PATH).filter(function (fileName) {
  return fileName.split('.').pop() === 'css';
}).map(function (fileName) {
  var name = fileName.split('.').slice(0, -1).join('.');
  var match = /\/\*\s*([^\*]+?)\s*\*\//gi.exec(_fs2.default.readFileSync(CODE_STYLES_PATH + '/' + fileName, 'utf8'));
  return {
    name: name,
    title: match ? match[1] : name
  };
});

function now() {
  return new Date();
}

function mayBeHashpass(password) {
  return typeof password === 'string' && password.match(/^([0-9a-fA-F]){40}$/);
}

function correctAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return null;
  }
  if ('::1' === ip) {
    ip = '127.0.0.1';
  }
  var match = ip.match(/^\:\:ffff\:(\d+\.\d+\.\d+\.\d+)$/);
  if (match) {
    ip = match[1];
  }
  if (ip.replace(':', '') === ip) {
    ip = '::' + ip;
  }
  try {
    var address = new _ipAddress.Address6(ip);
    if (address.isValid()) {
      return address.correctForm();
    }
  } catch (err) {
    //
  }
  try {
    var _address = _ipAddress.Address6.fromAddress4(ip);
    if (_address.isValid()) {
      return _address.correctForm();
    }
  } catch (err) {
    //
  }
  return null;
}

function binaryAddress(address) {
  if (!(address instanceof _ipAddress.Address6)) {
    address = new _ipAddress.Address6(correctAddress(address));
  }
  return Buffer.from(address.toUnsignedByteArray());
}

function subnet(ip, s) {
  s = +s;
  if (isNaN(s) || s <= 0) {
    return null;
  }
  var ns = s;
  if (ns <= IP_V4_MAX_SUBNET) {
    ns = IP_V6_MAX_SUBNET - (IP_V4_MAX_SUBNET - ns);
  }
  try {
    var address = new _ipAddress.Address6(correctAddress(ip) + '/' + ns);
    if (! +address.possibleSubnets(ns)) {
      return null;
    }
    return {
      subnet: s,
      start: binaryAddress(address.startAddress()),
      end: binaryAddress(address.endAddress())
    };
  } catch (err) {
    return null;
  }
}

function preferIPv4(ip) {
  if (!ip) {
    return null;
  }
  try {
    var address = new _ipAddress.Address6(ip);
    var ipv4 = address.to4();
    if (ipv4.isValid()) {
      ipv4 = ipv4.correctForm();
      return '0.0.0.1' === ipv4 ? '127.0.0.1' : ipv4;
    }
    if (address.isValid()) {
      return address.correctForm();
    }
    return ip;
  } catch (err) {
    //
  }
  return ip;
}

function crypto(algorithm, data) {
  var encoding = arguments.length <= 2 || arguments[2] === undefined ? 'hex' : arguments[2];

  if (!data || typeof data !== 'string' && !_util2.default.isBuffer(data)) {
    return null;
  }
  var hash = _crypto2.default.createHash(algorithm);
  hash.update(data);
  return hash.digest(encoding);
}

function sha1() {
  return crypto.apply(undefined, ['sha1'].concat(Array.prototype.slice.call(arguments)));
}

function ipList(s) {
  var ips = (s || '').split(/\s+/).filter(function (ip) {
    return !!ip;
  });
  //TODO: IP ranges
  ips = ips.map(function (ip) {
    return correctAddress(ip);
  });
  if (ips.some(function (ip) {
    return !ip;
  })) {
    returntranslate('Invalid IP address');
  }
  return (0, _underscore2.default)(ips).uniq();
}

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
    if ((typeof source === 'undefined' ? 'undefined' : _typeof(source)) === a) {
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
    return _merge2.default.recursive(true, value);
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

function compareRegisteredUserLevels(l1, l2) {
  return REGISTERED_USER_LEVELS.indexOf(l1) - REGISTERED_USER_LEVELS.indexOf(l2);
}

function requireWrapper(m) {
  return m && m.default || m;
}

function loadPlugins(paths, filter, keepCache) {
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
    return _fs2.default.readdirSync(path).filter(function (fileName) {
      return fileName.split('.').pop() === 'js';
    }).filter(function (fileName, index, fileNames) {
      return filter(fileName, index, fileNames, path, pathIndex);
    }).map(function (fileName) {
      var id = require.resolve(path + '/' + fileName);
      if (!keepCache && require.cache.hasOwnProperty(id)) {
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
  return new Array(length - what.length + 1).join((ch || '0').toString()[0]) + what;
}

function chunk(array, size) {
  return array.reduce(function (res, item, index) {
    if (index % size === 0) {
      res.push([]);
    }
    res[res.length - 1].push(item);
    return res;
  }, []);
}

function escapeRegExp(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function create404Error(baseUrl) {
  var err = new Error();
  err.status = 404;
  err.path = baseUrl;
  return err;
}
//# sourceMappingURL=tools.js.map
