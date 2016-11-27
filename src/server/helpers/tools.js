import _ from 'underscore';
import { Address4, Address6 } from 'ip-address';
import Crypto from 'crypto';
import FSSync from 'fs';
import merge from 'merge';
import Util from 'util';

import config from './config';

let translate = require('cute-localize')({
  locale: config('site.locale'),
  extraLocations: `${__dirname}/../../translations/custom`,
  silent: true
});

config.on('site.locale', (locale) => { translate.setLocale(locale); });

export { translate as translate };

const NON_THEME_STYLESHEETS = new Set(['', 'custom-'].reduce((acc, prefix) => {
  return acc.concat(['combined', 'desktop', 'mobile'].map(suffix => `${prefix}base-${suffix}`));
}, []));
const STYLES_PATH = `${__dirname}/../../public/css`;
const CODE_STYLES_PATH = `${__dirname}/../../public/css/3rdparty/highlight.js`;
const JS_TYPES = new Set(['string', 'boolean', 'number', 'object']);
const IP_V6_MAX_SUBNET = 128;
const IP_V4_MAX_SUBNET = 32;

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const FILE_RATINGS = ['SFW', 'R-15', 'R-18', 'R-18G'];
export const NODE_CAPTCHA_ID = 'node-captcha';
export const REGISTERED_USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];
export const BAN_LEVELS = ['NONE', 'READ_ONLY', 'NO_ACCESS'];
export const STYLES = FSSync.readdirSync(STYLES_PATH).filter((fileName) => {
  return fileName.split('.').pop() === 'css' && !NON_THEME_STYLESHEETS.has(fileName.split('.').shift());
}).map((fileName) => {
  let name = fileName.split('.').slice(0, -1).join('.');
  let match = /\/\*\!\s*([^\*]+?)\s*\*\//gi.exec(FSSync.readFileSync(`${STYLES_PATH}/${fileName}`, 'utf8'));
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

export function now() {
  return new Date();
}

export function mayBeHashpass(password) {
  return (typeof password === 'string') && password.match(/^([0-9a-fA-F]){40}$/);
}

export function correctAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return null;
  }
  if ('::1' === ip) {
    ip = '127.0.0.1';
  }
  let match = ip.match(/^\:\:ffff\:(\d+\.\d+\.\d+\.\d+)$/);
  if (match) {
    ip = match[1];
  }
  if (ip.replace(':', '') === ip) {
    ip = '::' + ip;
  }
  try {
    let address = new Address6(ip);
    if (address.isValid()) {
      return address.correctForm();
    }
  } catch (err) {
    //
  }
  try {
    let address = Address6.fromAddress4(ip);
    if (address.isValid()) {
      return address.correctForm();
    }
  } catch (err) {
    //
  }
  return null;
}

export function binaryAddress(address) {
  if (!(address instanceof Address6)) {
    address = new Address6(correctAddress(address));
  }
  return Buffer.from(address.toUnsignedByteArray());
}

export function subnet(ip, s) {
  s = +s;
  if (isNaN(s) || s <= 0) {
    return null;
  }
  let ns = s;
  if (ns <= IP_V4_MAX_SUBNET) {
    ns = IP_V6_MAX_SUBNET - (IP_V4_MAX_SUBNET - ns);
  }
  try {
    let address = new Address6(`${correctAddress(ip)}/${ns}`);
    if (!+address.possibleSubnets(ns)) {
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

export function preferIPv4(ip) {
  if (!ip) {
    return null;
  }
  try {
    let address = new Address6(ip);
    let ipv4 = address.to4();
    if (ipv4.isValid()) {
      ipv4 = ipv4.correctForm();
      return ('0.0.0.1' === ipv4) ? '127.0.0.1' : ipv4;
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

export function crypto(algorithm, data, encoding = 'hex') {
  if (!data || (typeof data !== 'string' && !Util.isBuffer(data))) {
    return null;
  }
  let hash = Crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest(encoding);
}

export function sha1() {
  return crypto('sha1', ...arguments);
}

export async function series(arr, f, container) {
  if (container && typeof container !== 'object') {
    container = [];
  }
  let isArray = _(container).isArray();
  let isObject = (typeof container === 'object');
  let p = Promise.resolve();
  if (_(arr).isArray()) {
    arr.forEach((el, index) => {
      p = p.then(() => {
        return f(el, index);
      }).then((result) => {
        if (isArray) {
          container.push(result);
        } else if (isObject) {
          container[el] = result;
        }
      });
    });
  } else if (_(arr).isObject()) {
    _(arr).each((el, key) => {
      p = p.then(() => {
        return f(el, key);
      }).then((result) => {
        if (isArray) {
          container.push(result);
        } else if (isObject) {
          container[key] = result;
        }
      });
    });
  }
  if (!container) {
    return p;
  }
  return p.then(() => { return container; });
}

export function ipList(s) {
  let ips = (s || '').split(/\s+/).filter(ip => !!ip);
  //TODO: IP ranges
  ips = ips.map(ip => correctAddress(ip));
  if (ips.some(ip => !ip)) {
    returntranslate('Invalid IP address');
  }
  return _(ips).uniq();
}

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

export function requireWrapper(m) {
  return (m && m.default) || m;
}

export function loadPlugins(paths, filter, keepCache) {
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
      if (!keepCache && require.cache.hasOwnProperty(id)) {
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

export function escapeRegExp(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function create404Error(baseUrl) {
  let err = new Error();
  err.status = 404;
  err.path = baseUrl;
  return err;
}
