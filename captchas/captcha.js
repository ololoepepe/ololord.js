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

//NOTE: Must implement the following methods:
//checkCaptcha(req, fields) -> Promise.resolve() / Promise.reject(err)
//widgetHtml() -> string
//or
//widgetTemplate() -> string
//NOTE: May implement the following methods:
//script() -> string
//scriptSource() -> string

module.exports = Captcha;
