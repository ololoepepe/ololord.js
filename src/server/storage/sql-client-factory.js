import FS from 'q-io/fs';
import SQLite3 from 'sqlite3';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let clients = new Map();

function createClient(name) {
  return new Promise((resolve, reject) => {
    let db = new SQLite3.Database(`${__projroot}/../sqlite/${name}.sqlite`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

export default function(name) {
  if (!name) {
    name = 'main';
  }
  let client = clients.get(name);
  if (!client) {
    client = createClient(name);
    clients.set(name, client);
  }
  return client;
}
