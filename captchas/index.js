var Captcha = require("./captcha");

Captcha.addCaptcha(require("./google-recaptcha"));
Captcha.addCaptcha(require("./google-recaptcha-v1"));
require("./yandex-captcha").forEach(function(captcha) {
    Captcha.addCaptcha(captcha);
});

module.exports = Captcha;
