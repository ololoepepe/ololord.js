import _ from 'underscore';
var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var bigInt = require("big-integer");
var cluster = require("cluster");
var Crypto = require("crypto");
var Elasticsearch = require("elasticsearch");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Redis = require("ioredis");
var SQLite3 = require("sqlite3");
var Util = require("util");

var mkpath = promisify("mkpath");

import Board from '../boards/board';
var Cache = require("./cache");
var Captcha = require("../captchas/captcha");
var config = require("./config");
//var markup = require("./markup");
var Permissions = require("./permissions");
var Tools = require("./tools");

import * as BoardsModel from '../models/boards';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import client from '../storage/client-factory';

var db = client();

var hasNewPosts = new Set();

if (!cluster.isMaster) {
    setInterval(function() {
        var o = {};
        for (var key of hasNewPosts)
            o[key] = 1;
        hasNewPosts.clear();
        if (_(o).isEmpty())
            return;
        return IPC.send('notifyAboutNewPosts', o).then(function() {
            //Do nothing
        }).catch(function(err) {
            Logger.error(err.stack || err);
        });
    }, Tools.SECOND);
}
