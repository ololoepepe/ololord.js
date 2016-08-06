import express from 'express';

import * as Renderer from '../core/renderer';
import * as Tools from '../helpers/tools';

let router = express.Router();

router.paths = () => {
  return ['/faq.html'];
};

router.render = (paths) => {
  return { 'faq.html': Renderer.render('pages/faq', { title: Tools.translate('F.A.Q.', 'pageTitle') }) };
};

module.exports = router;
