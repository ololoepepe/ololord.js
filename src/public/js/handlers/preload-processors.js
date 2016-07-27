import * as Tools from '../helpers/tools';
import * as Threads from '../core/threads';

let processors = [];

export let registerProcessor = Tools.createRegisterFunction(processors);

registerProcessor(Threads.updateLastPostNumbers, {
  test: () => {
    return Tools.isBoardPage() && !Tools.isThreadPage();
  }
});

export function executeProcessors() {
  processors.filter(Tools.testFilter).sort(Tools.priorityPredicate).forEach((p) => {
    p.processor();
  });
}
