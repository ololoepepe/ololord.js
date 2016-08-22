import _ from 'underscore';

import * as Tools from '../helpers/tools';

function convertMonospace(_1, text, _2, _3, options) {
  options.op = "<font face='monospace'>";
  options.cl = '</font>';
  options.type = 'CODE_SKIP';
  return Tools.toHtml(withoutEscaped(text)); //TODO
}

function convertNomarkup(_1, text, _2, _3, options) {
  options.type = 'CODE_SKIP';
  return Tools.toHtml(withoutEscaped(text)); //TODO
}

export default [{
  priority: 0,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertMonospace,
  op: '``',
  //cl: undefined,
  //nestable: undefined,
  escapable: true,
  //check: undefined
}, {
  priority: 100,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertNomarkup,
  op: "''",
  //cl: undefined,
  //nestable: undefined,
  escapable: true,
  //check: undefined
}];
