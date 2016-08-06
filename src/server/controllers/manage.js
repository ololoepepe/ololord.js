import express from 'express';

import * as Renderer from '../core/renderer';
import * as Tools from '../helpers/tools';

let router = express.Router();

router.paths = () => {
  return ['/manage.html'];
};

router.render = () => {
  return { 'manage.html': Renderer.render('pages/manage', { title: Tools.translate('Management', 'pageTitle') }) };
};

module.exports = router;
