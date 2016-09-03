import _ from 'underscore';
import express from 'express';

import * as Renderer from '../core/renderer';
import * as MiscModel from '../models/misc';
import * as Tools from '../helpers/tools';

let router = express.Router();

router.paths = () => {
  return ['/', '/notFound.html'];
};

router.render = (path) => {
  if ('/' === path) {
    return { 'index.html': Renderer.render('pages/home', { title: Tools.translate('ololord.js', 'pageTitle') }) };
  } else if ('/notFound.html' === path) {
    return {
      'notFound.html': Renderer.render('pages/notFound', {
        title: Tools.translate('Error 404', 'pageTitle'),
        notFoundImageFileName: _(MiscModel.notFoundImageFileNames()).sample()
      })
    };
  }
};

export default router;
