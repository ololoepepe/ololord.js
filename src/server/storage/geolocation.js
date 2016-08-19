import IPAddress from 'ip-address';
import promisify from 'promisify-node';
import SQLite3 from 'sqlite3';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let db = null;

async function geolocation(ip) {
  let info = {
    cityName: null,
    countryCode: null,
    countryName: null
  };
  if (!db) {
    Logger.error(new Error(Tools.translate('No geolocation database found. Geolocation is disabled.')));
    return info;
  }
  if (!ip) {
    return info;
  }
  let address = Tools.correctAddress(ip);
  if (!address) {
    return info;
  }
  let ipv4 = Tools.preferIPv4(ip);
  let query = 'SELECT ipFrom, countryCode, countryName, cityName FROM ip2location WHERE ipTo >= ? LIMIT 1';
  let statement = db.prepare(query);
  statement.pget = promisify(statement.get);
  if (ipv4) {
    address = bigInt(new IPAddress.Address4(ipv4).bigInteger().toString());
  } else {
    address = bigInt(new IPAddress.Address6(address).bigInteger().toString());
  }
  let result = await statement.pget(address.toString());
  statement.finalize();
  if (!result) {
    return info;
  }
  let ipFrom;
  try {
    ipFrom = bigInt(result.ipFrom);
  } catch (err) {
    Logger.error(err.stack || err);
    return info;
  }
  if (ipFrom.greater(address)) {
    return info;
  }
  info.cityName = result.cityName;
  info.countryCode = result.countryCode;
  info.countryName = result.countryName;
  return info;
}

geolocation.initialize = async function() {
  await new Promise((resolve) => {
    db = new SQLite3.Database(`${__dirname}/../sqlite/ip2location.sqlite`, SQLite3.OPEN_READONLY, (err) => {
      if (err) {
        db = null;
        Logger.error(err.stack || err);
        Logger.error(new Error(Tools.translate('No geolocation database found. Geolocation will be disabled.')));
      }
      resolve();
    });
  });
};

export default geolocation;
