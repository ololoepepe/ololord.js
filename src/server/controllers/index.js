import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';

import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import middlewares from '../middlewares';

const EXCLUDED_ROUTERS = new Set(['index.js', 'home.js', 'board.js']);

let app = express();
let router = express.Router();
app.routers = [];

function initialize() {
  app.use(middlewares);

  router.use('/redirect', (req, res, next) => {
    if (!req.query.source) {
      return next();
    }
    res.redirect(307, `/${config('site.pathPrefix')}${req.query.source.replace(/^\//, '')}`);
  });

  Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
    return !EXCLUDED_ROUTERS.has(fileName) || (path.split('/').slice(-2, -1)[0] === 'custom');
  }).forEach((plugin) => {
    router.use('/', plugin);
    app.routers.push(plugin);
  });

  ['./board', './home'].forEach((id) => {
    let r = Tools.requireWrapper(require(id));
    router.use('/', r);
    app.routers.push(r);
  });

  app.use(router);

  app.use('*', (req, res, next) => {
    next(Tools.create404Error(req.baseUrl));
  });

  app.use((err, req, res, next) => {
    Tools.series(req.formFiles, async function(file) {
      try {
        let exists = FS.exists(file.path);
        if (exists) {
          await FS.remove(file.path);
        }
      } catch (err) {
        Logger.error(err.stack || err);
      }
    });
    switch (err.status) {
    case 404: {
      Logger.error(Tools.preferIPv4(req.ip), err.path, 404);
      res.status(404).sendFile('notFound.html', { root: `${__dirname}/../../public` });
      break;
    }
    default: {
      Logger.error(Tools.preferIPv4(req.ip), req.path, err.stack || err);
      if (err.hasOwnProperty('ban')) {
      } else {
        if (_(err).isError()) {
          var message = err.message;
        } else {
          var message = (typeof err === 'string') ? err : '';
        }
      }
      res.json({ message: message });
      break;
    }
    }
  });
}

app.initialize = initialize;

export default app;
