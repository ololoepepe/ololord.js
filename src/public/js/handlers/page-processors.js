import * as DOM from '../helpers/dom';
import * as Tools from '../helpers/tools';

let processors = [];

export let registerProcessor = Tools.createRegisterFunction(processors);

registerProcessor(DOM.processFormattedDate, { priority: 0 });

export function applyProcessors(parent) {
  parent = parent || window.document.body;
  return Tools.series(processors.filter(Tools.testFilter).sort(Tools.priorityPredicate), (p) => {
    return p.processor(parent);
  });
}
