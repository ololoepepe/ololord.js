import cookieParser from 'cookie-parser';
import DDDoS from 'dddos';
import express from 'express';

import cookies from './cookies';
import hashpass from './hashpass';
import ipFix from './ip-fix';
import log from './log';
import onlineCounter from './online-counter';
import registeredUser from './registered-user';
import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const BEFORE = config('system.log.middleware.before');
let middlewares = [];

function setupDdos() {
  if ('ddos' === BEFORE) {
    middlewares.push(log);
  }
  if (!config('server.ddosProtection.enabled')) {
    return;
  }
  middlewares.push(new DDDoS({
    errorData: config('server.ddosProtection.errorData'),
    errorCode: config('server.ddosProtection.errorCode'),
    weight: config('server.ddosProtection.weight'),
    maxWeight: config('server.ddosProtection.maxWeight'),
    checkInterval: config('server.ddosProtection.checkInterval'),
    rules: config('server.ddosProtection.rules'),
    logFunction: (...args) => {
      Logger.error(Logger, Tools.translate('DDoS detected:'), ...args);
    }
  }).express());
}

function setupStatic() {
  if ('static' === BEFORE) {
    middlewares.push(log);
  }
  middlewares.push(express.static(`${__dirname}/../public`));
}

if ('all' === BEFORE) {
  middlewares.push(log);
}

middlewares.push(ipFix);

middlewares.push(onlineCounter);

if (config('server.ddosProtection.static')) {
  setupDdos();
  setupStatic();
} else {
  setupStatic();
  setupDdos();
}

if ('middleware' === BEFORE) {
  middlewares.push(log);
}

middlewares.push(cookieParser());

middlewares.push(hashpass);

middlewares.push(registeredUser);

if ('request' === BEFORE) {
  middlewares.push(log);
}

middlewares.push(cookies);

export default middlewares;
