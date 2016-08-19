'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _files = require('../models/files');

var FilesModel = _interopRequireWildcard(_files);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _postCreationTransaction = require('../storage/post-creation-transaction');

var _postCreationTransaction2 = _interopRequireDefault(_postCreationTransaction);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _files2 = require('../storage/files');

var Files = _interopRequireWildcard(_files2);

var _geolocation = require('../storage/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var moment = require("moment");

var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../core/markup");

var router = _express2.default.Router();

router.post("/action/moveThread", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        return UsersModel.checkUserBan(req.ip, c.fields.boardName, { write: true });
    }).then(function () {
        return UsersModel.checkUserBan(req.ip, c.fields.targetBoardName, { write: true });
    }).then(function () {
        return Database.moveThread(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/banUser", function (req, res, next) {
    if (!req.isModer()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.bans = [];
        c.fields = result.fields;
        c.userIp = result.fields.userIp;
        Tools.forIn(result.fields, function (value, name) {
            if (!/^banBoard_\S+$/.test(name)) return;
            var level = result.fields["banLevel_" + value];
            if ("NONE" == level) return;
            var expiresAt = result.fields["banExpires_" + value];
            if (expiresAt) {
                var timeOffset = +c.fields.timeOffset;
                if (isNaN(timeOffset) || timeOffset < -720 || timeOffset > 840) timeOffset = config("site.timeOffset", 0);
                var hours = Math.floor(timeOffset / 60);
                var minutes = Math.abs(timeOffset) % 60;
                var tz = (timeOffset > 0 ? "+" : "") + (Math.abs(hours) < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
                expiresAt = moment(expiresAt + " " + tz, "YYYY/MM/DD HH:mm ZZ");
                if (+expiresAt < +Tools.now() + Tools.Second) expiresAt = null;
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
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/delall", function (req, res, next) {
    if (!req.isModer()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardNames = Tools.toArray(Tools.filterIn(c.fields, function (boardName, key) {
            return (/^board_\S+$/.test(key)
            );
        }));
        if (c.boardNames.length < 1) return Promise.reject(Tools.translate("No board specified"));
        return UsersModel.checkUserBan(req.ip, c.boardNames, { write: true });
    }).then(function () {
        return Database.delall(req, c.fields.userIp, c.boardNames);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadFixed", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadFixed(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadClosed", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadClosed(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadUnbumpable", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadUnbumpable(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

module.exports = router;
//# sourceMappingURL=action-moder.js.map
