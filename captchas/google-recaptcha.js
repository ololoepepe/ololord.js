"use strict";

var HTTP = require("q-io/http");

var Captcha = require("./captcha");
var Tools = require("../helpers/tools");

var googleRecaptcha = new Captcha("google-recaptcha", Tools.translate.noop("Google reCAPTCHA"));

googleRecaptcha.checkCaptcha = function (ip, fields) {
    var captcha = fields["g-recaptcha-response"];
    if (!captcha) return Promise.reject(Tools.translate("Captcha is empty"));
    var query = "secret=" + this.privateKey + "&response=" + captcha + "&remoteip=" + ip;
    var url = "https://www.google.com/recaptcha/api/siteverify?" + query;
    return HTTP.request({
        url: url,
        timeout: 15 * Tools.Second
    }).then(function (response) {
        if (response.status != 200) return Promise.reject(Tools.translate("Failed to check captcha"));
        return response.body.read("utf8");
    }).then(function (data) {
        var reply = JSON.parse(data.toString());
        if (!reply.success) {
            if (reply["error-codes"].indexOf("missing-input-secret") >= 0) return Promise.reject(Tools.translate("The secret captcha parameter is missing"));else if (reply["error-codes"].indexOf("invalid-input-secret") >= 0) return Promise.reject(Tools.translate("The secret captcha parameter is invalid or malformed"));else if (reply["error-codes"].indexOf("missing-input-response") >= 0) return Promise.reject(Tools.translate("The captcha response parameter is missing"));else if (reply["error-codes"].indexOf("invalid-input-response") >= 0) return Promise.reject(Tools.translate("The captcha response parameter is invalid or malformed"));else return Promise.reject(Tools.translate("Invalid captcha"));
        } else {
            return Promise.resolve();
        }
    });
};

module.exports = googleRecaptcha;
//# sourceMappingURL=google-recaptcha.js.map
