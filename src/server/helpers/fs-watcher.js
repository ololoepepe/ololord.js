import { EventEmitter } from 'events';
import FS from 'q-io/fs';
import FSSync from 'fs';

export default class FSWatcher extends EventEmitter {
  static createWatchedResource(path, synchronous, asynchronous) {
    if (!FSSync.existsSync(path)) {
      return;
    }
    if (typeof asynchronous === 'function') {
      (new FSWatcher(path)).on('change', async function() {
        try {
          let exists = await FS.exists(path);
          if (exists) {
            await asynchronous(path);
          }
        } catch (err) {
          require('./logger').default.error(err.stack || err);
        }
      });
    }
    return synchronous(path);
  }

  constructor(fileName) {
    super();
    this.fileName = fileName;
    this.resetWatcher();
  }

  async resetWatcher() {
    if (this.watcher) {
      this.watcher.removeAllListeners('change');
      this.watcher.close();
    }
    let exists = await FS.exists(this.fileName);
    if (!exists) {
      return;
    }
    this.watcher = FSSync.watch(this.fileName);
    this.watcher.on('change', (type, fileName) => {
      if ('rename' === type) {
        if (this.fileName.split('/').pop() !== fileName) {
          return;
        }
        this.resetWatcher();
      } else if ('change' === type) {
        this.emit('change');
      }
    });
  }
}
