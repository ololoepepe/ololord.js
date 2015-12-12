var FSSync = require("fs");
var Util = require("util");

var Captcha = require("./captcha");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file && "js" != file.split(".").pop())
        return;
    var captcha = require("./" + file.split(".").shift());
    if (Util.isArray(captcha)) {
        captcha.forEach(function(captcha) {
            Captcha.addCaptcha(captcha);
        });
    } else {
        Captcha.addCaptcha(captcha);
    }
});

module.exports = Captcha;
