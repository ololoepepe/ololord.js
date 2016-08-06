import _ from 'underscore';
import express from 'express';
import FSSync from 'fs';

import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const EXCLUDED_ROUTERS = new Set(['index.js', 'home.js', 'board.js']);

let router = express.Router();
let routers = [];

router.use('/redirect', (req, res, next) => {
  if (!req.query.source) {
    return next();
  }
  res.redirect(307, `/${config('site.pathPrefix')}${req.query.source.replace(/^\//, '')}`);
});

FSSync.readdirSync(__dirname).filter((fileName) => {
  return !EXCLUDED_ROUTERS.has(fileName) && 'js' === fileName.split('.').pop();
}).forEach((fileName) => {
  let r = require(`./${fileName.split('.').slice(0, -1).join('.')}`);
  router.use('/', r);
  routers.push(r);
});

['./board', './home'].forEach((id) => {
  let r = require(id);
  router.use('/', r);
  routers.push(r);
});

router.use('*', (req, res, next) => {
  let err = new Error();
  err.status = 404;
  err.path = req.baseUrl;
  next(err);
});

router.use((err, req, res, next) => {
  switch (err.status) {
  case 404: {
    Logger.error(Tools.preferIPv4(req.ip), err.path, 404);
    res.status(404).sendFile('notFound.html', { root: `${__dirname}/../public` });
    break;
  }
  default: {
    Logger.error(Tools.preferIPv4(req.ip), req.path, err.stack || err);
    if (err.ban) {
      var model = { ban: err.ban };
    } else {
      if (_(err).isError()) {
        var model = {
          errorMessage: Tools.translate('Internal error'),
          errorDescription: err.message
        };
      } else if (err.error) {
        var model = {
          errorMessage: error.description ? err.error : Tools.translate('Error'),
          errorDescription: err.description || err.error
        };
      } else {
        var model = {
          errorMessage: Tools.translate('Error'),
          errorDescription: ((typeof err === 'string') ? err : '')
        };
      }
    }
    res.json(model);
    break;
  }
  }
});

router.routers = routers;

export default router;
