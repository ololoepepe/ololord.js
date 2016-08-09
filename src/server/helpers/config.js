var equal = require("deep-equal");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");

import OS from 'os';

import Program from './program';

const DEFAULT_VALUES = new Map([
  ['server.ddosProtection.enabled', true],
  ['server.ddosProtection.ws.connectionLimit', 10],
  ['server.ddosProtection.ws.maxMessageLength', 20480],
  ['server.ddosProtection.ws.maxMessageRate', 6],
  ['server.rss.enabled', true],
  ['server.rss.postCount', 500],
  ['server.rss.ttl', 60],
  ['server.statistics.enabled', true],
  ['server.statistics.ttl', 60],
  ['site.protocol', 'http'],
  ['site.domain', 'localhost:8080'],
  ['site.pathPrefix', ''],
  ['site.locale', 'en'],
  ['site.dateFormat', 'MM/DD/YYYY hh:mm:ss'],
  ['site.timeOffset', 0],
  ['site.vkontakte.integrationEnabled', false],
  ['site.vkontakte.appId', ''],
  ['site.twitter.integrationEnabled', true],
  ['site.ws.transports', ''],
  ['site.maxSearchQueryLength', 50],
  ['system.detectRealIp', true],
  ['system.useXRealIp', false],
  ['system.log.backups', 100],
  ['system.log.maxSize', 1048576],
  ['system.log.targets', ['console', 'file']],
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
  ['system.workerCount', OS.cpus().length]
]);

var contains = function(s, subs) {
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

var configFileName = Program.configFile;
if (!configFileName)
    configFileName = __dirname + "/../config.json";
configFileName = Path.resolve(__dirname + "/..", configFileName);
var config = {};
if (FSSync.existsSync(configFileName)) {
    console.log("[" + process.pid + "] Using config file: \"" + configFileName + "\"...");
    config = JSON.parse(FSSync.readFileSync(configFileName, "UTF-8"));
} else {
    console.log("[" + process.pid + "] Using default config...");
}

var setHooks = {};

var c = function(key, def) {
  if (typeof def === 'undefined') {
    def = DEFAULT_VALUES.get(key);
  }
    var parts = key.split(".");
    var o = config;
    while (parts.length > 0) {
        if (typeof o != "object")
            return def;
        o = o[parts.shift()];
    }
    return (undefined != o) ? o : def;
};

c.set = function(key, value) {
    var parts = key.split(".");
    var o = config;
    while (parts.length > 1) {
        if (typeof o != "object")
            return;
        var p = parts.shift();
        if (!o.hasOwnProperty(p))
            o[p] = {};
        o = o[p];
    }
    if (parts.length < 1 || typeof o != "object")
        return;
    var p = parts.shift();
    var prev = o[p];
    o[p] = value;
    var hook = setHooks[key];
    if (typeof hook == "function")
        hook(value, key);
    FS.write(configFileName, JSON.stringify(config, null, 4));
    return prev;
};

c.remove = function(key) {
    var parts = key.split(".");
    var o = config;
    while (parts.length > 1) {
        if (typeof o != "object")
            return;
        var p = parts.shift();
        if (!o.hasOwnProperty(p))
            o[p] = {};
        o = o[p];
    }
    if (parts.length < 1 || typeof o != "object")
        return;
    var p = parts.shift();
    var prev = o[p];
    delete o[p];
    FS.write(configFileName, JSON.stringify(config, null, 4), "utf8");
    return prev;
};

c.installSetHook = function(key, hook) {
    setHooks[key] = hook;
};

c.reload = function() {
    config = {};
    if (FSSync.existsSync(configFileName)) {
        console.log("[" + process.pid + "] Using config file: \"" + configFileName + "\"...");
        config = JSON.parse(FSSync.readFileSync(configFileName, "UTF-8"));
    } else {
        console.log("[" + process.pid + "] Using default config...");
    }
    for (var key in setHooks) {
        if (!setHooks.hasOwnProperty(key))
            return;
        var hook = setHooks[key];
        if (typeof hook != "function")
            return;
        setHooks[key](c(key), key);
    }
};

c.setConfigFile = function(fileName) {
    fileName = fileName || Program.configFile;
    if (!fileName)
        fileName = __dirname + "/../config.json";
    configFileName = Path.resolve(__dirname + "/..", fileName);
    c.reload();
};

module.exports = c;
