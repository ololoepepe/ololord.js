import _ from 'underscore';

import Board from '../boards/board';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import * as UsersModel from '../models/users';

let captchas = {};

export default class Captcha {
  static captcha(id) {
    return captchas[id];
  }

  static addCaptcha(captcha) {
    captchas[captcha.id] = captcha;
  }

  static captchaIDs() {
    return _(captchas).toArray().sort((c1, c2) => { return c1.id.localeCompare(c2.id); }).map(captcha => captcha.id);
  }

  static async checkCaptcha(req, fields = {}) {
    let { boardName, captchaEngine } = fields;
    let board = Board.board(boardName);
    if (!board) {
      throw new Error(Tools.translate('Invalid board'));
    }
    if (!board.captchaEnabled) {
      return;
    }
    let quota = await UsersModel.getUserCaptchaQuota(boardName, req.hashpass || req.ip);
    if (board.captchaQuota > 0 && +quota > 0) {
      return await UsersModel.useCaptcha(boardName, req.hashpass || req.ip);
    }
    let supportedCaptchaEngines = board.supportedCaptchaEngines;
    if (supportedCaptchaEngines.length < 1) {
      throw new Error(Tools.translate('Internal error: no captcha engine'));
    }
    let ceid = captchaEngine || null;
    if (!ceid || !_(supportedCaptchaEngines).contains(ceid)) {
      if (_(supportedCaptchaEngines).contains(Tools.NODE_CAPTCHA_ID)) {
        ceid = Tools.NODE_CAPTCHA_ID;
      } else {
        ceid = supportedCaptchaEngines[0].id;
      }
    }
    let captcha = Captcha.captcha(ceid);
    if (!captcha) {
      throw new Error(Tools.translate('Invalid captcha engine'));
    }
    await captcha.checkCaptcha(req.hashpass || req.ip, fields);
    return await UsersModel.setUserCaptchaQuota(boardName, req.hashpass || req.ip, board.captchaQuota);
  }

  static initialize() {
    captchas = {};
    Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
      return ('captcha.js' !== fileName) || (path.split('/') === 'custom');
    }).map((plugin) => {
      return (typeof plugin === 'function') ? new plugin() : plugin;
    }).forEach((captcha) => {
      Captcha.addCaptcha(captcha);
    });
  }

  constructor(id, title) {
    this.defineProperty('id', id);
    this.defineProperty('title', () => { return Tools.translate(title); });
    this.defineSetting('privateKey');
    this.defineSetting('publicKey');
  }

  defineSetting(name, def) {
    Object.defineProperty(this, name, {
      get: () => {
        return config(`captcha.${this.id}.${name}`, (typeof def === 'function') ? def() : def);
      },
      configurable: true
    });
  }

  defineProperty(name, value) {
    if (typeof value === 'function') {
      Object.defineProperty(this, name, {
        get: value,
        configurable: true
      });
    } else {
      Object.defineProperty(this, name, {
        value: value,
        configurable: true
      });
    }
  }

  info() {
    let model = {
      id: this.id,
      title: this.title,
      publicKey: this.publicKey
    };
    this.customInfoFields().forEach((field) => {
      model[field] = this[field];
    });
    return model;
  }

  customInfoFields() {
    return [];
  }

  apiRoutes() {
    return [];
  }

  actionRoutes() {
    return [];
  }
}
