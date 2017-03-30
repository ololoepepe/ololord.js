import $ from 'jquery';

import * as DOM from '../helpers/dom';

export let quoteSelectedText = function(selection) {
  try {
    let field = DOM.nameOne('text', DOM.id('post-form'));
    let value = '';
    if (window.document.getSelection()) {
      let sel = (selection || window.document.getSelection().toString()).split(/\r?\n/).forEach((line) => {
        if (line) {
          value += `>${line}`;
        }
        value += '\n';
      });
      value = value.substr(0, value.length - 1);
    }
    if (!value) {
      value = '>';
    }
    value += '\n';
    if (typeof selection !== 'undefined' && selection.length <= 0) {
      return;
    }
    let startPos = field.selectionStart;
    let endPos = field.selectionEnd;
    field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
    let pos = ((startPos < endPos) ? startPos : endPos) + value.length;
    field.setSelectionRange(pos, pos);
    field.focus();
  } catch (err) {
    console.log(err);
  }
};

function wrap(opTag, clTag) {
  if (!opTag || !clTag) {
    return;
  }
  try {
    let field = DOM.nameOne('text', DOM.id('post-form'));
    let startPos = field.selectionStart;
    let endPos = field.selectionEnd;
    let selected = field.value.substring(startPos, endPos);
    let value = opTag + selected + clTag;
    field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
    let pos = ((startPos < endPos) ? startPos : endPos) + opTag.length;
    if (selected.length > 0) {
      pos += selected.length + clTag.length;
    }
    field.setSelectionRange(pos, pos);
    field.focus();
  } catch (err) {
    console.log(err);
  }
}

const NORMAL_TAGS = new Set(['b', 'i', 's', 'u', 'spoiler', 'ul', 'ol', 'li', 'sup', 'sub', 'raw-html', 'url', 'latex',
  'l']);
const UL_TAGS_REGEXP = /^ul(d|c|s)$/;
const OL_TAGS_REGEXP = /^ol(1|I|i|A|a)$/;
const UL_TAGS_MAP = new Map([['d', 'disc'], ['c', 'circle'], ['s', 'square']]);

export function markup(tag) {
  if (typeof tag !== 'string') {
    return;
  }
  if (NORMAL_TAGS.has(tag)) {
    wrap(`[${tag}]`, `[/${tag}]`);
    return;
  }
  let match = tag.match(UL_TAGS_REGEXP);
  if (match) {
    wrap(`[ul type=${UL_TAGS_MAP.get(match[1])}]`, '[/ul]');
    return;
  }
  match = tag.match(OL_TAGS_REGEXP);
  if (match) {
    wrap(`[ol type=${match[1]}]`, '[/ol]');
    return;
  }
  switch (tag) {
  case '>': {
    quoteSelectedText();
    break;
  }
  case 'code': {
    let lang = $('#markup .js-code-lang-select').val();
    if ('-' === lang) {
      lang = '';
    }
    wrap(`[code${lang ? (' lang="' + lang + '"') : ''}]`, `[/code]`);
    break;
  }
  default: {
    break;
  }
  }
}
