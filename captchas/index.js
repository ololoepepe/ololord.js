var Captcha = require("./captcha");

Captcha.addCaptcha(require("./google-recaptcha"));

module.exports = Captcha;
