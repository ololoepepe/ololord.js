var Captcha= require("./captcha");

var googleRecaptcha = new Captcha("google-recaptcha", "Google reCAPTCHA");

googleRecaptcha.checkCaptcha = function(req) {
    return false; //TODO
};

googleRecaptcha.widgetHtml = function(req) {
    return "<div id=\"captcha\" class=\"g-recaptcha\" data-sitekey=\"" + this.publicKey + "\"></div>";
};

googleRecaptcha.scriptSource = function(req) {
    return "https://www.google.com/recaptcha/api.js";
};

module.exports = googleRecaptcha;
