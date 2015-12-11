var HTTP = require("q-io/http");
var XML2JS = require("xml2js");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");

var checkCaptcha = function(req, fields) {
    var challenge = fields.yandexCaptchaChallenge;
    var response = fields.yandexCaptchaResponse;
    if (!challenge)
        return Promise.reject("Captcha challenge is empty");
    if (!response)
        return Promise.reject("Captcha is empty", "error");
    var query = `key=${encodeURIComponent(this.privateKey)}&captcha=${encodeURIComponent(challenge)}`
        + `&value=${encodeURIComponent(response)}`;
    var url = "http://cleanweb-api.yandex.ru/1.0/check-captcha?" + query;
    return HTTP.request({
        url: url,
        timeout: (15 * Tools.Second)
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject("Failed to check captcha");
        return response.body.read("utf8");
    }).then(function(data) {
        var parser = new XML2JS.Parser();
        return new Promise(function(resolve, reject) {
            parser.parseString(data.toString(), function(err, result) {
                if (err)
                    return resolve({ error: err });
                if (result && result["check-captcha-result"]) {
                    result = result["check-captcha-result"];
                    if (result.ok)
                        return resolve();
                }
                reject("Invalid captcha");
            });
        });
    });
};

var scriptSource = function() {
    return "/" + config("site.pathPrefix", "") + "js/yandex-captcha-script.js";
};

var widgetTemplate = function() {
    return "yandexCaptchaWidget";
};

var captchaMap = {};

var yandexElatmCaptcha = new Captcha("yandex-captcha-elatm", Tools.translate.noop("Yandex captcha (Latin)"));
var yandexEstdCaptcha = new Captcha("yandex-captcha-estd", Tools.translate.noop("Yandex captcha (digits)"));
var yandexRusCaptcha = new Captcha("yandex-captcha-rus", Tools.translate.noop("Yandex captcha (Cyrillic)"));

yandexElatmCaptcha.apiRoutes = function() {
    return [{
        method: "get",
        path: "/yandexCaptchaImage.json",
        handler: function(req, res) {
            var captcha = captchaMap[req.query.type];
            if (!captcha)
                return controller.error(req, res, "Invalid captcha type", true);
            var captcha = req.settings.captchaEngine;
            var type = captcha.id.split("-").pop();
            var query = `key=${encodeURIComponent(captcha.privateKey)}&type=${type}`;
            var url = "http://cleanweb-api.yandex.ru/1.0/get-captcha?" + query;
            return HTTP.request({
                url: url,
                timeout: (15 * Tools.Second)
            }).then(function(response) {
                if (response.status != 200)
                    return Promise.reject("Failed to prepare captcha");
                return response.body.read("utf8");
            }).then(function(data) {
                var parser = new XML2JS.Parser();
                return new Promise(function(resolve, reject) {
                    parser.parseString(data.toString(), function(err, result) {
                        if (err)
                            return resolve({ error: err });
                        if (result && result["get-captcha-result"]) {
                            result = result["get-captcha-result"];
                            if (result.captcha && result.captcha.length > 0 && result.url && result.url.length > 0) {
                                return resolve({
                                    challenge: result.captcha[0],
                                    url: result.url[0].replace("https://", "").replace("http://", "")
                                });
                            } else {
                                return resolve({ error: "Captcha server error" });
                            }
                        } else {
                            return resolve({ error: "Captcha server error" });
                        }
                    });
                });
            }).then(function(result) {
                res.send(result);
            }).catch(function(err) {
                controller.error(req, res, err, true);
            });
        }
    }];
};

var captchas = [yandexElatmCaptcha, yandexEstdCaptcha, yandexRusCaptcha];

captchas.forEach(function(captcha) {
    captchaMap[captcha.id.split("-").pop()] = captcha;
    captcha.checkCaptcha = checkCaptcha;
    captcha.scriptSource = scriptSource;
    captcha.widgetTemplate = widgetTemplate;
});

module.exports = captchas;
