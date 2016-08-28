import SQLiteDatabaseWrapper from './sqlite-database-wrapper';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

export default class SQLAdapter {
  constructor(client) {
    this._wrapper = new SQLiteDatabaseWrapper(client, this);
  }

  async _checkType(key, expectedType, create) {
    let t = await this.type(key);
    if (create) {
      if (expectedType !== t && 'none' !== t) {
        throw new Error('Operation against a key holding the wrong kind of value');
      }
      if ('none' === t) {
        await this._wrapper.run(`INSERT INTO _ololord_metadata (name, type) VALUES (?, ?)`, key, expectedType);
        switch (expectedType) {
        case 'hash':
          await this._wrapper.run(`CREATE TABLE IF NOT EXISTS ${key} (id TEXT PRIMARY KEY NOT NULL, value TEXT)`);
          break;
        case 'list':
          await this._wrapper.run(`CREATE TABLE IF NOT EXISTS ${key} (value TEXT)`);
          break;
        case 'set':
          await this._wrapper.run(`CREATE TABLE IF NOT EXISTS ${key} (value TEXT PRIMARY KEY NOT NULL)`);
          break;
        case 'zset':
          await this._wrapper.run(`CREATE TABLE IF NOT EXISTS ${key} (value TEXT PRIMARY KEY, score INTEGER)`);
          break;
        default:
          break;
        }
      }
    } else {
      if ('none' === t) {
        return null;
      } else if (expectedType !== t) {
        throw new Error('Operation against a key holding the wrong kind of value');
      }
    }
    return true;
  }

  async type(key) {
    let result = await this._wrapper.get(`SELECT type FROM _ololord_metadata WHERE name = ?`, key);
    return result ? result.type : 'none';
  }

  async exists(key) {
    let t = await this.type(key);
    return 'none' !== type;
  }

  async find(query) {
    //TODO: improve replacing, handle unsupported symbols
    query = query.split('*').join('%').split('?').join('_');
    let results = await this._wrapper.get(`SELECT name FROM _ololord_metadata WHERE name LIKE ?`, query);
    return results.map(result => result.name);
  }

  async delete(key) {
    await this._wrapper.transaction(async function(commit, rollback) {
      let t = await this.type(key);
      if ('none' === t) {
        commit(0);
      } else {
        await this._wrapper.run(`DELETE FROM _ololord_metadata WHERE name LIKE ?`, key);
        if ('string' === t) {
          await this._wrapper.run(`DELETE FROM _ololord_keys WHERE key = ?`, key);
        } else {
          await this._wrapper.run(`DROP TABLE ${key}`);
        }
        commit(1);
      }
    });
  }

  async expire(key) {
    Logger.warn(Tools.translate('"expire" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }

  async get(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'string');
      if (!result) {
        return rollback(result);
      }
      result = await this._wrapper.get(`SELECT value FROM _ololord_keys WHERE key = ?`, key);
      result = result || {};
      commit((typeof result.value !== 'undefined') ? result.value : null);
    });
  }

  async set(key, data) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'string', true);
      await this._wrapper.run(`UPDATE _ololord_keys SET value = ? WHERE key = ?`, data, key);
      await this._wrapper.run(`INSERT OR IGNORE INTO _ololord_keys (key, value) VALUES (?, ?)`, key, data);
      commit();
    });
  }

  async incrby(key, value) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'string', true);
      let result = await this._wrapper.get(`SELECT value FROM _ololord_keys WHERE key = ?`, key);
      result = result || {};
      if (result.value && isNaN(+result.value)) {
        throw new Error('value is not an integer');
      }
      if (result.value) {
        result.value = +result.value + +value;
      } else {
        result.value = +value;
      }
      await this._wrapper.run(`UPDATE _ololord_keys SET value = ? WHERE key = ?`, result.value, key);
      await this._wrapper.run(`INSERT OR IGNORE INTO _ololord_keys (key, value) VALUES (?, ?)`, key, result.value);
      commit(result.value);
    });
  }

  async hget(key, id) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        return rollback(result);
      }
      result = await this._wrapper.get(`SELECT value FROM ${key} WHERE id = ?`, id);
      result = result || {};
      commit((typeof result.value !== 'undefined') ? result.value : null);
    });
  }

  async hmget(key, ...ids) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        return rollback(result);
      }
      let q = `SELECT id, value FROM ${key} WHERE id IN (${ids.map(_1 => '?').join(', ')})`;
      let results = await this._wrapper.get(q, key, ...ids);
      results = results.reduce((acc, res) => {
        acc[res.id] = res.value;
        return acc;
      }, {});
      commit(ids.reduce((acc, id) => {
        let res = results[id];
        if (typeof res === 'undefined') {
          acc[id] = null;
        } else {
          acc[id] = (typeof res.value !== 'undefined') ? res.value : null;
        }
        return acc;
      }, {}));
    });
  }

  async hgetall(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        return rollback(result);
      }
      let results = await this._wrapper.get(`SELECT id, value FROM ${key}`);
      commit(results.reduce((acc, res) => {
        acc[res.id] = (typeof res.value !== 'undefined') ? res.value : null;
        return acc;
      }, {}));
    });
  }

  async hexists(key, id) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        return rollback(0);
      }
      result = await this._wrapper.get(`SELECT id FROM ${key} WHERE id = ?`, id);
      result = result || {};
      commit((typeof result.id !== 'undefined') ? 1 : 0);
    });
  }

  async hset(key, id, data) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'hash', true);
      let result = await this._wrapper.get(`SELECT id FROM ${key} WHERE id = ?`, id);
      await this._wrapper.run(`UPDATE ${key} SET value = ? WHERE id = ?`, data, id);
      await this._wrapper.run(`INSERT OR IGNORE INTO ${key} (id, value) VALUES (?, ?)`, id, data);
      result = result || {};
      commit(result.id ? 0 : 1);
    });
  }

  async hmset(key, ...items) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'hash', true);
      let self = this;
      await Tools.series(Tools.chunk(items, 2), async function(chunk) {
        await self._wrapper.run(`UPDATE ${key} SET value = ? WHERE id = ?`, chunk[1], chunk[0]);
        await self._wrapper.run(`INSERT OR IGNORE INTO ${key} (id, value) VALUES (?, ?)`, chunk[0], chunk[1]);
      });
      commit();
    });
  }

  async hincrby(key, id, value) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'hash', true);
      let result = await this._wrapper.get(`SELECT id, value FROM ${key} WHERE id = ?`, id);
      result = result || {};
      if (result.id && isNaN(+result.value)) {
        throw new Error('hash value is not an integer');
      }
      if (result.id) {
        result.value = +result.value + +value;
      } else {
        result.value = +value;
      }
      await this._wrapper.run(`UPDATE ${key} SET value = ? WHERE id = ?`, result.value, id);
      await this._wrapper.run(`INSERT OR IGNORE INTO ${key} (id, value) VALUES (?, ?)`, id, result.value);
      commit(result.value);
    });
  }

  async hdel(key, ...ids) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        return rollback(0);
      }
      let self = this;
      let count = 0;
      await Tools.series(ids, async function(id) {
        let result = await self._wrapper.get(`SELECT id FROM ${key} WHERE id = ?`, id);
        await self._wrapper.run(`DELETE FROM ${key} WHERE id = ?`, id);
        result = result || {};
        if (result.id) {
          ++count;
        }
      });
      result = await this._wrapper.get(`SELECT count(id) FROM ${key}`);
      result = result || {};
      if (Tools.option(result['count(id)'], 'number', { test: (c) => { return c > 0; } }) <= 0) {
        await this._wrapper.run(`DELETE FROM _ololord_metadata WHERE name LIKE ?`, key);
        await this._wrapper.run(`DROP TABLE ${key}`);
      }
      commit(count);
    });
  }

  async hkeys(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        rollback([]);
      }
      let results = await this._wrapper.get(`SELECT id FROM ${key}`);
      commit(results.map(res => res.id));
    });
  }

  async hlen(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'hash');
      if (!result) {
        rollback(0);
      }
      result = await this._wrapper.get(`SELECT count(id) FROM ${key}`);
      result = result || {};
      commit(Tools.option(result['count(id)'], 'number', { test: (c) => { return c > 0; } }));
    });
  }

  async srandmember(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'set');
      if (!result) {
        return rollback(result);
      }
      result = await this._wrapper.get(`SELECT value FROM ${key} LIMIT 1`);
      result = result || {};
      commit((typeof result.value !== 'undefined') ? result.value : null);
    });
  }

  async smembers(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'set');
      if (!result) {
        return rollback([]);
      }
      let results = await this._wrapper.all(`SELECT value FROM ${key}`);
      commit(results.map((res) => { return (typeof res.value !== 'undefined') ? res.value : null; }));
    });
  }

  async sismember(key, data) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'set');
      if (!result) {
        return rollback(0);
      }
      let results = await this._wrapper.all(`SELECT count(value) FROM ${key} WHERE value = ?`, data);
      commit(Tools.option(result['count(value)'], 'number', { test: (c) => { return c > 0; } }));
    });
  }

  async sadd(key, ...items) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      await this._checkType(key, 'set', true);
      let self = this;
      let count = 0;
      await Tools.series(items, async function(data) {
        let result = await self._wrapper.get(`SELECT count(value) FROM ${key} WHERE value = ?`, data);
        result = result || {};
        if (Tools.option(result['count(value)'], 'number', { test: (c) => { return c > 0; } }) <= 0) {
          await self._wrapper.run(`INSERT INTO ${key} (value) VALUES (?)`, data);
          ++count;
        }
      });
      commit(count);
    });
  }

  async srem(key, ...items) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'set');
      if (!result) {
        return rollback(0);
      }
      let self = this;
      let count = 0;
      await Tools.series(ids, async function(data) {
        let result = await self._wrapper.get(`SELECT count(value) FROM ${key} WHERE value = ?`, data);
        await self._wrapper.run(`DELETE FROM ${key} WHERE value = ?`, data);
        result = result || {};
        if (Tools.option(result['count(value)'], 'number', { test: (c) => { return c > 0; } }) >= 0) {
          ++count;
        }
      });
      result = await this._wrapper.get(`SELECT count(value) FROM ${key}`);
      result = result || {};
      if (Tools.option(result['count(id)'], 'number', { test: (c) => { return c > 0; } }) <= 0) {
        await this._wrapper.run(`DELETE FROM _ololord_metadata WHERE name LIKE ?`, key);
        await this._wrapper.run(`DROP TABLE ${key}`);
      }
      commit(count);
    });
  }

  async scard(key) {
    return await this._wrapper.transaction(async function(commit, rollback) {
      let result = await this._checkType(key, 'set');
      if (!result) {
        rollback(0);
      }
      result = await this._wrapper.get(`SELECT count(value) FROM ${key}`);
      result = result || {};
      commit(Tools.option(result['count(value)'], 'number', { test: (c) => { return c > 0; } }));
    });
  }

  async zrange(key, lb, ub) {
    Logger.warn(Tools.translate('"zrange" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }

  async zrangebyscroe(key, lb, ub) {
    Logger.warn(Tools.translate('"zrangebyscroe" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }

  async zadd(key, ...items) {
    Logger.warn(Tools.translate('"zadd" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }

  async zrem(key, ...items) {
    Logger.warn(Tools.translate('"zrem" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }

  async zcard(key) {
    Logger.warn(Tools.translate('"zcard" is not implemented for SQL tables. Table: "$[1]"', '', key));
  }
}
