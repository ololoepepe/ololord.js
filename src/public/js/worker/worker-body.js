import 'babel-polyfill';

import * as Tasks from './tasks';
import * as Tools from '../helpers/tools';

export default function workerBody(self) {
  self.addEventListener('message', async function(message) {
    try {
      message = JSON.parse(message.data);
    } catch (err) {
      self.postMessage(JSON.stringify({
        id: '_error',
        error: err
      }));
      return;
    }
    let f = Tasks[message.type];
    if (typeof f !== 'function') {
      self.postMessage(JSON.stringify({
        id: message.id,
        type: message.type,
        error: Tools.translate('Worker method not found: $[1]', '', message.type)
      }));
      return;
    }
    try {
      let data = await f(message.data);
      self.postMessage(JSON.stringify({
        id: message.id,
        type: message.type,
        data: data
      }));
    } catch (err) {
      self.postMessage(JSON.stringify({
        id: message.id,
        type: message.type,
        error: '' + err //NOTE: Well, you know, it's a WebWorker.
      }));
    }
  });
}
