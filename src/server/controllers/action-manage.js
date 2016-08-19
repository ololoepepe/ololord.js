import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';
var moment = require("moment");
import UUID from 'uuid';

import Board from '../boards/board';
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../core/markup");

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

function getRegisteredUserData(fields) {
  let ips = Tools.ipList(fields.ips);
  if (typeof ips === 'string') {
    return Promise.reject(new Error(ips));
  }
  let levels = _(fields).reduce((acc, value, name) => {
    let match = name.match(/^accessLevelBoard_(\S+)$/);
    if (match && 'NONE' !== value) {
      acc[match[1]] = value;
    }
    return acc;
  });
  return {
    levels: levels,
    ips: ips
  };
}

router.post('/action/registerUser', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields } = await Tools.parseForm(req);
    let { password } = fields;
    if (!password) {
      throw new Error(Tools.translate('Invalid password'));
    }
    let { levels, ips } = getRegisteredUserData(fields);
    let hashpass = Tools.mayBeHashpass(password) ? password : Tools.toHashpass(password);
    await UsersModel.registerUser(hashpass, levels, ips);
    res.json({ hashpass: hashpass });
  } catch (err) {
    next(err);
  }
});

router.post('/action/updateRegisteredUser', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields } = await Tools.parseForm(req);
    let { hashpass } = fields;
    if (!hashpass || !Tools.mayBeHashpass(hashpass)) {
      throw new Error(Tools.translate('Invalid hashpass'));
    }
    let { levels, ips } = getRegisteredUserData(fields);
    await UsersModel.updateRegisterUser(hashpass, levels, ips);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/unregisterUser', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { hashpass } } = await Tools.parseForm(req);
    if (!hashpass || !Tools.mayBeHashpass(hashpass)) {
      throw new Error(Tools.translate('Invalid hashpass'));
    }
    await UsersModel.unregisterUser(hashpass);
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/action/superuserAddFile', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { dir, fileName, isDir }, files } = await Tools.parseForm(req);
    if (!dir || typeof dir !== 'string') {
      throw new Error(Tools.translate('Invalid dir'));
    }
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    await Files.createFile(dir, fileName, {
      isDir: ('true' === isDir),
      file: _(files).toArray()[0]
    });
    res.json({});
  } catch (err) {
    next(Tools.processError(err, true));
  }
});

router.post('/action/superuserEditFile', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { fileName, content } } = await Tools.parseForm(req);
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    await Files.editFile(fileName, content);
    res.json({});
  } catch (err) {
    next(Tools.processError(err, false));
  }
});

router.post("/action/superuserRenameFile", async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { oldFileName, fileName } } = await Tools.parseForm(req);
    if (!oldFileName || typeof oldFileName !== 'string' || !fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    await Files.renameFile(oldFileName, fileName);
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
});

router.post('/action/superuserDeleteFile', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { fileName } } = await Tools.parseForm(req);
    if (!fileName || typeof fileName !== 'string') {
      throw new Error(Tools.translate('Invalid file name'));
    }
    await Files.deleteFile(fileName);
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
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

export default router;
