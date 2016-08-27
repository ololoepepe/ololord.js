import _ from 'underscore';

import * as Renderer from '../core/renderer';

function convertMonospace(_1, text, _2, _3, options) {
  options.op = "<font face='monospace'>";
  options.cl = '</font>';
  options.type = 'CODE_SKIP';
  return Renderer.toHTML(text);
}

function convertNomarkup(_1, text, _2, _3, options) {
  options.type = 'CODE_SKIP';
  return Renderer.toHTML(text);
}

function convertPre(_1, text, _2, _3, options) {
  options.op = '<pre>';
  options.cl = '</pre>';
  options.type = 'CODE_SKIP';
  return text;
}

export default [{
  priority: 0,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertMonospace,
  op: '``',
  escapable: true,
}, {
  priority: 100,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertNomarkup,
  op: "''",
  escapable: true,
}, {
  priority: 200,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertPre,
  op: /\/\\-\\-pre\s+/g,
  cl: /\s+\\\\\\-\\-/g,
  escapable: true,
  pre: true
}, {
  priority: 700,
  markupModes: ['BB_CODE'],
  convert: convertPre,
  op: '[pre]',
  cl: '[/pre]',
  escapable: true,
  pre: true
}, {
  priority: 1100,
  markupModes: ['BB_CODE'],
  convert: convertMonospace,
  op: '[m]',
  cl: '[/m]'
}, {
  priority: 1200,
  markupModes: ['BB_CODE'],
  convert: convertNomarkup,
  op: '[n]',
  cl: '[/n]'
}];
