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

var _captcha = require('../captchas/captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _files = require('../models/files');

var FilesModel = _interopRequireWildcard(_files);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _geolocation = require('../storage/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

var _postCreationTransaction = require('../storage/post-creation-transaction');

var _postCreationTransaction2 = _interopRequireDefault(_postCreationTransaction);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var moment = require("moment");

var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var markup = require("../core/markup");

var router = _express2.default.Router();

router.post("/action/sendChatMessage", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        return Chat.sendMessage({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, +fields.postNumber, fields.text);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/deleteChatMessages", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        return Chat.deleteMessages({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, fields.postNumber);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/synchronize", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.key = result.fields.key;
        if (!c.key) return Promise.reject(Tools.translate("No key specified"));
        var data = result.fields.data;
        try {
            data = JSON.parse(data);
        } catch (err) {
            return Promise.reject(err);
        }
        return Database.db.set("synchronizationData:" + c.key, JSON.stringify(data));
    }).then(function () {
        return Database.db.expire("synchronizationData:" + c.key, 300); //NOTE: 5 minutes
    }).then(function () {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/search", function (req, res, next) {
    var c = { model: {} };
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        c.query = fields.query || "";
        if (!c.query) return Promise.reject(Tools.translate("Search query is empty"));
        if (c.query.length > config("site.maxSearchQueryLength", 50)) return Promise.reject(Tools.translate("Search query is too long"));
        var boardName = fields.boardName || "";
        if ("*" == boardName) boardName = "";
        var page = fields.page || 0;
        c.model.searchQuery = c.query;
        c.model.searchBoard = boardName;
        c.phrases = Tools.splitCommand(c.query);
        if (!c.phrases || !c.phrases.command) return Promise.reject(Tools.translate("Invalid search query"));
        c.phrases = [c.phrases.command].concat(c.phrases.arguments);
        c.query = {
            requiredPhrases: [],
            excludedPhrases: [],
            possiblePhrases: []
        };
        c.phrases.forEach(function (phrase) {
            if (phrase.substr(0, 1) == "+") c.query.requiredPhrases.push(phrase.substr(1).toLowerCase());else if (phrase.substr(0, 1) == "-") c.query.excludedPhrases.push(phrase.substr(1).toLowerCase());else c.query.possiblePhrases.push(phrase.toLowerCase());
        });
        c.model.phrases = c.query.requiredPhrases.concat(c.query.excludedPhrases).concat(c.query.possiblePhrases);
        c.model.phrases = Tools.withoutDuplicates(c.model.phrases);
        return Database.findPosts(c.query, boardName, page);
    }).then(function (result) {
        var posts = result.posts;
        c.model.searchResults = posts.map(function (post) {
            var text = post.plainText || "";
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300) text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100) subject = subject.substr(0, 97) + "...";
            return {
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                archived: post.archived,
                subject: subject,
                text: text
            };
        });
        c.model.total = result.total;
        c.model.max = result.max;
        res.send(c.model);
    }).catch(function (err) {
        next(err);
    });
});

_captcha2.default.captchaIDs().forEach(function (id) {
    _captcha2.default.captcha(id).actionRoutes().forEach(function (route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

_board2.default.boardNames().forEach(function (name) {
    _board2.default.board(name).actionRoutes().forEach(function (route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

module.exports = router;
//# sourceMappingURL=action-other.js.map
