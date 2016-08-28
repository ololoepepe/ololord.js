import _ from 'underscore';
import FSSync from 'fs';
import OS from 'os';
import Path from 'path';

import Program from './program';
import FSWatcher from './fs-watcher';

const DEFAULT_CONFIG_FILE_NAME_1 = `${__dirname}/../config.json`;
const DEFAULT_CONFIG_FILE_NAME_2 = `${__dirname}/../config.js`;
const DEFAULT_DDOS_PROTECTION_RULES = [{
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
const DEFAULT_VALUES = new Map([
  ['board.useDefaultBoards', true],
  ['server.chat.ttl', 10080], //NOTE: 7 days
  ['server.ddosProtection.checkInterval', 1000], //NOTE: 1 second
  ['server.ddosProtection.enabled', true],
  ['server.ddosProtection.errorCode', 429],
  ['server.ddosProtection.errorData', 'Not so fast!'],
  ['server.ddosProtection.maxWeight', 10],
  ['server.ddosProtection.rules', DEFAULT_DDOS_PROTECTION_RULES],
  ['server.ddosProtection.static', false],
  ['server.ddosProtection.weight', 1],
  ['server.ddosProtection.ws.connectionLimit', 10],
  ['server.ddosProtection.ws.maxMessageLength', 20480], //NOTE: 20 KB
  ['server.ddosProtection.ws.maxMessageRate', 6],
  ['server.port', 8080],
  ['server.rss.enabled', true],
  ['server.rss.postCount', 500],
  ['server.rss.ttl', 60], //NOTE: 1 hour
  ['server.statistics.enabled', true],
  ['server.statistics.ttl', 60], //NOTE: 1 hour
  ['server.synchronizationData.ttl', 300], //NOTE: 5 minutes
  ['server.youtubeApiKey', ''],
  ['site.protocol', 'http'],
  ['site.domain', 'localhost:8080'],
  ['site.pathPrefix', ''],
  ['site.locale', 'en'],
  ['site.dateFormat', 'MM/DD/YYYY hh:mm:ss'],
  ['site.timeOffset', 0],
  ['site.tripcodeSalt', ''],
  ['site.vkontakte.accessToken', ''],
  ['site.vkontakte.appId', ''],
  ['site.vkontakte.integrationEnabled', false],
  ['site.twitter.integrationEnabled', true],
  ['site.ws.transports', ''],
  ['site.maxSearchQueryLength', 50],
  ['system.detectRealIp', true],
  ['system.elasticsearch.host', 'localhost:9200'],
  ['system.httpRequestTimeout', 60 * 1000], //NOTE: 1 minute
  ['system.log.backups', 100],
  ['system.log.maxSize', 1048576], //NOTE: 1 MB
  ['system.log.middleware.before', 'all'],
  ['system.log.middleware.verbosity', 'ip'],
  ['system.log.targets', ['console', 'file']],
  ['system.mimeTypeRetrievingTimeout', 5 * 1000], //NOTE: 5 seconds
  ['system.maxFormFieldsSize', 5 * 1024 * 1024], //NOTE: 5 MB
  ['system.onlineCounter.interval', 60 * 1000], //NOTE: 1 minute
  ['system.onlineCounter.quota', 5 * 60 * 1000], //NOTE: 5 minutes
  ['system.phash.enabled', true],
  ['system.redis.host', '127.0.0.1'],
  ['system.redis.port', 6379],
  ['system.redis.family', 4],
  ['system.redis.password', ''],
  ['system.redis.db', 0],
  ['system.redis.enableReadyCheck', false],
  ['system.redis.maxRedirections', 16],
  ['system.redis.scaleReads', 'master'],
  ['system.redis.retryDelayOnFailover', 100],
  ['system.redis.retryDelayOnClusterDown', 100],
  ['system.redis.retryDelayOnTryAgain', 100],
  ['system.rerenderCacheOnStartup', true],
  ['system.rerenderArchive', false],
  ['system.search.maxResultCount', 100],
  ['system.search.maxResultPostSubjectLengh', 100],
  ['system.search.maxResultPostTextLengh', 300],
  ['system.tmpPath', `${__dirname}/../tmp`],
  ['system.useXRealIp', false],
  ['system.workerCount', OS.cpus().length]
]);

let configFileName = Program.configFile;
if (configFileName) {
  configFileName = Path.resolve(`${__dirname}/..${configFileName}`);
} else {
  if (FSSync.existsSync(DEFAULT_CONFIG_FILE_NAME_1)) {
    configFileName = Path.resolve(DEFAULT_CONFIG_FILE_NAME_1);
  } else if (FSSync.existsSync(DEFAULT_CONFIG_FILE_NAME_2)) {
    configFileName = Path.resolve(DEFAULT_CONFIG_FILE_NAME_2);
  }
}

let config = {};
let hooks = {};

if (configFileName && FSSync.existsSync(configFileName)) {
  console.log(`[${process.pid}] Using config file: "${configFileName}"…`);
  config = FSWatcher.createWatchedResource(configFileName, (path) => {
    return require(path);
  }, async function(path) {
    let oldConfig = config;
    let id = require.resolve(path);
    if (require.cache.hasOwnProperty(id)) {
      delete require.cache[id];
    }
    let keys = _(oldConfig).reduce((acc, _1, key) => {
      acc[key] = true;
      return acc;
    }, {});
    _(config).each((_1, key) => { keys[key] = true; });
    keys = _(keys).pick((_1, key) => { return hooks.hasOwnProperty(key); }).map((_1, key) => { return key; });
    oldConfig = keys.reduce((acc, key) => {
      acc[key] = c(key);
      return acc;
    }, {});
    config = require(id);
    keys.forEach((key) => {
      hooks[key].forEach((hook) => {
        hook(c[key], oldConfig[key], key);
      });
    });
  }) || {};
} else {
  console.log(`[${process.pid}] Using default (empty) config…`);
}

function c(key, def) {
  if (typeof def === 'undefined') {
    def = DEFAULT_VALUES.get(key);
  }
  let parts = key.split('.');
  let o = config;
  while (parts.length > 0) {
    if (typeof o !== 'object') {
      return def;
    }
    o = o[parts.shift()];
  }
  return (typeof o !== 'undefined') ? o : def;
}

c.on = function(key, hook) {
  if (typeof hook !== 'function') {
    return this;
  }
  let list = hooks[key];
  if (!list) {
    list = [];
    hooks[key] = list;
  }
  list.push(hook);
  return this;
};

c.proxy = function() {
  let proxy = c('system.fileDownloadProxy');
  if (!proxy) {
    return null;
  }
  let parts = proxy.split(':');
  let auth = config('system.fileDownloadProxyAuth');
  return {
    host: parts[0],
    port: (parts[1] ? +parts[1] : null),
    auth: (auth ? `Basic ${new Buffer(auth).toString('base64')}` : null)
  };
}

export default c;
