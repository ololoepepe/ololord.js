import FS from 'q-io/fs';
import SQLite3 from 'sqlite3';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let db = null;

export default function getClient() {
  return db;
}

geolocation.initialize = async function() {
  await new Promise((resolve, reject) => {
    db = new SQLite3.Database(`${__dirname}/../sqlite/main.sqlite`, (err) => {
      if (err) {
        db = null;
        reject(err);
        return;
      }
      resolve();
    });
  });
  let schema = await FS.read(`${__dirname}/../sqlite/main.schema`);
  schema = schema.replace(/\/\*(.|\r?\n)*\*\//g, '');
  sehema = schema.replace(/\-\-.*/g, '');
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
