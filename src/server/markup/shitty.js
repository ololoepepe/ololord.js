import ProcessingContext from './processing-context';
import * as Renderer from '../core/renderer';

const RX_SYMBOL = /(\^H)+/gi;
const RX_WORD = /(\^W)+/gi;

function processStrikedOutShitty(info) {
  let match = info.find(RX_SYMBOL);
  while (match) {
    let s = match.index - (match[0].length / 2);
    if (s < 0) {
      match = info.find(RX_SYMBOL, match.index + match[0].length);
      continue;
    }
    info.replace(match.index, match[0].length, '</s>', 0);
    info.insert(s, '<s>');
    match = info.find(RX_SYMBOL, match.index + 7);
  }
}

function processStrikedOutShittyWord(info) {
  let match = info.find(RX_WORD);
  let txt = info.text;
  while (match) {
    let count = match[0].length / 2;
    let pcount = count;
    let s = match.index - 1;
    while (count > 0) {
      while (s >= 0 && /\s/.test(txt[s])) {
        --s;
      }
      while (s >= 0 && !/\s/.test(txt[s])) {
        --s;
      }
      --count;
    }
    info.replace(match.index, match[0].length, '</s>', 0);
    info.insert(s + 1, '<s>');
    match = info.find(RX_WORD, match.index + (7 * pcount));
  }
}

function convertTooltipShitty(_1, _2, matchs, _3, options) {
  options.type = ProcessingContext.NO_SKIP;
  let tooltip = Renderer.toHTML(matchs[2]);
  options.op = `<span class='tooltip js-with-tooltip' title='${tooltip}'>`;
  options.cl = '</span>';
  return matchs[1];
}

export default [{
  priority: 1900,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShitty
}, {
  priority: 2000,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  process: processStrikedOutShittyWord
}, {
  priority: 2100,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertTooltipShitty,
  op: /([^\?\s]+)\?{3}"([^"]+)"/gi,
  cl: null
}];
