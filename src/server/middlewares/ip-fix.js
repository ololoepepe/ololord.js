import { Address4, Address6 } from 'ip-address';

import config from '../helpers/config';
import * as Tools from '../helpers/tools';

export default function(req, res, next) {
  if (fast && req.socket.ip) {
    req.ip = req.socket.ip;
    next();
    return;
  }
  let trueIp = Tools.correctAddress(req.ip || req.connection.remoteAddress);
  if (!trueIp) {
    return res.sendStatus(500);
  }
  if (config('system.detectRealIp')) {
    let ip = req.headers['x-forwarded-for'];
    if (!ip) {
      ip = req.headers['x-client-ip'];
    }
    if (ip) {
      let address = Tools.correctAddress(ip);
      if (!address) {
        return res.sendStatus(500);
      }
      trueIp = address;
    }
  }
  if (config('system.useXRealIp', false)) {
    let ip = req.headers['x-real-ip'];
    let address = Tools.correctAddress(ip);
    if (!address) {
      return res.sendStatus(500);
    }
    trueIp = address;
  }
  req.ip = trueIp;
  next();
}
