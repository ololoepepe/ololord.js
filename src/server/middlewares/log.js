import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

let excludePaths = {};
let excludeRules = [];

function resetExcluded(val, key) {
  excludePaths = {};
  excludeRules = [];
  (val || []).forEach((rule) => {
    if (rule.regexp) {
      excludeRules.push(new RegExp(rule.regexp, rule.flags));
    } else if (rule.string) {
      excludePaths[rule.string] = {};
    }
  });
}

config.on('system.log.middleware.exclude', resetExcluded);
resetExcluded(config('system.log.middleware.exclude', []));

function exclude(path) {
  return excludePaths.hasOwnProperty(path) || excludeRules.some(rule => path.match(rule));
}

export default async function(req, res, next) {
  if (exclude(req.path)) {
    return next();
  }
  if (req.method.match(/^post|put|patch|delete$/i) && config('system.log.middleware.verbosity') === 'all') {
    let args = [Tools.preferIPv4(req.ip), req.path, req.query];
    try {
      let { fields, files } = await Tools.parseForm(req);
      req.formFields = fields;
      req.formFiles = files;
      args.push(fields);
      Logger.info(...args);
    } catch (err) {
      Logger.error(err);
    }
    next();
  }
  switch (config('system.log.middleware.verbosity')) {
  case 'all':
  case 'query':
    Logger.info(Tools.preferIPv4(req.ip), req.path, req.query);
    break;
  case 'path':
    Logger.info(Tools.preferIPv4(req.ip), req.path);
    break;
  case 'ip':
    Logger.info(Tools.preferIPv4(req.ip));
    break;
  default:
    break;
  }
  next();
}
