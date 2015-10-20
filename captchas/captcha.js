var config = require("../helpers/config");
var Tools = require("../helpers/tools");

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
            return Tools.translateWrapper(title);
        }
    });
    defineSetting(this, "privateKey");
    defineSetting(this, "publicKey");
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
    Tools.forIn(captchas, function(_, id) {
        list.push(id);
    });
    return list;
};

//NOTE: Must implement the following methods:
//checkCaptcha(req) -> {ok: boolean, message: string}
//widgetHtml(req) -> string
//NOTE: May implement the following methods:
//headerHtml(req) -> string
//scriptSource(req) -> string

module.exports = Captcha;
