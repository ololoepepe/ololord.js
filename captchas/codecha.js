var HTTP = require("q-io/http");
var QueryString = require("querystring");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var codecha = new Captcha("codecha", Tools.translate.noop("Codecha - programmers' CAPTCHA"));

codecha.checkCaptcha = function(req, fields) {
    var challenge = fields.codecha_challenge_field;
    var response = fields.codecha_response_field;
    if (!challenge)
        return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response)
        return Promise.reject(Tools.translate("Captcha is empty"));
    var body = `challenge=${challenge}&response=${response}&remoteip=${req.ip}&privatekey=${this.privateKey}`;
    var url = "http://codecha.org/api/verify";
    return HTTP.request({
        url: url,
        method: "POST",
        body: [body],
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body)
        },
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to check captcha"));
        return response.body.read("utf8");
    }).then(function(data) {
        var result = data.toString();
        if (result.replace("true") == result)
            return Promise.reject(Tools.translate("Invalid captcha"));
        return Promise.resolve();
    });
};

codecha.scriptSource = function() {
    return "/" + config("site.pathPrefix", "") + "js/codecha-script.js";
};

codecha.widgetTemplate = function() {
    return "codechaWidget";
};

codecha.apiRoutes = function() {
    return [{
        method: "get",
        path: "/codechaChallenge.json",
        handler: function(req, res) {
            var url = `http://codecha.org/api/challenge?k=${codecha.publicKey}`;
            return HTTP.request({
                url: url,
                timeout: (15 * Tools.Second)
            }).then(function(response) {
                if (response.status != 200)
                    return Promise.reject(Tools.translate("Failed to prepare captcha"));
                return response.body.read("utf8");
            }).then(function(data) {
                var match = /codecha.setChallenge\("([^"]+)"/gi.exec(data.toString());
                if (!match)
                    return Promise.reject(Tools.translate("Captcha server error"));
                return Promise.resolve(match[1]);
            }).then(function(result) {
                res.send({ challenge: result });
            }).catch(function(err) {
                controller.error(res, err, true);
            });
        }
    }];
};

module.exports = codecha;
