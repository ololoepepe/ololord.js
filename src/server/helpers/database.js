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

module.exports.db = db;
module.exports.es = es;

var hasNewPosts = new Set();

if (!cluster.isMaster) {
    setInterval(function() {
        var o = {};
        for (var key of hasNewPosts)
            o[key] = 1;
        hasNewPosts.clear();
        if (!Tools.hasOwnProperties(o))
            return;
        return IPC.send('notifyAboutNewPosts', o).then(function() {
            //Do nothing
        }).catch(function(err) {
            Logger.error(err.stack || err);
        });
    }, Tools.Second);
}

module.exports.setThreadFixed = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var fixed = ("true" == fields.fixed);
        if (thread.fixed == fixed)
            return Promise.resolve();
        thread.fixed = fixed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadClosed = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var closed = ("true" == fields.closed);
        if (thread.closed == closed)
            return Promise.resolve();
        thread.closed = closed;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};

module.exports.setThreadUnbumpable = function(req, fields) {
    var board = Board.board(fields.boardName);
    if (!board)
        return Promise.reject(Tools.translate("Invalid board"));
    if (!req.isModer(board.name))
        return Promise.reject(Tools.translate("Not enough rights"));
    var date = Tools.now();
    var c = {};
    var threadNumber = +fields.threadNumber;
    if (isNaN(threadNumber) || threadNumber <= 0)
        return Promise.reject(Tools.translate("Invalid thread number"));
    return db.hget("threads:" + board.name, threadNumber).then(function(thread) {
        if (!thread)
            return Promise.reject(Tools.translate("No such thread"));
        thread = JSON.parse(thread);
        var unbumpable = ("true" == fields.unbumpable);
        if (!!thread.unbumpable == unbumpable)
            return Promise.resolve();
        thread.unbumpable = unbumpable;
        db.hset("threads:" + board.name, threadNumber, JSON.stringify(thread));
    }).then(function() {
        return IPC.render(board.name, threadNumber, threadNumber, 'edit');
    }).then(function() {
        return Promise.resolve({
            boardName: board.name,
            threadNumber: threadNumber
        });
    });
};
