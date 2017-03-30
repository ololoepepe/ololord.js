import SQLite3 from 'sqlite3';

let clients = new Map();

function createClient(name) {
  return new Promise((resolve, reject) => {
    let db = new SQLite3.Database(`${__dirname}/../../sqlite/${name}.sqlite`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      db.transaction = () => {
        return new Promise((resolve, reject) => {
          db.run('BEGIN TRANSACTION', [], (err) => {
            if (err) {
              reject(err);
            } else {
              db.manualTransaction = true;
              resolve();
            }
          });
        });
      };
      db.commit = () => {
        return new Promise((resolve, reject) => {
          db.run('COMMIT TRANSACTION', [], (err) => {
            db.manualTransaction = false;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      };
      db.rollback = () => {
        return new Promise((resolve, reject) => {
          db.run('ROLLBACK TRANSACTION', [], (err) => {
            db.manualTransaction = false;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
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
