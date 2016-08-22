import FS from 'q-io/fs';
import SQLite3 from 'sqlite3';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let clients = new Map();

function createClient(name) {
  return new Promise((resolve, reject) => {
    let db = new SQLite3.Database(`${__dirname}/../sqlite/${name}.sqlite`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      db.initialize = async function() {
        let path = `${__dirname}/../sqlite/${name}.schema`;
        let exists = await FS.exists(path);
        let schema = await FS.read(path);
        schema = schema.replace(/\/\*(.|\r?\n)*\*\//g, '');
        schema = schema.replace(/\-\-.*/g, '');
        schema = schema.replace(/\r?\n+/g, ' ');
        let statements = schema.split(';').filter((statement) => !/^\s+$/.test(statement));
        await Tools.series(statements, async function(statement) {
          return await new Promise((resolve, reject) => {
            db.run(statement, [], (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        });
      };
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
