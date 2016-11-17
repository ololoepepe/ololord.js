import _ from 'underscore';
import FSSync from 'fs';
import { MongoClient } from 'mongodb';

import config from '../helpers/config';
import * as Tools from '../helpers/tools';

const INDEX_PATH = `${__dirname}/../../misc/mongodb/indexes`;
const INDEXES = _([INDEX_PATH, `${INDEX_PATH}/custom`].map((path) => {
  return FSSync.readdirSync(path).map(entry => `${path}/${entry}`).filter((entry) => {
    return (entry.split('.').slice(-1)[0] === 'json') && FSSync.statSync(entry).isFile();
  });
})).flatten().map((file) => {
  try {
    let json = require(file);
    return {
      collectionName: json.collectionName || file.split('.').slice(0, -1).join('.'),
      indexes: json.indexes
    };
  } catch (err) {
    console.log(err);
  }
}).filter(index => !!index).reduce((acc, index) => {
  let indexes = acc[index.collectionName];
  if (!indexes) {
    indexes = {};
  }
  _(index.indexes).each((index, name) => {
    indexes[name] = index;
  });
  acc[index.collectionName] = indexes;
  return acc;
}, {});

let client = null;

function createClient(url, options) {
  url = url || config('system.mongodb.url');
  options = options || { uri_decode_auth: config(`system.mongodb.uri_decode_auth`) };
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, options, (err, db) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

class MongoDBClient {
  constructor() {
    //
  }

  async addUser(...args) {
    await this.waitForConnected();
    return await this._db.addUser.call(this._db, ...args);
  }

  async admin(...args) {
    await this.waitForConnected();
    return await this._db.admin.call(this._db, ...args);
  }

  async authenticate(...args) {
    await this.waitForConnected();
    return await this._db.authenticate.call(this._db, ...args);
  }

  async close(...args) {
    await this.waitForConnected();
    return await this._db.close.call(this._db, ...args);
  }

  async collection(...args) {
    await this.waitForConnected();
    return await this._db.collection.call(this._db, ...args);
  }

  async collections(...args) {
    await this.waitForConnected();
    return await this._db.collections.call(this._db, ...args);
  }

  async command(...args) {
    await this.waitForConnected();
    return await this._db.command.call(this._db, ...args);
  }

  async createCollection(...args) {
    await this.waitForConnected();
    return await this._db.createCollection.call(this._db, ...args);
  }

  async createIndex(...args) {
    await this.waitForConnected();
    return await this._db.createIndex.call(this._db, ...args);
  }

  async db(...args) {
    await this.waitForConnected();
    return await this._db.db.call(this._db, ...args);
  }

  async dropCollection(...args) {
    await this.waitForConnected();
    return await this._db.dropCollection.call(this._db, ...args);
  }

  async dropDatabase(...args) {
    await this.waitForConnected();
    return await this._db.dropDatabase.call(this._db, ...args);
  }

  async executeDbAdminCommand(...args) {
    await this.waitForConnected();
    return await this._db.executeDbAdminCommand.call(this._db, ...args);
  }

  async indexInformation(...args) {
    await this.waitForConnected();
    return await this._db.indexInformation.call(this._db, ...args);
  }

  async listCollections(...args) {
    await this.waitForConnected();
    return await this._db.listCollections.call(this._db, ...args);
  }

  async logout(...args) {
    await this.waitForConnected();
    return await this._db.logout.call(this._db, ...args);
  }

  async open(...args) {
    await this.waitForConnected();
    return await this._db.open.call(this._db, ...args);
  }

  async removeUser(...args) {
    await this.waitForConnected();
    return await this._db.removeUser.call(this._db, ...args);
  }

  async renameCollection(...args) {
    await this.waitForConnected();
    return await this._db.renameCollection.call(this._db, ...args);
  }

  async stats(...args) {
    await this.waitForConnected();
    return await this._db.stats.call(this._db, ...args);
  }

  async unref(...args) {
    await this.waitForConnected();
    return await this._db.unref.call(this._db, ...args);
  }

  async createIndexes({ dropExisting, dropAll } = {}) {
    await this.waitForConnected();
    let db = this._db;
    await Tools.series(INDEXES, async function(indexes, collectionName) {
      let collection = db.collection(collectionName);
      if (dropAll) {
        await collection.dropIndexes();
      }
      return Tools.series(indexes, async function({ index, options = {} }, name) {
        if (dropExisting && !dropAll) {
          await collection.dropIndex(name);
        }
        options.name = name;
        return await collection.createIndex(index, options);
      });
    });
  }

  async waitForConnected() {
    if (!this._db) {
      console.log(Tools.translate('Connecting to MongoDB, please, wait…'));
      this._db = await createClient();
    }
  }
}

export default function() {
  if (!client) {
    client = new MongoDBClient();
  }
  return client;
}
