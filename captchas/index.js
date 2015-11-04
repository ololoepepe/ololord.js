var Captcha = require("./captcha");

Captcha.addCaptcha(require("./google-recaptcha"));
require("./yandex-captcha").forEach(function(captcha) {
    Captcha.addCaptcha(captcha);
});

module.exports = Captcha;
