import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';
var moment = require("moment");
import UUID from 'uuid';

import Board from '../boards/board';
import Captcha from '../captchas/captcha';
import geolocation from '../core/geolocation';
var Chat = require("../helpers/chat");
var config = require("../helpers/config");

import * as FilesModel from '../models/files';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let router = express.Router();

router.post("/action/sendChatMessage", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.sendMessage({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, +fields.postNumber, fields.text);
    }).then(function(result) {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/deleteChatMessages", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.deleteMessages({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, fields.postNumber);
    }).then(function(result) {
        res.json(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/synchronize", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.key = result.fields.key;
        if (!c.key)
            return Promise.reject(Tools.translate("No key specified"));
        var data = result.fields.data;
        try {
            data = JSON.parse(data);
        } catch (err) {
            return Promise.reject(err);
        }
        return Database.db.set("synchronizationData:" + c.key, JSON.stringify(data));
    }).then(function() {
        return Database.db.expire("synchronizationData:" + c.key, 300); //NOTE: 5 minutes
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/search", function(req, res, next) {
    var c = { model: {} };
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        c.query = fields.query || "";
        if (!c.query)
            return Promise.reject(Tools.translate("Search query is empty"));
        if (c.query.length > config("site.maxSearchQueryLength", 50))
            return Promise.reject(Tools.translate("Search query is too long"));
        var boardName = fields.boardName || "";
        if ("*" == boardName)
            boardName = "";
        var page = fields.page || 0;
        c.model.searchQuery = c.query;
        c.model.searchBoard = boardName;
        c.phrases = Tools.splitCommand(c.query);
        if (!c.phrases || !c.phrases.command)
            return Promise.reject(Tools.translate("Invalid search query"));
        c.phrases = [c.phrases.command].concat(c.phrases.arguments);
        c.query = {
            requiredPhrases: [],
            excludedPhrases: [],
            possiblePhrases: []
        };
        c.phrases.forEach(function(phrase) {
            if (phrase.substr(0, 1) == "+")
                c.query.requiredPhrases.push(phrase.substr(1).toLowerCase());
            else if (phrase.substr(0, 1) == "-")
                c.query.excludedPhrases.push(phrase.substr(1).toLowerCase());
            else
                c.query.possiblePhrases.push(phrase.toLowerCase());
        });
        c.model.phrases = c.query.requiredPhrases.concat(c.query.excludedPhrases).concat(c.query.possiblePhrases);
        c.model.phrases = Tools.withoutDuplicates(c.model.phrases);
        return Database.findPosts(c.query, boardName, page);
    }).then(function(result) {
        var posts = result.posts;
        c.model.searchResults = posts.map(function(post) {
            var text = post.plainText || "";
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300)
                text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100)
                subject = subject.substr(0, 97) + "...";
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
        res.json(c.model);
    }).catch(function(err) {
        next(err);
    });
});

Captcha.captchaIDs().forEach(function(id) {
    Captcha.captcha(id).actionRoutes().forEach(function(route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

Board.boardNames().forEach(function(name) {
    Board.board(name).actionRoutes().forEach(function(route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

module.exports = router;
