'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _program = require('./program');

var _program2 = _interopRequireDefault(_program);

var _fsWatcher = require('./fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var DEFAULT_CONFIG_FILE_NAME_1 = __dirname + '/../../config.json';
var DEFAULT_CONFIG_FILE_NAME_2 = __dirname + '/../../config.js';
var DEFAULT_DDOS_PROTECTION_RULES = [{
  string: '/misc/base.json',
  maxWeight: 6,
  queueSize: 4
}, {
  string: '/api/chatMessages.json',
  maxWeight: 4,
  queueSize: 2
}, {
  string: '/api/lastPostNumbers.json',
  maxWeight: 4,
  queueSize: 2
}, {
  string: '/api/captchaQuota.json',
  maxWeight: 4,
  queueSize: 2
}, {
  string: '/api/lastPostNumber.json',
  maxWeight: 4,
  queueSize: 2
}, {
  regexp: '^/api.*',
  maxWeight: 6,
  queueSize: 4
}, {
  string: '/action/search',
  maxWeight: 1
}, {
  regexp: '.*',
  maxWeight: 10
}];
var DEFAULT_VALUES = new Map([['board.useDefaultBoards', true], ['server.chat.ttl', 10080], //NOTE: 7 days
['server.ddosProtection.checkInterval', 1000], //NOTE: 1 second
['server.ddosProtection.enabled', true], ['server.ddosProtection.errorCode', 429], ['server.ddosProtection.errorData', 'Not so fast!'], ['server.ddosProtection.maxWeight', 10], ['server.ddosProtection.rules', DEFAULT_DDOS_PROTECTION_RULES], ['server.ddosProtection.static', false], ['server.ddosProtection.weight', 1], ['server.ddosProtection.ws.connectionLimit', 10], ['server.ddosProtection.ws.maxMessageLength', 20480], //NOTE: 20 KB
['server.ddosProtection.ws.maxMessageRate', 6], ['server.port', 8080], ['server.rss.enabled', true], ['server.rss.postCount', 500], ['server.rss.ttl', 60], //NOTE: 1 hour
['server.statistics.enabled', true], ['server.statistics.ttl', 60], //NOTE: 1 hour
['server.synchronizationData.ttl', 300], //NOTE: 5 minutes
['server.youtubeApiKey', ''], ['site.protocol', 'http'], ['site.domain', 'localhost:8080'], ['site.pathPrefix', ''], ['site.locale', 'en'], ['site.dateFormat', 'MM/DD/YYYY hh:mm:ss'], ['site.timeOffset', 0], ['site.tripcodeSalt', ''], ['site.vkontakte.accessToken', ''], ['site.vkontakte.appId', ''], ['site.vkontakte.integrationEnabled', false], ['site.twitter.integrationEnabled', true], ['site.ws.transports', ''], ['site.maxSearchQueryLength', 50], ['system.detectRealIp', true], ['system.elasticsearch.host', 'localhost:9200'], ['system.httpRequestTimeout', 60 * 1000], //NOTE: 1 minute
['system.log.backups', 100], ['system.log.maxSize', 1048576], //NOTE: 1 MB
['system.log.middleware.before', 'all'], ['system.log.middleware.verbosity', 'ip'], ['system.log.targets', ['console', 'file']], ['system.mimeTypeRetrievingTimeout', 5 * 1000], //NOTE: 5 seconds
['system.maxFormFieldsSize', 5 * 1024 * 1024], //NOTE: 5 MB
['system.onlineCounter.interval', 60 * 1000], //NOTE: 1 minute
['system.onlineCounter.quota', 5 * 60 * 1000], //NOTE: 5 minutes
['system.phash.enabled', true], ['system.redis.host', '127.0.0.1'], ['system.redis.port', 6379], ['system.redis.family', 4], ['system.redis.password', ''], ['system.redis.db', 0], ['system.redis.enableReadyCheck', false], ['system.redis.maxRedirections', 16], ['system.redis.scaleReads', 'master'], ['system.redis.retryDelayOnFailover', 100], ['system.redis.retryDelayOnClusterDown', 100], ['system.redis.retryDelayOnTryAgain', 100], ['system.rerenderCacheOnStartup', true], ['system.rerenderArchive', false], ['system.search.maxResultCount', 100], ['system.search.maxResultPostSubjectLengh', 100], ['system.search.maxResultPostTextLengh', 300], ['system.tmpPath', __dirname + '/../../tmp'], ['system.useXRealIp', false], ['system.workerCount', _os2.default.cpus().length]]);

var configFileName = _program2.default.configFile;
if (configFileName) {
  configFileName = _path2.default.resolve(__dirname + '/../..' + configFileName);
} else {
  if (_fs2.default.existsSync(DEFAULT_CONFIG_FILE_NAME_1)) {
    configFileName = _path2.default.resolve(DEFAULT_CONFIG_FILE_NAME_1);
  } else if (_fs2.default.existsSync(DEFAULT_CONFIG_FILE_NAME_2)) {
    configFileName = _path2.default.resolve(DEFAULT_CONFIG_FILE_NAME_2);
  }
}

var config = {};
var hooks = {};

if (configFileName && _fs2.default.existsSync(configFileName)) {
  console.log('[' + process.pid + '] Using config file: "' + configFileName + '"…');
  config = _fsWatcher2.default.createWatchedResource(configFileName, function (path) {
    return require(path);
  }, function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
      var oldConfig, id, keys;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              oldConfig = config;
              id = require.resolve(path);

              if (require.cache.hasOwnProperty(id)) {
                delete require.cache[id];
              }
              keys = (0, _underscore2.default)(oldConfig).reduce(function (acc, _1, key) {
                acc[key] = true;
                return acc;
              }, {});

              (0, _underscore2.default)(config).each(function (_1, key) {
                keys[key] = true;
              });
              keys = (0, _underscore2.default)(keys).pick(function (_1, key) {
                return hooks.hasOwnProperty(key);
              });
              oldConfig = (0, _underscore2.default)(keys).reduce(function (acc, _1, key) {
                acc[key] = c(key);
                return acc;
              }, {});
              config = require(id);
              (0, _underscore2.default)(keys).each(function (_1, key) {
                hooks[key].forEach(function (hook) {
                  hook(c[key], oldConfig[key], key);
                });
              });

            case 9:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function (_x) {
      return ref.apply(this, arguments);
    };
  }()) || {};
} else {
  console.log('[' + process.pid + '] Using default (empty) config…');
}

function c(key, def) {
  if (typeof def === 'undefined') {
    def = DEFAULT_VALUES.get(key);
  }
  var parts = key.split('.');
  var o = config;
  while (parts.length > 0) {
    if ((typeof o === 'undefined' ? 'undefined' : _typeof(o)) !== 'object') {
      return def;
    }
    o = o[parts.shift()];
  }
  return typeof o !== 'undefined' ? o : def;
}

c.on = function (key, hook) {
  if (typeof hook !== 'function') {
    return this;
  }
  var list = hooks[key];
  if (!list) {
    list = [];
    hooks[key] = list;
  }
  list.push(hook);
  return this;
};

c.proxy = function () {
  var proxy = c('system.fileDownloadProxy');
  if (!proxy) {
    return null;
  }
  var parts = proxy.split(':');
  var auth = c('system.fileDownloadProxyAuth');
  return {
    host: parts[0],
    port: parts[1] ? +parts[1] : null,
    auth: auth ? 'Basic ' + new Buffer(auth).toString('base64') : null
  };
};

exports.default = c;
//# sourceMappingURL=config.js.map
