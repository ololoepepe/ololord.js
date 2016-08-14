import _ from 'underscore';

import NodeCaptcha from '../captchas/node-captcha';
import Board from '../boards/board';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';
import * as UsersModel from '../models/users';

var captchas = {};

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: (function(o, name, def) {
            return config("captcha." + o.id + "." + name, def);
        }).bind(o, o, name, def)
    });
};

var Captcha = function(id, title, options) {
    Object.defineProperty(this, "id", { value: id });
    Object.defineProperty(this, "title", {
        get: function() {
            return Tools.translate(title);
        }
    });
    defineSetting(this, "privateKey");
    defineSetting(this, "publicKey");
};

/*public*/ Captcha.prototype.info = function() {
    var info = {
        id: this.id,
        title: this.title,
        publicKey: this.publicKey
    };
    if (this.script)
        info.script = this.script();
    if (this.scriptSource)
        info.scriptSource = this.scriptSource();
    if (this.widgetHtml)
        info.widgetHtml = this.widgetHtml();
    if (this.widgetTemplate)
        info.widgetTemplate = this.widgetTemplate();
    return info;
};

/*public*/ Captcha.prototype.apiRoutes = function() {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/ Captcha.prototype.actionRoutes = function() {
    return []; //[ { method, path, handler }, ... ]
};

Captcha.captcha = function(id) {
    return captchas[id];
};

Captcha.addCaptcha = function(captcha) {
    if (!Captcha.prototype.isPrototypeOf(captcha))
        return;
    captchas[captcha.id] = captcha;
};

Captcha.captchaIds = function() {
    var list = [];
    Tools.toArray(captchas).sort(function(c1, c2) {
        return (c1.id < c2.id) ? -1 : 1;
    }).forEach(function(captcha) {
        list.push(captcha.id);
    });
    return list;
};

Captcha.checkCaptcha = async function(ip, fields = {}) {
  let { boardName } = fields;
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  if (!board.captchaEnabled) {
    return;
  }
  let quota = await UsersModel.getUserCaptchaQuota(boardName, ip);
  if (board.captchaQuota > 0 && +quota > 0) {
    return await UsersModel.useCaptcha(boardName, ip);
  }
  let supportedCaptchaEngines = board.supportedCaptchaEngines;
  if (supportedCaptchaEngines.length < 1) {
    return Promise.reject(new Error(Tools.translate('Internal error: no captcha engine')));
  }
  let ceid = captchaEngine || null;
  if (!ceid || !_(supportedCaptchaEngines).contains(ceid)) {
    if (_(supportedCaptchaEngines).contains(NodeCaptcha.id)) {
      ceid = NodeCaptcha.id;
    } else {
      ceid = supportedCaptchaEngines[0].id;
    }
  }
  let captcha = Captcha.captcha(ceid);
  if (!captcha) {
    return Promise.reject(new Error(Tools.translate('Invalid captcha engine')));
  }
  await captcha.checkCaptcha(ip, fields);
  return await UsersModel.setUserCaptchaQuota(boardName, ip, board.captchaQuota);
};

//NOTE: Must implement the following methods:
//checkCaptcha(ip, fields) -> Promise.resolve() / Promise.reject(err)
//widgetHtml() -> string
//or
//widgetTemplate() -> string
//NOTE: May implement the following methods:
//script() -> string
//scriptSource() -> string

module.exports = Captcha;
