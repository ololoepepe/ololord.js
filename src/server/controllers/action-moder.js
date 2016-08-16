import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';
var moment = require("moment");
import UUID from 'uuid';

var Board = require("../boards/board");
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../helpers/markup");

import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import PostCreationTransaction from '../storage/post-creation-transaction';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as Files from '../storage/files';
import geolocation from '../storage/geolocation';

let router = express.Router();

router.post("/action/moveThread", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return UsersModel.checkUserBan(req.ip, c.fields.boardName, { write: true });
    }).then(function() {
        return UsersModel.checkUserBan(req.ip, c.fields.targetBoardName, { write: true });
    }).then(function() {
        return Database.moveThread(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/banUser", function(req, res, next) {
    if (!req.isModer())
        return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.bans = [];
        c.fields = result.fields;
        c.userIp = result.fields.userIp;
        Tools.forIn(result.fields, function(value, name) {
            if (!/^banBoard_\S+$/.test(name))
                return;
            var level = result.fields["banLevel_" + value];
            if ("NONE" == level)
                return;
            var expiresAt = result.fields["banExpires_" + value];
            if (expiresAt) {
                var timeOffset = +c.fields.timeOffset;
                if (isNaN(timeOffset) || timeOffset < -720 || timeOffset > 840)
                    timeOffset = config("site.timeOffset", 0);
                var hours = Math.floor(timeOffset / 60);
                var minutes = Math.abs(timeOffset) % 60;
                var tz = ((timeOffset > 0) ? "+" : "") + ((Math.abs(hours) < 10) ? "0" : "") + hours + ":"
                    + ((minutes < 10) ? "0" : "") + minutes;
                expiresAt = moment(expiresAt + " " + tz, "YYYY/MM/DD HH:mm ZZ");
                if (+expiresAt < (+Tools.now() + Tools.Second))
                    expiresAt = null;
            } else {
                expiresAt = null;
            }
            c.bans.push({
                boardName: value,
                expiresAt: +expiresAt ? expiresAt : null,
                level: level,
                reason: result.fields["banReason_" + value],
                postNumber: +result.fields["banPostNumber_" + value] || null
            });
        });
        return Database.banUser(req, c.fields.userIp, c.bans);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/delall", function(req, res, next) {
    if (!req.isModer())
        return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardNames = Tools.toArray(Tools.filterIn(c.fields, function(boardName, key) {
            return /^board_\S+$/.test(key);
        }));
        if (c.boardNames.length < 1)
            return Promise.reject(Tools.translate("No board specified"));
        return UsersModel.checkUserBan(req.ip, c.boardNames, { write: true });
    }).then(function() {
        return Database.delall(req, c.fields.userIp, c.boardNames);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/setThreadFixed", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadFixed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/setThreadClosed", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadClosed(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/setThreadUnbumpable", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.setThreadUnbumpable(req, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

module.exports = router;
