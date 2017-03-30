import _ from 'underscore';

import codeElements from './code';
import ProcessingContext from './processing-context';
import * as Permissions from '../helpers/permissions';
import * as Tools from '../helpers/tools';

const EXTENDED_WAKABA_MARK = 'EXTENDED_WAKABA_MARK';
const BB_CODE = 'BB_CODE';
const MARKUP_MODES = [EXTENDED_WAKABA_MARK, BB_CODE];

let elements = [];
let escapableSequencesRegExp = null;
let postProcessors = [];

function reloadElements() {
  elements = Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
    return ('index.js' !== fileName && 'processing-context.js' !== fileName) || (path.split('/') === 'custom');
  }, true).sort((p1, p2) => { return p1.priority - p2.priority; });
  let escapableSequences = elements.filter(plugin => plugin.escapable).map((plugin) => {
    return [plugin.op, plugin.cl];
  }).filter((sequence) => {
    return sequence && typeof sequence === 'string';
  });
  escapableSequences = _(escapableSequences).flatten();
  escapableSequences = _(escapableSequences).uniq().map(sequence => Tools.escapeRegExp(sequence));
  if (escapableSequences.length > 0) {
    escapableSequencesRegExp = new RegExp(escapableSequences.join('|'), 'g');
  } else {
    escapableSequencesRegExp = null;
  }
  postProcessors = elements.filter((plugin) => {
    return (typeof plugin.postProcessor === 'function');
  }).map(plugin => plugin.postProcessor);
}

reloadElements();

function getIndE({ info, rxOp, matchs, rxCl, inds, nestable, escapable, nested }) {
  nested.nested = false;
  if (!nestable) {
    return (inds >= 0) ? info.find(rxCl, inds + matchs[0].length, escapable) : -1;
  }
  if (inds >= 0) {
    let matchst = info.find(rxOp, inds + matchs[0].length, escapable);
    let matchet = info.find(rxCl, inds + matchs[0].length, escapable);
    let depth = 1;
    while (matchst || matchet) {
      let tmp = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst : matchet;
      let offs = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst[0].length : matchet[0].length;
      depth += (tmp.index == (matchst ? matchst.index : -1)) ? 1 : -1;
      if (depth > 1) {
        nested.nested = true;
      }
      if (!depth) {
        return tmp;
      }
      matchst = info.find(rxOp, tmp.index + offs, escapable);
      matchet = info.find(rxCl, tmp.index + offs, escapable);
    }
  }
  return null;
}

function preReady(text) {
  return text.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\"").join("&quot;");
}

async function process(info, conversionFunction, regexps, { nestable, escapable, pre, check } = {}) {
  let rxOp = regexps.op;
  let rxCl = regexps.cl;
  if (typeof rxCl === 'undefined') {
    rxCl = rxOp;
  }
  let nested = { nested: false };
  let matchs = info.find(rxOp, 0, escapable);
  let matche = rxCl ? getIndE({
    info: info,
    rxOp: rxOp,
    matchs: matchs,
    rxCl: rxCl,
    inds: (matchs ? matchs.index : -1),
    nestable: nestable,
    escapable: escapable,
    nested: nested
  }) : null;
  let rerun = false;
  async function f() {
    if (!matchs || (rxCl && (!matche || matche.index <= matchs.index))) {
      return;
    }
    if (typeof check === 'function' && !check(info, matchs, matche)) {
      if (rxCl && matche) {
        matchs = info.find(rxOp, matche.index + matche[0].length, escapable);
      } else {
        matchs = info.find(rxOp, matchs.index + matchs[0].length, escapable);
      }
      matche = rxCl ? getIndE({
        info: info,
        rxOp: rxOp,
        matchs: matchs,
        rxCl: rxCl,
        inds: (matchs ? matchs.index : -1),
        nestable: nestable,
        escapable: escapable,
        nested: nested
      }) : null;
      return await f();
    }
    let options = {
      op: '',
      cl: '',
      type: ProcessingContext.NO_SKIP
    };
    let start = matche ? (matchs.index + matchs[0].length) : matchs.index;
    let end = matche ? (matche.index - matchs.index - matchs[0].length) : (matchs.index + matchs[0].length);
    let txt = info.text.substr(start, end);
    let ntxt = await conversionFunction(info, txt, matchs, matche, options);
    txt = escapable ? ProcessingContext.withoutEscaped(ntxt, escapableSequencesRegExp) : ntxt;
    if (pre) {
      txt = preReady(txt);
    }
    if (txt) {
      if (options.cl) {
        info.insert(rxCl ? (matche.index + matche[0].length) : matchs.index + matchs[0].length, options.cl);
      }
      if (rxCl) {
        info.replace(matchs.index, matche.index - matchs.index + matche[0].length, txt, matchs[0].length,
          options.type);
      } else {
        info.replace(matchs.index, matchs[0].length, txt, matchs[0].length, options.type);
      }
      if (options.op) {
        info.insert(matchs.index, options.op);
      }
      matchs = info.find(rxOp, matchs.index + txt.length + options.op.length + options.cl.length, escapable);
    } else {
      if (rxCl) {
        matchs = info.find(rxOp, matche ? (matche.index + matche[0].length)
          : (matchs.index + matchs[0].length), escapable);
      } else {
        matchs = info.find(rxOp, matchs.index + matchs[0].index, escapable);
      }
    }
    if (nestable && nested.nested) {
      rerun = true;
    }
    matche = rxCl ? getIndE({
      info: info,
      rxOp: rxOp,
      matchs: matchs,
      rxCl: rxCl,
      inds: (matchs ? matchs.index : -1),
      nestable: nestable,
      escapable: escapable,
      nested: nested
    }) : null;
    return await f();
  }
  await f();
  if (rerun) {
    return await process(info, conversionFunction, {
      op: rxOp,
      cl: rxCl
    }, {
      nestable: nestable,
      escapable: escapable,
      check: check
    });
  }
}

async function markup(boardName, text, { deletedPost, markupModes, accessLevel, referencedPosts, } = {}) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  deletedPost = Tools.option(deletedPost, 'number', 0, { test: Tools.testPostNumber });
  if (_(markupModes).isArray()) {
    markupModes = markupModes.filter((mode) => { return MARKUP_MODES.indexOf(mode) >= 0; });
  } else {
    markupModes = MARKUP_MODES;
  }
  if (!accessLevel || (Tools.REGISTERED_USER_LEVELS.indexOf(accessLevel) < 0)) {
    accessLevel = null;
  }
  text = text.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
  let info = new ProcessingContext(text, boardName, referencedPosts, deletedPost);
  await Tools.series(elements, async function(element) {
    if (element.markupModes && !element.markupModes.some((mode) => { return markupModes.indexOf(mode) >= 0; })) {
      return;
    }
    if (element.accessLevel && (Tools.compareRegisteredUserLevels(accessLevel, element.accessLevel) < 0)) {
      return;
    }
    if (element.permission
      && (Tools.compareRegisteredUserLevels(accessLevel, Permissions[element.permission]()) < 0)) {
      return;
    }
    if (typeof element.process === 'function') {
      await element.process(info);
    } else if (typeof element.convert === 'function') {
      await process(info, element.convert, {
        op: element.op,
        cl: element.cl
      }, {
        nestable: !!element.nestable,
        escapable: !!element.escapable,
        check: element.check,
        pre: !!element.pre
      });
    }
  });
  return info.toHTML(escapableSequencesRegExp, postProcessors);
}

function markupModes(string) {
  if (typeof string !== 'string') {
    string = '';
  }
  return MARKUP_MODES.filter((mode) => { return string.indexOf(mode) >= 0; });
}

Object.defineProperty(markup, 'EXTENDED_WAKABA_MARK', { value: EXTENDED_WAKABA_MARK });
Object.defineProperty(markup, 'BB_CODE', { value: BB_CODE });
Object.defineProperty(markup, 'MARKUP_MODES', { value: MARKUP_MODES });
Object.defineProperty(markup, "markupCode", { value: codeElements.markupCode });
Object.defineProperty(markup, 'markupLaTeX', { value: codeElements.markupLaTeX });
Object.defineProperty(markup, 'markupModes', { value: markupModes });

export default markup;
