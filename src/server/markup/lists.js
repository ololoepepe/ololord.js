import ProcessingContext from './processing-context';

const LIST_TYPES = {
  d: 'disc',
  c: 'circle',
  s: 'square'
};

function convertUnorderedList(_1, text, matchs, _2, options) {
  let t = matchs[2];
  if (!t) {
    t = 'disc';
  } else if (t.length === 1) {
    t = LIST_TYPES[t];
  }
  if (!t) {
    return '';
  }
  options.type = ProcessingContext.NO_SKIP;
  options.op = `<ul type='${t}'>`;
  options.cl = '</ul>';
  return text;
}

function convertOrderedList(_1, text, matchs, _2, options) {
  let t = matchs[2];
  if (!t) {
    t = '1';
  }
  options.type = ProcessingContext.NO_SKIP;
  options.op = `<ol type='${t}'>`;
  options.cl = '</ol>';
  return text;
}

function convertListItem(_1, text, matchs, _2, options) {
  options.type = ProcessingContext.NO_SKIP;
  options.op = '<li';
  if (matchs[2]) {
    options.op += ` value='${matchs[2]}'`;
  }
  options.op += '>';
  options.cl = '</li>';
  return text;
}

function postProcessor(s) {
  s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<li/g, '</li><li');
  s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ul/g, '</li></ul');
  s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ol/g, '</li></ol');
  s = s.replace(/<ol>(\s|&nbsp;|<br \/>)+<li/g, '<ol><li');
  let rx = /<ul type\="(disc|circle|square)">(\s|&nbsp;|<br \/>)+<li/g;
  let match = rx.exec(s);
  while (match) {
    let ns = `<ul type='${match[1]}'><li`;
    s = s.substr(0, match.index) + ns + s.substr(match.index + match[0].length);
    rx.lastIndex = ns.length;
    match = rx.exec(s);
  }
  return s;
}

export default [{
  priority: 4600,
  markupModes: ['BB_CODE'],
  convert: convertUnorderedList,
  op: /\[ul(\s+type\="?(disc|circle|square|d|c|s)"?)?\s*\]/gi,
  cl: '[/ul]',
  nestable: true
}, {
  priority: 4700,
  markupModes: ['BB_CODE'],
  convert: convertOrderedList,
  op: /\[ol(\s+type\="?(A|a|I|i|1)"?)?\s*\]/gi,
  cl: '[/ol]',
  nestable: true
}, {
  priority: 4800,
  markupModes: ['BB_CODE'],
  convert: convertListItem,
  op: /\[li(\s+value\="?(\d+)"?\s*)?\]/gi,
  cl: '[/li]',
  nestable: true,
  postProcessor: postProcessor
}];
