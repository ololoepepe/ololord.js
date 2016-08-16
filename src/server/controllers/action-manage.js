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

var getRegisteredUserData = function(fields) {
    var levels = {};
    var password = fields.password;
    var ips = Tools.ipList(fields.ips);
    if (typeof ips == "string")
        return Promise.reject(ips);
    Tools.forIn(fields, function(value, name) {
        if (!/^accessLevelBoard_\S+$/.test(name))
            return;
        if ("NONE" == value)
            return;
        levels[name.match(/^accessLevelBoard_(\S+)$/)[1]] = value;
    });
    return Promise.resolve({
        password: password,
        levels: levels,
        ips: ips
    });
};

router.post("/action/registerUser", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        return getRegisteredUserData(result.fields);
    }).then(function(result) {
        return Database.registerUser(result.password, result.levels, result.ips);
    }).then(function(hashpass) {
        res.json({ hashpass: hashpass });
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/unregisterUser", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function(result) {
        return Database.unregisterUser(result.fields.hashpass);
    }).then(function(result) {
        res.send({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/updateRegisteredUser", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        return getRegisteredUserData(result.fields);
    }).then(function(result) {
        return Database.updateRegisteredUser(result.password, result.levels, result.ips);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/superuserAddFile", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        var dir = result.fields.dir;
        if (dir.slice(-1)[0] != "/")
            dir += "/";
        var path = __dirname + "/../" + dir + result.fields.fileName;
        var files = Tools.toArray(result.files);
        if ("true" == result.fields.isDir)
            return FS.makeDirectory(path);
        else if (files.length < 1)
            return Tools.writeFile(path, "");
        else
            return FS.move(files[0].path, path);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            err.status = 404;
        else if ("ENOTDIR" == err.code)
            err = Tools.translate("Not a directory");
        next(err);
    });
});

router.post("/action/superuserEditFile", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return Tools.writeFile(path, result.fields.content);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            err.status = 404;
        else if ("EISDIR" == err.code)
            err = Tools.translate("Not a file");
        next(err);
    });
});

router.post("/action/superuserRenameFile", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        var oldPath = __dirname + "/../" + result.fields.oldFileName;
        var newPath = oldPath.split("/").slice(0, -1).join("/") + "/" + result.fields.fileName;
        return FS.rename(oldPath, newPath);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            err.status = 404;
        next(err);
    });
});

router.post("/action/superuserDeleteFile", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function(result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return FS.removeTree(path);
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        if ("ENOENT" == err.code)
            err.status = 404;
        next(err);
    });
});

router.post("/action/superuserRerenderCache", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.rerenderArchive = ("true" == result.fields.rerenderArchive);
        return IPC.send('stop');
    }).then(function() {
        return IPC.send('rerenderCache', c.rerenderArchive);
    }).then(function() {
        return IPC.send('start');
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });;
});

router.post("/action/superuserRerenderPosts", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    var c = { boardNames: [] };
    Tools.parseForm(req).then(function(result) {
        Tools.forIn(result.fields, function(value, name) {
            if (!/^board_\S+$/.test(name))
                return;
            c.boardNames.push(value);
        });
        if (c.boardNames.length < 1)
            c.boardNames = Board.boardNames();
        return IPC.send('stop');
    }).then(function() {
        return Database.rerenderPosts(c.boardNames);
    }).then(function() {
        return IPC.send('start');
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/superuserRebuildSearchIndex", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    IPC.send('stop').then(function() {
        return Database.rebuildSearchIndex();
    }).then(function() {
        return IPC.send('start');
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/superuserReload", function(req, res, next) {
    if (!req.isSuperuser())
        return next(Tools.translate("Not enough rights"));
    var c = { list: [] };
    Tools.parseForm(req).then(function(result) {
        if ("true" == result.fields.boards)
            c.list.push("boards");
        if ("true" == result.fields.config)
            c.list.push("config");
        if ("true" == result.fields.templates)
            c.list.push("templates");
        if (c.list.length < 1)
            return Promise.resolve();
        return IPC.send('stop');
    }).then(function() {
        return Tools.series(c.list, function(action) {
            switch (action) {
            case "boards":
                return IPC.send('reloadBoards');
            case "config":
                return IPC.send('reloadConfig');
            case "templates":
                return IPC.send('reloadTemplates');
            default:
                return Promise.resolve();
            }
        });
    }).then(function() {
        if (c.list.length < 1)
            return Promise.resolve();
        return IPC.send('start');
    }).then(function() {
        res.json({});
    }).catch(function(err) {
        next(err);
    });
});

Captcha.captchaIds().forEach(function(id) {
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
