import $ from 'jquery';

import * as DOM from '../helpers/dom';
import * as Tools from '../helpers/tools';

let handlers = [];

export let registerHandler = Tools.createRegisterFunction(handlers, 'handler');

export function applyHandlers() {
  return Tools.series(handlers.filter(Tools.testFilter).sort(Tools.priorityPredicate), (h) => {
    return h.handler();
  });
}
