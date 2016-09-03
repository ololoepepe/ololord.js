import FS from 'q-io/fs';

import Logger from './logger';
import * as Tools from './tools';

export default class PostCreationTransaction {
  constructor(boardName) {
    this.boardName = boardName;
    this.files = [];
  }

  addFile(path) {
    this.files.push(path);
  }

  setThreadNumber(threadNumber) {
    this.threadNumber = threadNumber;
  }

  setPostNumber(postNumber) {
    this.postNumber = postNumber;
  }

  async rollback() {
    try {
      await this._rollbackFiles();
      if (this.threadNumber > 0) {
        await this._rollbackThread();
      }
      if (this.postNumber > 0) {
        await this._rollbackPost();
      }
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }

  async _rollbackFiles() {
    await Tools.series(this.files, async function(path) {
      try {
        let exists = await FS.exists(path);
        if (exists) {
          await FS.remove(path);
        }
      } catch (err) {
        Logger.error(err.stack || err);
      }
    });
  }

  async _rollbackThread() {
    try {
      /*
      return removeThread(_this.board.name, _this.threadNumber).catch(function(err) {
          Logger.error(err.stack || err);
      });
      */
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }

  async _rollbackPost() {
    try {
      /*
      return removePost(_this.board.name, _this.postNumber).catch(function(err) {
          Logger.error(err.stack || err);
      });
      */
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }
}
