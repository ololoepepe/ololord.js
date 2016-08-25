const METADATA_SCHEMA =
  'CREATE TABLE IF NOT EXISTS _ololord_metadata (name TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL)';
const KEYS_SCHEMA = 'CREATE TABLE IF NOT EXISTS _ololord_keys (key TEXT PRIMARY KEY NOT NULL, value TEXT)';

export default class SQLiteDatabaseWrapper {
  constructor(client, adapter) {
    this._client = client;
    this._adapter = adapter;
    this._initialized = false;
    this._transactionQueue = [];
    this._currentTransaction = false;
  }

  async _awaitClient() {
    if (this._initialized) {
      return;
    }
    this._client = await this._client;
    await this._runRaw(`BEGIN TRANSACTION`);
    await this._runRaw(METADATA_SCHEMA);
    await this._runRaw(KEYS_SCHEMA);
    await this._runRaw(`COMMIT TRANSACTION`);
    this._initialized = true;
  }

  async _runRaw(statement, ...params) {
    return new Promise((resolve, reject) => {
      this._client.run(statement, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async run(...args) {
    await this._awaitClient();
    return await this._runRaw(...args);
  }

  async get(statement, ...params) {
    await this._awaitClient();
    return new Promise((resolve, reject) => {
      this._client.get(statement, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(statement, ...params) {
    await this._awaitClient();
    return new Promise((resolve, reject) => {
      this._client.all(statement, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async _checkTransactionQueue() {
    if (this._transactionQueue.length <= 0) {
      this._currentTransaction = false;
      return;
    }
    let next = this._transactionQueue.shift();
    this._currentTransaction = true;
    await this._awaitClient();
    try {
      await this._runRaw(`BEGIN ${next.type || ''} TRANSACTION`);
      let state;
      next.resolve({
        state: state,
        commit: () => {
          return new Promise((resolve, reject) => {
            this._runRaw(`COMMIT TRANSACTION`).then(() => {
              state = true;
              resolve();
              this._checkTransactionQueue();
            }).catch((err) => {
              reject(err);
              this._checkTransactionQueue();
            });
          });
        },
        rollback: () => {
          return new Promise((resolve, reject) => {
            this._runRaw(`ROLLBACK TRANSACTION`).then(() => {
              state = false;
              resolve();
              this._checkTransactionQueue();
            }).catch((err) => {
              reject(err);
              this._checkTransactionQueue();
            });
          });
        }
      });
    } catch (err) {
      next.reject(err);
    }
  }

  async _transaction(transactionType) {
    let promise = new Promise((resolve, reject) => {
      this._transactionQueue.push({
        resolve: resolve,
        reject: reject,
        type: transactionType || ''
      });
    });
    if (!this._currentTransaction) {
      this._checkTransactionQueue();
    }
    return promise;
  }

  async transaction(f) {
    let t;
    try {
      t = await this._transaction();
      let result;
      let committed = false;
      await f.call(this._adapter, (res) => {
        committed = true;
        result = res;
      }, (res) => {
        committed = false;
        result = res;
      });
      if (committed) {
        await t.commit();
      } else {
        await t.rollback();
      }
      return result;
    } catch (err) {
      if (t && typeof t.state === 'undefined') {
        try {
          await t.rollback();
        } catch (err) {
          throw err;
        }
      }
      throw err;
    }
  }
}
