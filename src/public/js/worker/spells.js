import _ from 'underscore';

import * as Tools from '../helpers/tools';

let spells = {};
let customSpells = [];

let register = Tools.createRegisterFunction(spells, 'spell', 'object');

function registerSpell(name, spell, args) {
  if (typeof window !== 'undefined') {
    return;
  }
  let r = (s) => {
    if (typeof s.name !== 'string' || !/^[a-z_]+[a-z0-9_]*$/.test(s.name)) {
      return;
    }
    if (typeof s.spell !== 'function') {
      return;
    }
    register(s.name, s);
  };
  if (_(name).isArray()) {
    name.forEach(r);
  } else {
    r({
      name: name,
      spell: spell,
      args: args
    });
  }
}

export function registerCustomSpell(name, spell, args) {
  if (typeof window === 'undefined') {
    registerSpell(name, spell, args);
  } else {
    customSpells.push({
      name: name,
      spell: spell,
      args: args
    });
  }
}

export function getCustomSpells() {
  return customSpells;
}

export function spell(name) {
  let s = spells[name];
  if (!s) {
    return null;
  }
  return s[0].spell;
}

export function spells() {
  return _(spells).map((s) => {
    return s[0].spell;
  });
}

registerSpell('all', function() {
  return { hidden: '#all' };
});

registerSpell('words', function(post, args) {
  if (!post || !args || !post.text) {
    return;
  }
  if (post.text.toLowerCase().indexOf(args.toLowerCase()) >= 0) {
    return { hidden: `#words(${args})` };
  }
}, true);

registerSpell('op', function(post) {
  if (post && post.isOp) {
    return { hidden: '#op' };
  }
});

function testSamelines(text) {
  //TODO: magic numbers
  let lines = text.replace(/>/g, '').split(/\s*\n\s*/);
  if (lines.length > 5) {
    lines.sort();
    let len = lines.length;
    for (let i = 0, n = len / 4; i < len;) {
      let line = lines[i];
      let j = 0;
      while (lines[i++] === line) {
        ++j;
      }
      if (j > 4 && j > n && line) {
        return { hidden: '#samelines' };
      }
    }
  }
}

function testSamewords(text) {
  //TODO: magic numbers
  let words = text.replace(/[\s\.\?\!,>]+/g, ' ').toUpperCase().split(' ');
  if (words.length > 3) {
    words.sort();
    let keys = 0;
    for (var i = 0, n = words.length / 4, pop = 0; i < words.length; keys++) {
      let word = words[i];
      let j = 0;
      while (words[i++] === word) {
        ++j;
      }
      if (words.length > 25) {
        if (j > pop && word.length > 2) {
          pop = j;
        }
        if (pop >= n) {
          return { hidden: '#samewords' };
        }
      }
    }
    if ((keys / words.length) < 0.25) {
      return { hidden: '#samewords' };
    }
  }
}

function testLongwords(text) {
  //TODO: magic numbers
  let words = text.replace(/https*:\/\/.*?(\s|$)/g, '').replace(/[\s\.\?!,>:;-]+/g, ' ').split(' ');
  if (words[0].length > 50 || words.length > 1 && (words.join('').length / words.length) > 10) {
    return { hidden: '#longwords' };
  }
}

function testSymbols(text) {
  //TODO: magic numbers
  let txt = text.replace(/\s+/g, '');
  if (txt.length > 30 && (txt.replace(/[0-9a-zа-я\.\?!,]/ig, '').length / txt.length) > 0.4) {
    return { hidden: '#symbols' };
  }
}

function testCapslock(text) {
  //TODO: magic numbers
  let words = text.replace(/[\s\.\?!;,-]+/g, ' ').trim().split(' ');
  if (words.length > 4) {
    let n = 0;
    let capsw = 0;
    let casew = 0;
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      if ((word.match(/[a-zа-я]/ig) || []).length < 5) {
        continue;
      }
      if ((word.match(/[A-ZА-Я]/g) || []).length > 2) {
        casew++;
      }
      if (word === word.toUpperCase()) {
        capsw++;
      }
      n++;
    }
    if ((capsw / n >= 0.3) && n > 4) {
      return { hidden: '#capslock' };
    } else if ((casew / n) >= 0.3 && n > 8) {
      return { hidden: '#capslock' };
    }
  }
}

function testNumbers(text) {
  //TODO: magic numbers
  let txt = text.replace(/\s+/g, ' ').replace(/>>\d+|https*:\/\/.*?(?: |$)/g, '');
  if (txt.length > 30 && (txt.length - txt.replace(/\d/g, '').length) / txt.length > 0.4) {
    return { hidden: '#numbers' };
  }
}

function testWhitespace(text) {
  //TODO: magic numbers
  if (/(?:\n\s*){10}/i.test(text)) {
    return { hidden: '#whitespace' };
  }
}

registerSpell('wipe', function(post, args) {
  if (!post || !args || !post.text) {
    return;
  }
  let text = post.text;
  let list = args.split(',');
  return list.reduce((acc, a) => {
    if (acc) {
      return acc;
    }
    switch (a) {
    case 'samelines': {
      return testSamelines(text);
    }
    case 'samewords': {
      return testSamewords(text);
    }
    case 'longwords': {
      return testLongwords(text);
    }
    case 'symbols': {
      return testSymbols(text);
    }
    case 'capslock': {
      return testCapslock(text);
    }
    case 'numbers': {
      return testNumbers(text);
    }
    case 'whitespace': {
      return testWhitespace(text);
    }
    default: {
      break;
    }
    }
  }, null);
}, true);

registerSpell('subj', function(post, args) {
  if (!post || !post.subject) {
    return;
  }
  if (args) {
    let rx = Tools.regexp(args);
    if (!rx) {
      return;
    }
    if (post.subject.search(rx) >= 0) {
      return { hidden: `#subj(${args}): ${post.subject}` }
    }
  } else if (!post.isDefaultSubject) {
    return { hidden: '#subj' };
  }
}, 'optrx');

registerSpell('name', function(post, args) {
  if (!post || !post.userName) {
    return;
  }
  if (args && post.userName.toLowerCase().indexOf(args.toLowerCase()) >= 0) {
    return { hidden: `#name(${args}): ${post.userName}` };
  }
  if (!args && !post.isDefaultUserName) {
    return { hidden: '#name' };
  }
}, 'opt');

registerSpell('trip', function(post, args) {
  if (!post || !post.tripcode) {
    return;
  }
  if (!args) {
    return { hidden: '#trip' };
  }
  if (post.tripcode.toLowerCase().indexOf(args.toLowerCase()) >= 0) {
    return { hidden: `#trip(${args}): ${post.tripcode}` };
  }
}, 'opt');

registerSpell('sage', function(post) {
  if (!post || !post.sage) {
    return;
  }
  return { hidden: '#sage' };
});

registerSpell('tlen', function(post, args) {
  if (!post || !post.text) {
    return;
  }
  if (!args) {
    if (post.text.length > 0) {
      return { hidden: '#tlen' };
    }
  } else if (Tools.inRanges(args, post.text.length)) {
    return { hidden: `#tlen(${args}): ${post.text.length}` };
  }
}, 'opt');

registerSpell('num', function(post, args) {
  if (!post || !args) {
    return;
  }
  if (Tools.inRanges(args, post.postNumber)) {
    return { hidden: `#num(${args}): ${post.postNumber}` };
  }
}, true);

registerSpell('img', function(post, args) {
  if (!post || !post.files) {
    return;
  }
  if (args) {
    let match = args.match(/^(>|<|\=)?([\d\.\,\-]+)?(@([\d\,\-]+)x([\d\,\-]+))?$/);
    if (!match) {
      return;
    }
    let sizes = match[2];
    let widths = match[4];
    let heights = match[5];
    if (!sizes && !widths && !heights) {
      return;
    }
    let pred = (x, y) => {
      return x === y;
    };
    if (match[1]) {
      if (match[1] === '>') {
        pred = (x, y) => {
          return x > y;
        };
      } else if (match[1] === '<') {
        pred = (x, y) => {
          return x < y;
        };
      }
    }
    return post.files.reduce((acc, file) => {
      if (acc) {
        return acc;
      }
      if ((sizes && Tools.inRanges(sizes, file.size, pred)) || (widths && Tools.inRanges(widths, file.width, pred))
          || (heights && Tools.inRanges(heights, file.height, pred))) {
        return { hidden: `#img(${args}): ${file.href.split('/').pop()}` };
      }
    }, null);
  } else if (post.files.length > 0) {
    return { hidden: '#img' };
  }
}, 'opt');

registerSpell('imgn', function(post, args) {
  if (!post || !args || !post.files) {
    return;
  }
  let rx = Tools.regexp(args);
  if (!rx) {
    return;
  }
  return post.files.reduce((acc, file) => {
    if (acc) {
      return acc;
    }
    if (file.sizeText.search(rx) >= 0) {
      return { hidden: `#imgn(${args}): ${file.href.split('/').pop()}` };
    }
  }, null);
}, true);

registerSpell('ihash', function(post, args, options) {
  args = +args;
  if (!post || !args || args <= 0 || !post.files) {
    return;
  }
  return post.files.reduce((acc, file) => {
    if (acc) {
      return acc;
    }
    if (!file) {
      return;
    }
    if (file.ihash && Tools.hammingDistance(file.ihash, args, options.ihashDistance + 1) <= options.ihashDistance) {
      return { hidden: `#ihash(${args}): ${file.href.split('/').pop()}` };
    }
  }, null);
}, true);

registerSpell('exp', function(post, args) {
  if (!post || !args || !post.text) {
    return;
  }
  let rx = Tools.regexp(args);
  if (!rx) {
    return;
  }
  if (post.text.search(rx) >= 0) {
    return { hidden: `#exp(${args})` };
  }
}, 'rx');

registerSpell('exph', function(post, args) {
  if (!post || !args || !post.textHTML) {
    return;
  }
  let rx = Tools.regexp(args);
  if (!rx) {
    return;
  }
  if (post.textHTML.search(rx) >= 0) {
    return { hidden: `#exph(${args})` };
  }
}, 'rx');

registerSpell('video', function(post, args) {
  if (!post || !post.videos) {
    return;
  }
  if (args) {
    let rx = Tools.regexp(args);
    if (!rx) {
      return;
    }
    post.videos.reduce((acc, video) => {
      if (acc) {
        return acc;
      }
      if (!video) {
        return;
      }
      if (video.title && video.title.search(rx) >= 0) {
        return { hidden: `#video(${args}): ${video.title}` };
      }
    }, null);
  } else {
    return { hidden: '#video' };
  }
}, 'optrx');

registerSpell('vauthor', function(post, args) {
  if (!post || !post.videos || !args) {
    return;
  }
  post.videos.reduce((acc, video) => {
    if (acc) {
      return acc;
    }
    if (!video) {
      return;
    }
    if (video && video.author && video.author === args) {
      return { hidden: `#vauthor(${args}): ${video.author}` };
    }
  }, null);
}, true);

registerSpell('rep', function(post, args) {
  if (!post || !args || !post.innerHTML) {
    return;
  }
  let rx = Tools.regexp(args, true);
  if (!rx) {
    return;
  }
  let nih = post.innerHTML.replace(rx.regexp, rx.rep);
  if (post.innerHTML === nih) {
    return;
  }
  return { replacements: [{ innerHTML: nih }] };
}, 'rxrep');
