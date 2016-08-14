import IPAddress from 'ip-address';
import promisify from 'promisify';
import SQLite3 from 'sqlite3';

import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

try {
  var db = new SQLite3.Database(`${__dirname}/../geolocation/ip2location.sqlite`);
} catch (err) {
  Logger.error(err.stack || err);
  Logger.error(new Error(Tools.translate('No geolocation database found. Geolocation will be disabled.')));
  var db = null;
}

export default async function geolocation(ip) {
  let info = {
    cityName: null,
    countryCode: null,
    countryName: null
  };
  if (!db || !ip) {
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
