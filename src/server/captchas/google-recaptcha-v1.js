var HTTP = require("q-io/http");

import Captcha from './captcha';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';

var googleRecaptcha = new Captcha("google-recaptcha-v1", Tools.translate.noop("Google reCAPTCHA v1"));

googleRecaptcha.checkCaptcha = function(ip, fields) {
    var challenge = fields.recaptcha_challenge_field;
    var response = fields.recaptcha_response_field;
    if (!challenge)
        return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response)
        return Promise.reject(Tools.translate("Captcha is empty"));
    var query = `privatekey=${this.privateKey}&remoteip=${ip}&challenge=${encodeURIComponent(challenge)}`
        + `&response=${encodeURIComponent(response)}`;
    var url = "https://www.google.com/recaptcha/api/verify?" + query;
    return HTTP.request({
        url: url,
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to check captcha"));
        return response.body.read("utf8");
    }).then(function(data) {
        var result = data.toString();
        if (result.replace("true", "") == result)
            return Promise.reject(Tools.translate("Invalid captcha"));
        return Promise.resolve();
    });
};

module.exports = googleRecaptcha;
