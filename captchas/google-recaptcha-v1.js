var HTTP = require("q-io/http");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var googleRecaptcha = new Captcha("google-recaptcha-v1", Tools.translate.noop("Google reCAPTCHA v1"));

googleRecaptcha.checkCaptcha = function(req, fields) {
    var challenge = fields.recaptcha_challenge_field;
    var response = fields.recaptcha_response_field;
    if (!challenge)
        return Promise.reject("Captcha challenge is empty");
    if (!response)
        return Promise.reject("Captcha is empty", "error");
    var query = `privatekey=${this.privateKey}&remoteip=${req.ip}&challenge=${encodeURIComponent(challenge)}`
        + `&response=${encodeURIComponent(response)}`;
    var url = "https://www.google.com/recaptcha/api/verify?" + query;
    return HTTP.request({
        url: url,
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject("Failed to check captcha");
        return response.body.read("utf8");
    }).then(function(data) {
        var result = data.toString();
        if (result.replace("true", "") == result)
            return Promise.reject("Invalid captcha");
        return Promise.resolve();
    });
};

googleRecaptcha.widgetTemplate = function() {
    return "googleRecaptchaV1Widget";
};

googleRecaptcha.scriptSource = function() {
    return "/" + config("site.pathPrefix", "") + "js/google-recaptcha-v1-script.js";
};

module.exports = googleRecaptcha;
