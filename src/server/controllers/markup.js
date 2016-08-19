import express from 'express';
import Highlight from 'highlight.js';

import * as Renderer from '../core/renderer';
import markup from '../core/markup';
import * as Tools from '../helpers/tools';

let router = express.Router();

const CODE_TO_MARKUP = 'static const int x = 0;';
const LATEX_TO_MARKUP = 'v=v_0+\\frac{at^2}{2}';
const INLINE_LATEX_TO_MARKUP = 'E=mc^2';

router.paths = () => {
  return ['/markup.html'];
};

router.render = async function(path) {
  if ('/markup.html' !== path) {
    return;
  }
  Highlight.configure({
    tabReplace: '    ',
    useBR: true
  });
  let result = markup.markupCode(CODE_TO_MARKUP, 'cpp');
  let markedUpLatex = await Tools.markupLatex(LATEX_TO_MARKUP);
  let markedUpInlineLatex = await Tools.markupLatex(INLINE_LATEX_TO_MARKUP, true);
  let model = {
    title: Tools.translate('Markup', 'pageTitle'),
    codeToMarkup: CODE_TO_MARKUP,
    markedUpCode: result.op + result.text + result.cl,
    latexToMarkup: LATEX_TO_MARKUP,
    markedUpLatex: markedUpLatex,
    inlineLatexToMarkup: INLINE_LATEX_TO_MARKUP,
    markedUpInlineLatex: markedUpInlineLatex
  };
  return { 'markup.html': Renderer.render('pages/markup', model) };
};

module.exports = router;
