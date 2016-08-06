import _ from 'underscore';
import $ from 'jquery';
import BigInteger from 'big-integer';
import Crypto from 'crypto';
import cuteLocalize from 'cute-localize';
import MobileDetect from 'mobile-detect';
import merge from 'merge';
import moment from 'moment/min/moment-with-locales';
import XRegExp from 'xregexp';

export let translate = cuteLocalize({
  locale: {},
  noDefault: true,
  silent: true
});

export let now = function() {
  return new Date();
}

const AUDIO = new Set(['application/ogg', 'audio/mpeg', 'audio/ogg', 'audio/wav']);
const IMAGE = new Set(['image/gif', 'image/jpeg', 'image/png']);
const VIDEO = new Set(['video/mp4', 'video/ogg', 'video/webm']);

let _requireModel = () => null;

export function initialize(requireModel) {
  _requireModel = requireModel;
  $.datepicker.setDefaults($.datepicker.regional[_requireModel('base').site.locale]);
  translate.setLocale(_requireModel('tr').tr);
}

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

function getLocalObject(key, value) {
  if (!key || typeof key !== 'string') {
    return null;
  }
  try {
    var val = window.localStorage.getItem(key);
    return (null != val) ? JSON.parse(val) : defValue;
  } catch (ex) {
    return null;
  }
}

export function isAudioType(type) {
  return AUDIO.has(type);
}

export function isImageType(type) {
  return IMAGE.has(type);
}

export function isVideoType(type) {
  return VIDEO.has(type);
}

export function hasOwnProperties(obj) {
  if (!obj) {
    return false;
  }
  for (var x in obj) {
    if (obj.hasOwnProperty(x)) {
      return true;
    }
  }
  return false;
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

export function gently(obj, f, { delay, n, promise } = {}) {
  //TODO: simplify
  if (!obj || typeof f !== 'function') {
    return Promise.reject(translate('Invalid arguments', 'invalidArgumentsErrorText'));
  }
  delay = option(delay, 'number', 1);
  n = option(n, 'number', 1);
  promise = option(promise, 'boolean');
  return new Promise(function(resolve, reject) {
    if (_(obj).isArray()) {
      var arr = obj;
      var ind = 0;
      var g = function() {
        if (ind >= arr.length) {
          return resolve();
        }
        if (promise) {
          var i = ind;
          var h = function() {
            return f(arr[i], i).then(function() {
              ++i;
              if (i >= Math.min(ind + n, arr.length)) {
                return Promise.resolve();
              }
              return h();
            });
          };
          h().then(function() {
            ind += n;
            setTimeout(g, delay);
          });
        } else {
          for (var i = ind; i < Math.min(ind + n, arr.length); ++i) {
            f(arr[i], i);
          }
          ind += n;
          setTimeout(g, delay);
        }
      };
      g();
    } else {
      var arr = [];
      for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
          arr.push({
            key: x,
            value: obj[x]
          });
        }
      }
      var ind = 0;
      var g = function() {
        if (ind >= arr.length) {
          return resolve();
        }
        if (promise) {
          var i = ind;
          var h = function() {
            return f(arr[i].value, arr[i].key).then(function() {
              ++i;
              if (i >= Math.min(ind + n, arr.length)) {
                return Promise.resolve();
              }
              return h();
            });
          };
          h().then(function() {
            ind += n;
            setTimeout(g, delay);
          });
        } else {
          for (var i = ind; i < Math.min(ind + n, arr.length); ++i) {
            f(arr[i].value, arr[i].key);
          }
          ind += n;
          setTimeout(g, delay);
        }
      };
      g();
    }
  });
}

const RATINGS = ['SFW', 'R-15', 'R-18', 'R-18G'];
const USER_LEVELS = ['USER', 'MODER', 'ADMIN', 'SUPERUSER'];

export function compareRatings(r1, r2) {
  r1 = RATINGS.indexOf(r1);
  if (r1 < 0) {
    r1 = 0;
  }
  r2 = RATINGS.indexOf(r2);
  if (r2 < 0) {
    r2 = 0;
  }
  if (r1 < r2) {
    return -1;
  } else if (r1 > r2) {
    return 1;
  } else {
    return 0;
  }
}

export function compareRegisteredUserLevels(l1, l2) {
  l1 = USER_LEVELS.indexOf(l1);
  l2 = USER_LEVELS.indexOf(l2);
  if (l1 < l2) {
    return -1;
  } else if (l1 > l2) {
    return 1;
  } else {
    return 0;
  }
}

export function readAs(blob, method) {
  switch (method) {
  case 'ArrayBuffer':
  case 'BinaryString':
  case 'DataURL':
  case 'Text':
    break;
  default:
    method = 'ArrayBuffer';
    break;
  }
  let binaryReader = new FileReader();
  return new Promise(function(resolve, reject) {
    binaryReader.onload = (e) => {
      resolve(e.target.result);
    };
    binaryReader.onerror = (e) => {
      reject(e.getMessage());
    };
    binaryReader['readAs' + method](blob);
  });
}

export function series(arr, f, container) {
  if (container && typeof container !== 'object') {
    container = [];
  }
  var isArray = _(container).isArray();
  var isObject = (typeof container === 'object');
  var p = Promise.resolve();
  if (_(arr).isArray()) {
    arr.forEach(function(el) {
      p = p.then(function() {
        return f(el);
      }).then(function(result) {
        if (isArray) {
          container.push(result);
        } else if (isObject) {
          container[el] = result;
        }
      });
    });
  } else if (_(arr).isObject()) {
    _(arr).each(function(el, key) {
      p = p.then(function() {
        return f(el, key);
      }).then(function(result) {
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
  return p.then(function() {
    return Promise.resolve(container);
  });
}

export function getWords(text) {
  if (typeof text !== 'string') {
    return [];
  }
  return text.replace(/\s+/g, ' ').replace(new XRegExp('[^\\p{L} ]', 'gi'), '').trim().substring(0, 800).split(' ');
}

var TYPES = new Set(['object', 'number', 'boolean']);

export function checkError(result) {
    return !TYPES.has(typeof result) || (result && (result.errorMessage || result.ban));
}

const DEVICE_TYPES = new Set(['desktop', 'mobile']);

export function deviceType(expected) {
  let type = require('./settings').deviceType();
  if (!DEVICE_TYPES.has(type)) {
    let md = new MobileDetect(window.navigator.userAgent);
    type = md.mobile() ? 'mobile' : 'desktop';
  }
  if (DEVICE_TYPES.has(expected)) {
    return expected === type;
  } else {
    return type || 'desktop';
  }
}

export function sitePathPrefix() {
  return _requireModel('base').site.pathPrefix || '';
}

export function webSocketTransports() {
  return _requireModel('base').site.ws.transports || '';
}

export function vkAppID() {
  let vk = _requireModel('base').site.vkontakte;
  return (vk && vk.appId) || '';
}

export function isMediaTypeSupported(mimeType) {
  if (isAudioType(mimeType)) {
    var type = 'audio';
  } else if (isVideoType(mimeType)) {
    var type = 'video';
  } else {
    return false;
  }
  var node = window.document.createElement(type);
  return !!(node.canPlayType && node.canPlayType(`${mimeType};`).replace(/no/, ''));
}

export function isSupportedByPlayer(mimeType) {
  return isImageType(mimeType) || isMediaTypeSupported(mimeType);
}

export let dateTimeData = function() {
  let base = _requireModel('base');
  let Settings = require('./settings');
  return {
    timeOffset: (('local' === Settings.time()) ? Settings.timeZoneOffset() : base.site.timeOffset),
    dateFormat: base.site.dateFormat,
    locale: base.site.locale
  };
};

export function formattedDate(date, dateFormat) {
  let d = dateTimeData();
  dateFormat = dateFormat || d.dateFormat;
  return moment(new Date(date)).utcOffset(d.timeOffset).locale(d.locale).format(dateFormat);
}

export function stripEXIFData(data, fileName) {
  try {
    let dv = new DataView(data);
    let offset = 0;
    let recess = 0;
    let pieces = [];
    let i = 0;
    if (dv.getUint16(offset) != 0xffd8) {
      return null;
    }
    offset += 2;
    let app1 = dv.getUint16(offset);
    offset += 2;
    while (offset < dv.byteLength) {
      if (app1 == 0xffe1) {
        pieces[i] = {
          recess: recess,
          offset: offset - 2
        };
        recess = offset + dv.getUint16(offset);
        i++;
      } else if (app1 == 0xffda) {
        break;
      }
      offset += dv.getUint16(offset);
      var app1 = dv.getUint16(offset);
      offset += 2;
    }
    if (pieces.length <= 0) {
      return null;
    }
    let newPieces = [];
    pieces.forEach(function(v) {
      newPieces.push(data.slice(v.recess, v.offset));
    });
    newPieces.push(data.slice(recess));
    if (typeof window.File === 'function') {
      return new window.File(newPieces, fileName || '', { 'type': 'image/jpeg' });
    } else {
      let blob = new window.Blob(pieces, { 'type': 'image/jpeg' });
      blob.name = fileName || '';
      return blob;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function priorityPredicate(item1, item2) {
  let p1 = (item1 && typeof item1.priority !== 'undefined') ? item1.priority : item1;
  let p2 = (item2 && typeof item2.priority !== 'undefined') ? item2.priority : item2;
  if (p1 < p2) {
    return -1;
  } else if (p1 > p2) {
    return 1;
  } else {
    return 0;
  }
}

export function testFilter(item, data) {
  var test = item ? item.test : item;
  if (typeof test === 'boolean') {
    return test;
  } else if (!test) {
    return true;
  } else if (_(test).isRegExp()) {
    return test.test(locationPathname());
  } else if (typeof test === 'function') {
    return test(data);
  } else {
    return test === locationPathname();
  }
}

export function createRegisterFunction(processors, processorPropertyName, type, test) {
  let map = !_(processors).isArray();
  if (typeof processors !== 'object') {
    return;
  }
  processorPropertyName = option(processorPropertyName, 'string', 'processor', { test: (name) => { return !!name; } });
  type = option(type, 'string', 'function', { test: t => !!t });
  let register = (item) => {
    if (typeof item !== 'object' || typeof item[processorPropertyName] !== type) {
      return;
    }
    if (map && typeof item.eventType !== 'string') {
      return;
    }
    let processor = {
      test: item.test,
      priority: option(item.priority, 'number', 1)
    };
    processor[processorPropertyName] = item[processorPropertyName];
    if (map) {
      if (!processors.hasOwnProperty(item.eventType)) {
        var list = [];
        processors[item.eventType] = list;
      } else {
        var list = processors[item.eventType];
      }
    } else {
      var list = processors;
    }
    list.push(processor);
  };
  let f = function(eventType, list, { test, priority } = {}) {
    if (!_(list).isArray()) {
      let o = {
        eventType: eventType,
        test: test,
        priority: priority
      };
      o[processorPropertyName] = list;
      list = [o];
    }
    list.forEach(register);
  };
  return map ? f : f.bind(null, undefined);
}

export function locationPathname() {
  return window.location.pathname.substr(_requireModel ? _requireModel('base').site.pathPrefix.length : 0);
}

export function isThreadPage() {
  let match = locationPathname().match(/^\/([^\/]+)\/(res|arch)\/\d+\.html$/);
  if (!match) {
    return false;
  }
  if (!_requireModel) {
    return true;
  }
  return _requireModel('boards').boards.some((board) => { return match[1] === board.name; });
}

export function isArchivedThreadPage() {
  let match = locationPathname().match(/^\/([^\/]+)\/arch\/\d+\.html$/);
  if (!match) {
    return false;
  }
  if (!_requireModel) {
    return true;
  }
  return _requireModel('boards').boards.some((board) => { return match[1] === board.name; });
}

export function isBoardPage() {
  if (isThreadPage()) {
    return true;
  }
  let pathname = locationPathname();
  let match = pathname.match(/^\/([^\/]+)\/\d+\.html$/) || pathname.match(/^\/([^\/\.]+)\/?$/);
  if (!match) {
    return false;
  }
  if (!_requireModel) {
    return true;
  }
  return _requireModel('boards').boards.some((board) => { return match[1] === board.name; });
}

export function pageNumber() {
  if (!isBoardPage() || isThreadPage()) {
    return;
  }
  let pathname = locationPathname();
  let match = pathname.match(/^\/([^\/]+)\/(\d+)\.html$/);
  if (match) {
    if (_requireModel && !_requireModel('boards').boards.some((board) => { return match[1] === board.name; })) {
      return 0;
    }
    return +match[2];
  }
  return 0;
}

export function pageCount() {
  return +$(':root').data('pageCount');
}

export function threadNumber() {
  let match = locationPathname().match(/^\/([^\/])\/(res|arch)\/(\d+)\.html$/);
  if (match) {
    if (_requireModel && !_requireModel('boards').boards.some((board) => { return match[1] === board.name; })) {
      return 0;
    }
    return +match[3];
  }
  return 0;
}

export function boardName() {
  let pathname = locationPathname();
  let match = pathname.match(/^\/([^\/]+)\/(res|arch)\/\d+\.html$/) || pathname.match(/^\/([^\/]+)\/\d+\.html$/)
    || pathname.match(/^\/([^\/\.]+)\/?$/);
  if (match) {
    if (_requireModel && !_requireModel('boards').boards.some((board) => { return match[1] === board.name; })) {
      return '';
    }
    return match[1];
  }
  return '';
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function generatePassword(length) {
  length = option(length, 'number', 10, { test: (l) => { return l > 0; } });
  return _.sample('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10).join('');
}

export function createFormData() {
  let args = _(arguments).reduce((acc, arg) => {
    if (arg) {
      if (arg.selector) {
        arg = arg[0];
      }
      if (arg && window.Node.ELEMENT_NODE === arg.nodeType) {
        if ('FORM' === arg.tagName) {
          acc.formData = new window.FormData(arg);
        }
        require('./dom').queryAll('.js-file-input', arg).forEach((div) => {
          if (div.file) {
            acc.files[div.fileName || 'file'] = div.file;
          } else if (div.fileUrl) {
            acc.files[div.fileName] = div.fileUrl;
          }
        });
      } else if (typeof arg === 'object') {
        acc.data = arg;
      }
    }
    return acc;
  }, { files: {} });
  let formData = args.formData || new window.FormData();
  _(args.files).each((value, key) => {
    if (typeof value === 'undefined' || null === value) {
      return;
    }
    formData.append(key, value);
  });
  _(args.data).each((value, key) => {
    if (typeof value === 'undefined' || null === value) {
      return;
    }
    formData.append(key, value);
  });
  return formData;
}

export function sha1(data) {
  if (!data || (typeof data !== 'string' && !(data instanceof Buffer))) {
    return null;
  }
  let sha1 = Crypto.createHash('sha1');
  sha1.update(data);
  return sha1.digest('hex');
}

export function testPostNumber(postNumber) {
  return postNumber > 0;
}

export function testHashpass(hashpass) {
  return (typeof hashpass === 'string') && hashpass.match(/^[0-9a-fA-F]{40}$/);
}

export function testUUID(uuid) {
  return (typeof uuid === 'string')
    && uuid.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
}

export let pad = function(s, c, n) {
  s = '' + s;
  n = option(n, 'number', 2, { test: (n) => { return n >= 2; } });
  c = option(c, 'string', '0');
  return `${s.length < n ? c : ''}${s}`;
}

export function formatTime(duration) {
  duration = Math.floor(option(duration, 'number', 0, { test: (d) => { return d > 0; } }));
  if (!duration) {
    return '00:00:00';
  }
  let hours = pad(Math.floor(duration / 3600));
  duration %= 3600;
  let minutes = pad(Math.floor(duration / 60));
  let seconds = pad(duration % 60);
  return `${hours}:${minutes}:${seconds}`;
}

export function captchaEngine(id) {
  return _(_requireModel('base').supportedCaptchaEngines).find(engine => id === engine.id) || null;
}

function selectBoard(boardName) {
  return _(_requireModel('boards').boards).find(board => boardName === board.name) || {};
}

export function supportedCaptchaEngines(boardName) {
  let model = selectBoard(boardName);
  return (model && model.supportedCaptchaEngines) || null;
}

export function supportedFileTypes(boardName) {
  let model = selectBoard(boardName);
  return model ? (model.supportedFileTypes || []) : [];
}

export function maxFileCount(boardName) {
  let model = selectBoard(boardName);
  return model ? (model.maxFileCount || 0) : 0;
}

export function maxFileSize(boardName) {
  let model = selectBoard(boardName);
  return model ? (model.maxFileSize || 0) : 0;
}

export function readableSize(size) {
  size = option(size, 'number', -1, { test: sz => !isNaN(sz) });
  if (size < 0) {
    return '';
  }
  if (size / 1024 >= 1) {
    size /= 1024;
    if (size / 1024 >= 1) {
      size = (size / 1024).toFixed(1);
      size += ' ' + translate('MB', 'megabytesText');
    } else {
      size = size.toFixed(1);
      size += ' ' + translate('KB', 'kilobytesText');
    }
  } else {
    size = size.toString();
    size += ' ' + translate('Byte(s)', 'bytesText');
  }
  return size;
}

export function regexp(string, rep) {
  if (typeof string !== 'string' || !string) {
    return null;
  }
  let s = '/((\\\\/|[^/])+?)/(i(gm?|mg?)?|g(im?|mi?)?|m(ig?|gi?)?)?';
  if (rep) {
    s += '\\,(.*)';
  }
  let match = string.match(s);
  if (!match) {
    return null;
  }
  if (rep) {
    return new RegExp(match[1], match[3]);
  } else {
    return {
      regexp: new RegExp(match[1], match[3]),
      rep: _(match).last()
    };
  }
}

export function hammingDistance(hash1, hash2, max) {
  max = option(max, 'number', 1000, { test: (m) => { return m > 0 } }); //TODO: magic numbers
  let dist = 0;
  let val = bigInt(hash1).xor(bigInt(hash2));
  while (dist < max && val.toString() !== '0') {
    ++dist;
    val = val.and(val.subtract(1));
  }
  return dist;
}

export function inRanges(ranges, val, pred) {
  if (typeof ranges !== 'string' || !ranges) {
    return false;
  }
  val = +val;
  if (isNaN(val)) {
    return false;
  }
  if (typeof pred !== 'function') {
    pred = (x, y) => {
      return x === y;
    };
  }
  ranges = ranges.split(',');
  return ranges.some((range) => {
    if (!range) {
      return;
    }
    range = range.split('-');
    if (range.length > 2) {
      return;
    }
    if (range.length === 1 && pred(val, +range[0])) {
      return true;
    }
    return (val >= +range[0] && val <= +range[1]) || (pred(val, +range[0]) && pred(val, +range[1]));
  });
}

export function escaped(string) {
  return $('<div></di>').text(string).html();
}

export function escapedSelector(string) {
  if (typeof string !== 'string') {
    return string;
  }
  return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '-');
}

export function toSlugCase(string) {
  if (typeof string !== 'string') {
    return string;
  }
  return string.replace(/(.)([A-Z]+)/g, (_, previous, uppers) => {
    return `${previous}-${uppers.toLowerCase().split(/(?=.$)/).join('-')}`;
  });
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

export function lcToFile(lc, fileName) {
  let blobBin = atob(lc.getImage({ scaleDownRetina: true }).toDataURL('image/png').split(',')[1]);
  let array = [];
  for(let i = 0; i < blobBin.length; ++i) {
    array.push(blobBin.charCodeAt(i));
  }
  let pieces = [new Uint8Array(array)];
  let options = { type: 'image/jpeg' };
  if (typeof window.File === 'function') {
    var file = new window.File(pieces, fileName, options);
  } else {
    var file = new Blob(pieces, options);
    file.name = fileName;
  }
  return file;
}
