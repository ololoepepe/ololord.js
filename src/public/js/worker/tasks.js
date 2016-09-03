import _ from 'underscore';

import * as Parser from './parser';
import * as Spells from './spells';
import * as Tools from '../helpers/tools';

async function applySpell(post, spell, options) {
  if (!post || !spell) {
    return null;
  }
  switch (spell.type) {
  case 'SPELL': {
    return await applySpell(post, spell.value, options);
  }
  case 'spell': {
    if (spell.board && post.board !== spell.board) {
      return null;
    }
    if (spell.thread && post.thread !== spell.thread) {
      return null;
    }
    return await Spells.spell(spell.name).spell(post, spell.args, options);
  }
  case '|': {
    let f = async function(i) {
      if (i >= spell.value.length) {
        return null;
      }
      let result = await applySpell(post, spell.value[i].value, options);
      if (result && result.hidden) {
        return result;
      }
      return await f(i + 1);
    };
    return await f(0);
  }
  case '&': {
    let f = async function(i) {
      if (i >= spell.value.length) {
        return null;
      }
      let result = await applySpell(post, spell.value[i].value, options);
      if (!result || !result.hidden) {
        return null;
      }
      return (i < spell.value.length - 1) ? await f(i + 1) : result;
    };
    return await f(0);
  }
  case '!': {
    let result = await applySpell(post, spell.value, options);
    return (!result || !result.hidden) ? { hidden: '!not' } : null;
  }
  default: {
    break;
  }
  }
  return null;
}

async function applySpells(post, spells, options) {
  //TODO: magic numbers
  if (!post || !spells || spells.length < 1) {
    return null;
  }
  let npost = { replacements: [] };
  let words = Tools.getWords(post.text);
  let len = words.length;
  options.similarText.some((sample) => {
    let i = sample.words.length;
    let slen = i;
    let slen2 = i;
    let n = 0;
    if (len < slen * 0.4 || len > slen * 3) {
      return;
    }
    while (i--) {
      if (slen > 6 && sample.words[i].length < 3) {
        --slen2;
        continue;
      }
      let j = len;
      while (j--) {
        if(words[j] === sample.words[i] || sample.words[i].match(/>>\d+/) && words[j].match(/>>\d+/)) {
          n++;
        }
      }
    }
    if (n < slen2 * 0.4 || len > slen2 * 3) {
      return;
    }
    npost.hidden = `similar to >>/${sample.boardName}/${sample.postNumber}`;
    return true;
  });
  await Tools.series(spells, async function(spell) {
    if (npost.hidden && ('SPELL' != spell.value.type || 'rep' != spell.value.value.name)) {
      return;
    }
    let result = await applySpell(post, spell.value, options);
    if (!result) {
      return;
    }
    npost.hidden = result.hidden;
    if (result.replacements) {
      npost.replacements = npost.replacements.concat(result.replacements);
    }
  });
  return npost;
}

export async function parseSpells(data) {
  try {
    return await Parser.parseSpells(data);
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function processPosts(data) {
  try {
    if (!data || !data.posts) {
      throw new Error(Tools.translate('Invalid data', 'invalidDataErrorText'));
    }
    let similarText = {};
    try {
      similarText = (data.options && data.options.similarText && JSON.parse(data.options.similarText)) || {};
    } catch (err) {
      similarText = {};
    }
    let options = {
      ihashDistance: (data.options && data.options.ihashDistance) || 15,
      similarText: _(similarText).reduce((acc, val, key) => {
        return acc.concat({
          words: val,
          boardName: key.split('/').shift(),
          postNumber: key.split('/').pop()
        });
      }, [])
    };
    let posts = await Tools.series(data.posts, async function(post) {
      let npost = {
        boardName: post.boardName,
        postNumber: post.postNumber,
        threadNumber: post.threadNumber
      };
      if (!data.spells || post.hidden) {
        return npost;
      }
      let result = await applySpells(post, data.spells, options);
      if (result) {
        npost.hidden = result.hidden;
        npost.replacements = result.replacements;
      }
      return npost;
    }, true);
    return { posts: posts };
  } catch (err) {
    return Promise.reject(err);
  }
}
