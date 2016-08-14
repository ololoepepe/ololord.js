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

import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';
import PostCreationTransaction from '../storage/post-creation-transaction';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as Files from '../storage/files';
import geolocation from '../storage/geolocation';

let router = express.Router();

function transformGeoBans(bans) {
  return _(bans).reduce((acc, value, key) => {
    acc.set(key.toUpperCase(), !!value);
    return acc;
  }, new Map());
}

let geoBans = Tools.createWatchedResource(`${__dirname}/../misc/geo-bans.json`, (path) => {
  return transformGeoBans(require(path));
}, async function(path) {
  let data = await FS.read(path);
  geoBans = transformGeoBans(JSON.parse(data));
}) || {};

function checkGeoBan(geolocationInfo) {
  let def = geoBans.get('*');
  if (def) {
    geolocationInfo = geolocationInfo || {};
  } else if (!geolocationInfo || !geolocationInfo.countryCode) {
    return;
  }
  let countryCode = geolocationInfo.countryCode;
  if (typeof countryCode !== 'string') {
    countryCode = '';
  }
  let user = geoBans.get(countryCode.toUpperCase());
  if (def) {
    var banned = !user && (typeof user === 'boolean');
  } else {
    var banned = user;
  }
  if (banned) {
    return Promise.reject(new Error(Tools.translate('Posting is disabled for this country')));
  }
}

router.post('/action/markupText', async function(req, res, next) {
  try {
    let { fields: { boardName, text, markupMode, signAsOp, tripcode } } = await Tools.parseForm(req);
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true }); //TODO: Should it really be "write"?
    let rawText = text || '';
    if (text.length > board.maxTextFieldLength) {
      throw new Error(Tools.translate('Comment is too long'));
    }
    markupMode = markupMode || '';
    let markupModes = Tools.markupModes(markupMode);
    text = await markup(boardName, text, {
      markupModes: markupModes,
      accessLevel: req.level(boardName)
    });
    let data = {
      boardName: boardName,
      text: text || null,
      rawText: rawText || null,
      options: {
        signAsOp: ('true' === signAsOp),
        showTripcode: !!(req.hashpass && ('true' === tripcode))
      },
      createdAt: Tools.now().toISOString()
    };
    if (req.hashpass && tripcode) {
      data.tripcode = Tools.generateTripcode(req.hashpass);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/action/createPost', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Tools.parseForm(req);
    let { boardName, threadNumber } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
    if (!threadNumber) {
      throw new Error(Tools.translate('Invalid thread'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await checkGeoBan(req.geolocation);
    await Captch.checkCaptcha(req.ip, fields);
    transaction = new PostCreationTransaction(boardName);
    files = await Files.getFiles(fields, files);
    await board.testParameters(req, fields, files);
    files = await Files.processFiles(boardName, files, transaction);
    let post = await PostsModel.createPost(req, fields, files, transaction);
    await IPC.render(post.boardName, post.threadNumber, post.number, 'create');
    //hasNewPosts.add(c.post.boardName + "/" + c.post.threadNumber); //TODO: pass to main process immediately
    if ('node-captcha-noscript' !== fields.captchaEngine) {
      res.send({
        boardName: post.boardName,
        postNumber: post.number
      });
    } else {
      let hash = `post-${post.number}`;
      let path = `/${config('site.pathPrefix')}${post.boardName}/res/${post.threadNumber}.html#${hash}`;
      res.redirect(303, path);
    }
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post('/action/createThread', async function(req, res, next) {
  let transaction;
  try {
    let { fields, files } = await Tools.parseForm(req);
    let { boardName } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    await UsersModel.checkUserBan(req.ip, boardName, { write: true });
    req.geolocation = await geolocation(req.ip);
    await checkGeoBan(req.geolocation);
    await Captch.checkCaptcha(req.ip, fields);
    transaction = new PostCreationTransaction(boardName);
    files = await Files.getFiles(fields, files);
    await board.testParameters(req, fields, files, true);
    let thread = await ThreadsModel.createThread(req, fields, transaction);
    files = await Files.processFiles(boardName, files, transaction);
    await PostsModel.createPost(req, fields, files, transaction, {
      postNumber: thread.number,
      date: new Date(thread.createdAt)
    });
    //return IPC.render(post.boardName, post.threadNumber, post.number, 'create'); //TODO
    if ('node-captcha-noscript' !== c.fields.captchaEngine) {
      res.send({
        boardName: thread.boardName,
        threadNumber: thread.number
      });
    } else {
      res.redirect(303, `/${config('site.pathPrefix', '')}${thread.boardName}/res/${thread.number}.html`);
    }
  } catch (err) {
    if (transaction) {
      transaction.rollback();
    }
    next(err);
  }
});

router.post("/action/editPost", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function() {
        return Database.editPost(req, c.fields);
    }).then(function(result) {
        res.send({
            boardName: c.boardName,
            postNumber: c.postNumber
        });
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/addFiles", function(req, res, next) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!board)
            return Promise.reject(Tools.translate("Invalid board"));
        transaction.board = board;
        return UsersModel.checkUserBan(req.ip, c.board.name, { write: true });
    }).then(function() {
        return getFiles(c.fields, c.files, transaction);
    }).then(function(files) {
        c.files = files;
        var fileCount = c.files.length;
        if (fileCount < 1)
            return Promise.reject(Tools.translate("No file specified"));
        var maxFileSize = c.board.maxFileSize;
        var maxFileCount = c.board.maxFileCount;
        if (fileCount > maxFileCount) {
            return Promise.reject(Tools.translate("Too many files"));
        } else {
            var err = c.files.reduce(function(err, file) {
                if (err)
                    return err;
                if (file.size > maxFileSize)
                    return Tools.translate("File is too big");
                if (c.board.supportedFileTypes.indexOf(file.mimeType) < 0)
                    return Tools.translate("File type is not supported");
            }, "");
            if (err)
                return Promise.reject(err);
        }
        return Database.addFiles(req, c.fields, c.files, transaction);
    }).then(function(result) {
        res.send({
            boardName: result.boardName,
            postNumber: result.postNumber,
            threadNumber: result.threadNumber
        });
    }).catch(function(err) {
        transaction.rollback();
        next(err);
    });
});

router.post("/action/deletePost", function(req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function(result) {
        c.fields = result.fields;
        return UsersModel.checkUserBan(req.ip, c.fields.boardName, { write: true });
    }).then(function() {
        return Database.deletePost(req, res, c.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/deleteFile", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        return Database.deleteFile(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

router.post("/action/editFileRating", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        return Database.editFileRating(req, res, result.fields);
    }).then(function(result) {
        res.send(result);
    }).catch(function(err) {
        next(err);
    });
});

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

router.post("/action/editAudioTags", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        return Database.editAudioTags(req, res, result.fields);
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

router.post("/action/sendChatMessage", function(req, res, next) {
    Tools.parseForm(req).then(function(result) {
        var fields = result.fields;
        return Chat.sendMessage({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, +fields.postNumber, fields.text);
    }).then(function(result) {
        res.send({});
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
        res.send(result);
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
        res.send({});
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
        res.send(c.model);
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
