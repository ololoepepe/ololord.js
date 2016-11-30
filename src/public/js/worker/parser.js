import _ from 'underscore';
import XRegExp from 'xregexp';

import * as Spells from './spells';
import * as Tools from '../helpers/tools';

const R = {
  0: () => {
    return { 'name': 'Program' };
  },
  1: (stack, states) => {
    let [spell, ntoken] = stack.splice(-2, 2);
    if (!ntoken.spells) {
      ntoken.spells = [];
    }
    ntoken.spells.unshift(spell);
    states.splice(-2, 2);
    return ntoken;
  },
  2: (stack, states) => {
    let [value] = stack.splice(-1, 1);
    states.splice(-1, 1);
    return {
      name: 'Spell',
      value: {
        type: 'rep',
        value: value
      }
    };
  },
  3: (stack, states) => {
    let [expr3] = stack.splice(-1, 1);
    states.splice(-1, 1);
    return {
      name: 'Spell',
      value: expr3.value //Optimisation
    }
  },
  4: (stack, states) => {
    let [expr2] = stack.splice(-1, 1);
    states.splice(-1, 1);
    return {
      name: 'Expr3',
      value: expr2.value //Optimisation
    }
  },
  5: (stack, states) => {
    let [expr2, _, expr3] = stack.splice(-3, 3);
    let ntoken = {
      name: 'Expr3',
      value: {
        type: '|',
        value: [expr2]
      }
    };
    if ('|' === expr3.value.type) { //Optimisation
      ntoken.value.value = ntoken.value.value.concat(expr3.value.value);
    } else {
      ntoken.value.value.push(expr3);
    }
    states.splice(-3, 3);
    return ntoken;
  },
  6: (stack, states) => {
    let [expr1] = stack.splice(-1, 1);
    states.splice(-1, 1);
    return {
      name: 'Expr2',
      value: expr1.value //Optimisation
    };
  },
  7: (stack, states) => {
    let [expr1, _, expr3] = stack.splice(-3, 3);
    let ntoken = {
      name: 'Expr2',
      value: {
        type: '&',
        value: [expr1]
      }
    };
    if ('&' === expr3.value.type) { //Optimisation
      ntoken.value.value = ntoken.value.value.concat(expr3.value.value);
    } else {
      ntoken.value.value.push(expr3);
    }
    states.splice(-3, 3);
    return ntoken;
  },
  8: (stack, states) => {
    let [_, expr3, __] = stack.splice(-2, 2);
    states.splice(-3, 3);
    return {
      name: 'Expr1',
      value: expr3.value //Optimisation
    };
  },
  9: (stack, states) => {
    let [spell] = stack.splice(-1, 1);
    states.splice(-1, 1);
    return {
      name: 'Expr1',
      value: {
        type: 'SPELL',
        value: spell
      }
    };
  },
  10: (stack, states) => {
    let [_, spell] = stack.splice(-2, 2);
    states.splice(-2, 2);
    return {
      name: 'Expr1',
      value: {
        type: '!',
        value: spell
      }
    };
  }
};

const TABLE = {
  'rep': { 0: 2, 1: 2, 2: R[2], 3: R[3], 4: R[4], 5: R[6], 7: R[9], 9: R[1], 11: R[5], 13: R[7], 15: R[10], 16: R[8] },
  '|': { 1: R[0], 2: R[2], 3: R[3], 4: 10, 5: R[6], 7: R[9], 9: R[1], 11: R[5], 13: R[7], 15: R[10], 16: R[8] },
  '&': { 1: R[0], 2: R[2], 3: R[3], 4: R[4], 5: 12, 7: R[9], 9: R[1], 11: R[5], 13: R[7], 15: R[10], 16: R[8] },
  '(': { 0: 6, 1: 6, 2: R[2], 3: R[3], 4: R[4], 5: R[6], 6: 6, 7: R[9], 9: R[1], 10: 6, 11: R[5], 12: 6, 13: R[7],
    15: R[10], 16: R[8] },
  ')': { 1: R[0], 2: R[2], 3: R[3], 4: R[4], 5: R[6], 7: R[9], 9: R[1], 11: R[5], 13: R[7], 14: 16, 15: R[10],
    16: R[8] },
  'SPELL': { 0: 7, 1: 7, 2: R[2], 3: R[3], 4: R[4], 5: R[6], 6: 7, 7: R[9], 8: 15, 9: R[1], 10: 7, 11: R[5], 12: 7,
    13: R[7], 15: R[10], 16: R[8] },
  '!': { 0: 8, 1: 8, 2: R[2], 3: R[3], 4: R[4], 5: R[6], 6: 8, 7: R[9], 9: R[1], 10: 8, 11: R[5], 12: 8, 13: R[7],
    15: R[10], 16: R[8] },
  'EOF': { 1: R[0], 2: R[2], 3: R[3], 4: R[4], 5: R[6], 7: R[9], 9: R[1], 11: R[5], 13: R[7], 15: R[10], 16: R[8] },
  'Program': { 1: 9 },
  'Spell': { 0: 1, 1: 1 },
  'Expr3': { 0: 3, 1: 3, 6: 14, 10: 11, 12: 13 },
  'Expr2': { 0: 4, 1: 4, 6: 4, 10: 4, 12: 4 },
  'Expr1': { 0: 5, 1: 5, 6: 5, 10: 5, 12: 5 }
};

function getTokens(text) {
  let pos = 0;
  let skipSpaces = (text) => {
    let first = text.search(/\S/);
    if (first < 0) {
      return '';
    }
    pos += first;
    return text.slice(first);
  };
  let nextToken = (text) => {
    if (text.search(/[&\|\!\(\)]/) === 0) { //Special tokens
      pos += 1;
      return {
        text: text.slice(1),
        token: {
          name: text.substr(0, 1),
          terminal: true,
          type: 'other'
        }
      };
    }
    return Spells.spells().reduce((acc, spell) => {
      if (acc) {
        return acc;
      }
      let pattern = `^\\#${spell.name}(\\[(\\w+)(\\,(\\d+))?\\])?`;
      switch (spell.args) {
      case 'opt':
        pattern += '\\(((\\\\\\)|[^\\)])*?)\\)';
        break;
      case 'rx':
        pattern += '\\((\\/.*\\/(i|igm?|img?|g|gmi?|gim?|m|mig?|mgi?)?)\\)';
        break;
      case 'rxrep':
        pattern += '\\((\\/.*\\/(i|igm?|img?|g|gmi?|gim?|m|mig?|mgi?)?\\,((\\\\\\)|[^\\)])+?))\\)';
        break;
      case 'optrx':
        pattern += '\\((\\/.*\\/(i|igm?|img?|g|gmi?|gim?|m|mig?|mgi?)?)?\\)';
        break;
      case true:
        pattern += '\\(((\\\\\\)|[^\\)])+?)\\)';
        break;
      default:
        break;
      }
      let rx = new XRegExp(pattern);
      if (0 !== text.search(rx)) {
        return;
      }
      let match = text.match(rx);
      let len = match[0].length;
      let token = {
        name: spell.name,
        terminal: true,
        type: 'spell'
      };
      if (match[2]) {
        token.board = match[2];
      }
      if (match[4]) {
        token.thread = match[4];
      }
      if (match[5]) {
        token.args = match[5];
      }
      pos += len;
      return {
        text: text.slice(len),
        token: token
      };
    }, null) || { 'text': '' };
  };
  let tokens = [];
  while (text && text.length > 0) {
    let token = nextToken(skipSpaces(text));
    text = token.text;
    if (token.token) {
      tokens.push(token.token);
    }
  }
  tokens.push({
    name: 'EOF',
    terminal: true,
    type: 'EOF'
  });
  return tokens;
}

export async function parseSpells(text) {
  if (typeof text !== 'string') {
    throw new Error(Tools.translate('Invalid data', 'invalidDataErrorText'));
  }
  let tokens = getTokens(text);
  if (tokens.length < 1 || 'EOF' === tokens[0].name) {
    return { 'root': { 'name': 'Program' } };
  }
  let stack = [];
  let states = [0];
  let i = 0;
  while (true) {
    if (tokens.length === i) {
      throw new Error(Tools.translate('Unexpected end of token list', 'unexpectedEndOfTokenListErrorText'));
    }
    let token = tokens[i];
    let name = ('spell' === token.type) ? 'SPELL' : token.name;
    let x = TABLE[name];
    if (!x) {
      throw new Error(Tools.translate('No such token in the table', 'noTokenInTableErrorText')); //TODO, "data": name
    }
    let f = x[_(states).last()];
    if (!f) {
      throw new Error(Tools.translate('No such token in the table', 'noTokenInTableErrorText')); //TODO, "data": name
    }
    if (typeof f === 'function') {
      let ntoken = f(stack, states);
      if (!ntoken) {
        throw new Error(Tools.translate('Internal error', 'internalErrorText')); //TODO, "data": name
      }
      if ('Program' === ntoken.name && stack.length < 1) {
        return { 'root': ntoken };
      }
      x = TABLE[ntoken.name];
      if (!x) {
        throw new Error(Tools.translate('No such token in the table', 'noTokenInTableErrorText')); //TODO, "data": name
      }
      f = x[_(states).last()];
      if (!f) {
        throw new Error(Tools.translate('No such token in the table', 'noTokenInTableErrorText')); //TODO, "data": name
      }
      stack.push(ntoken);
      states.push(f);
    } else {
      stack.push(token);
      states.push(f);
      ++i;
    }
  }
}
