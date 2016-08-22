import _ from 'underscore';
import express from 'express';

import * as Files from '../core/files';
import * as Renderer from '../core/renderer';
import * as IPC from '../helpers/ipc';
import * as Tools from '../helpers/tools';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';

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

router.post('/action/superuserRenameFile', async function(req, res, next) {
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

router.post('/action/superuserRerender', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { targets, archive } } = await Tools.parseForm(req);
    if (typeof targets !== 'string') {
      throw new Error(Tools.translate('Invalid targets'));
    }
    if (targets) {
      await Renderer.rerender(targets);
    } else if ('true' === archive) {
      await Renderer.rerender();
    } else {
      await Renderer.rerender(['**', '!/*/arch/*']);
    }
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
});

router.post('/action/superuserRerenderPosts', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { targets } } = await Tools.parseForm(req);
    if (typeof targets !== 'string') {
      throw new Error(Tools.translate('Invalid targets'));
    }
    await PostsModel.rerenderPosts(Tools.rerenderPostsTargetsFromString(targets));
    //TODO: Rerender corresponding pages?
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
});

router.post('/action/superuserRebuildSearchIndex', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { targets } } = await Tools.parseForm(req);
    if (typeof targets !== 'string') {
      throw new Error(Tools.translate('Invalid targets'));
    }
    await PostsModel.rebuildSearchIndex(Tools.rerenderPostsTargetsFromString(targets));
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
});

router.post('/action/superuserReload', async function(req, res, next) {
  try {
    if (!req.isSuperuser()) {
      throw new Error(Tools.translate('Not enough rights'));
    }
    let { fields: { boards, templates } } = await Tools.parseForm(req);
    if (typeof targets !== 'string') {
      throw new Error(Tools.translate('Invalid targets'));
    }
    if ('true' === boards) {
      await IPC.send('reloadBoards');
    }
    if ('true' === templates) {
      await IPC.send('reloadTemplates');
    }
    res.json({});
  } catch (err) {
    next(Tools.processError(err));
  }
});

export default router;
