import CodeMirror from 'codemirror';
import UUID from 'uuid';
import work from 'webworkify';

import * as Spells from './spells';
import workerBody from './worker-body';
import * as DOM from '../helpers/dom';
import * as Tools from '../helpers/tools';

let worker = null;
let workerTasks = {};
let first = true;
let customSpellsRegistered = false;
let customSpellsPromise = null;

export function initialize() {
  CodeMirror.defineSimpleMode('spells', {
    start: [{
      regex: /\((?:[^\\]|\\.)*?\)/,
      token: 'string'
    }, {
      regex: /(?:#)\b/,
      token: 'keyword'
    }, {
      regex: new RegExp(Spells.spells().map(spell => spell.name).join('|')),
      token: 'atom'
    }, {
      regex: /[\[\(]/,
      indent: true
    }, {
      regex: /[\]\)]/,
      dedent: true
    }, {
      regex: /[a-z$][\w$]*/,
      token: 'variable'
    }]
  });
  if (worker) {
    return;
  }
  worker = work(workerBody);
  worker.addEventListener('message', (message) => {
    if (first) {
      window.URL.revokeObjectURL(worker.objectURL);
      first = false;
    }
    try {
      message = JSON.parse(message.data);
    } catch (err) {
      DOM.handleError(err);
      return;
    }
    let task = workerTasks[message.id];
    if (!task) {
      if ('_error' === message.id) {
        DOM.handleError(message.error);
      }
      return;
    }
    delete workerTasks[message.id];
    if (!message.error) {
      task.resolve(message.data);
    } else {
      task.reject(message.error);
    }
  });
}

function doWorkInternal(type, data) {
  if (!worker) {
    return Promise.reject(Tools.translate('WebWorker is not initialzed'));
  }
  return new Promise((resolve, reject) => {
    const ID = UUID.v4();
    workerTasks[ID] = {
      resolve: resolve,
      reject: reject
    };
    let msg = JSON.stringify({
      id: ID,
      type: type,
      data: data
    });
    worker.postMessage(msg);
  });
}

function getCustomSpells() {
  return Spells.getCustomSpells().map(({ name, spell, args }) => {
    return {
      name: name,
      func: {
        args: Tools.getFunctionArgs(spell),
        body: spell.toString().replace(/^\s*function.+?\{\s*/, '').replace(/\s*\}\s*$/, '')
      },
      args: args
    }
  });
}

export async function doWork(type, data) {
  if (!customSpellsRegistered) {
    if (!customSpellsPromise) {
      customSpellsPromise = doWorkInternal('registerCustomSpells', getCustomSpells());
    }
    await customSpellsPromise;
    customSpellsPromise = null;
    customSpellsRegistered = true;
  }
  return doWorkInternal(type, data);
}
