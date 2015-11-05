var HTTP = require("q-io/http");

var Captcha = require("./captcha");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var codecha = new Captcha("codecha", Tools.translate.noop("Codecha - programmers' CAPTCHA"));

codecha.checkCaptcha = function(req, fields) {
    var challenge = fields.codecha_challenge_field;
    var response = fields.codecha_response_field;
    if (!challenge)
        return Promise.reject("Captcha challenge is empty");
    if (!response)
        return Promise.reject("Captcha is empty", "error");
    var query = `challenge=${challenge}&response=${response}&remoteip=${req.trueIp}&privatekey=${this.privateKey}`;
    var url = "http://codecha.org/api/verify?" + query;
    return HTTP.request({
        url: url,
        method: "POST",
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject("Failed to check captcha");
        return response.body.read("utf8");
    }).then(function(data) {
        var result = data.toString();
        if (result.replace("true") == result)
            return Promise.reject("Invalid captcha");
        return Promise.resolve();
    });
};

codecha.widgetHtml = function(req, _) {
    var model = { publicKey: this.publicKey };
    return controller.sync(req, "codechaWidget", model);
};

codecha.scriptSource = function(req) {
    return "https://www.google.com/recaptcha/api.js";
};

module.exports = codecha;
