import CodeMirror from 'codemirror';
import UUID from 'uuid';
import work from 'webworkify';

import * as Spells from './spells';
import workerBody from './worker-body';
import * as DOM from '../helpers/dom';

let worker = null;
let workerTasks = {};
let first = true;

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

export function doWork(type, data, transferable) {
  if (!worker) {
    return Promise.reject(Tools.translate('WebWorker is not initialzed'));
  }
  return new Promise((resolve, reject) => {
    const ID = UUID.v1();
    workerTasks[ID] = {
      resolve: resolve,
      reject: reject
    };
    worker.postMessage(JSON.stringify({
      id: ID,
      type: type,
      data: data
    }), transferable || []);
  });
}
