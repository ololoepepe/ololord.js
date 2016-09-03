import express from 'express';

import * as Renderer from '../core/renderer';
import * as Tools from '../helpers/tools';

let router = express.Router();

router.paths = () => {
  return ['/login.html'];
};

router.render = (path) => {
  if ('/login.html' === path) {
    return { 'login.html': Renderer.render('pages/login', { title: Tools.translate('Login', 'pageTitle') }) };
  }
};

module.exports = router;
