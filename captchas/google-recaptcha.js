var HTTP = require("q-io/http");

var Captcha = require("./captcha");
var Tools = require("../helpers/tools");

var googleRecaptcha = new Captcha("google-recaptcha", Tools.translate.noop("Google reCAPTCHA"));

googleRecaptcha.checkCaptcha = function(req, fields) {
    var captcha = fields["g-recaptcha-response"];
    if (!captcha)
        return Promise.reject("Captcha is empty");
    var query = `secret=${this.privateKey}&response=${captcha}&remoteip=${req.trueIp}`;
    var url = "https://www.google.com/recaptcha/api/siteverify?" + query;
    return HTTP.request({
        url: url,
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject("Failed to check captcha");
        return response.body.read("utf8");
    }).then(function(data) {
        var reply = JSON.parse(data.toString());
        if (!reply.success) {
            if (reply["error-codes"].indexOf("missing-input-secret") >= 0)
                return Promise.reject("The secret parameter is missing");
            else if (reply["error-codes"].indexOf("invalid-input-secret") >= 0)
                return Promise.reject("The secret parameter is invalid or malformed");
            else if (reply["error-codes"].indexOf("missing-input-response") >= 0)
                return Promise.reject("The response parameter is missing");
            else if (reply["error-codes"].indexOf("invalid-input-response") >= 0)
                return Promise.reject("The response parameter is invalid or malformed");
            else
                return Promise.reject("Invalid captcha");
        } else {
            return Promise.resolve();
        }
    });
};

googleRecaptcha.widgetHtml = function(req, _) {
    return `<div id="captcha" class="g-recaptcha" data-sitekey="${this.publicKey}"></div>`;
};

googleRecaptcha.scriptSource = function(req) {
    return "https://www.google.com/recaptcha/api.js";
};

module.exports = googleRecaptcha;
