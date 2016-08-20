'use strict';

var _captcha = require('./captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HTTP = require("q-io/http");

var googleRecaptcha = new _captcha2.default("google-recaptcha-v1", Tools.translate.noop("Google reCAPTCHA v1"));

googleRecaptcha.checkCaptcha = function (ip, fields) {
    var challenge = fields.recaptcha_challenge_field;
    var response = fields.recaptcha_response_field;
    if (!challenge) return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response) return Promise.reject(Tools.translate("Captcha is empty"));
    var query = 'privatekey=' + this.privateKey + '&remoteip=' + ip + '&challenge=' + encodeURIComponent(challenge) + ('&response=' + encodeURIComponent(response));
    var url = "https://www.google.com/recaptcha/api/verify?" + query;
    return HTTP.request({
        url: url,
        timeout: 15 * Tools.Second
    }).then(function (response) {
        if (response.status != 200) return Promise.reject(Tools.translate("Failed to check captcha"));
        return response.body.read("utf8");
    }).then(function (data) {
        var result = data.toString();
        if (result.replace("true", "") == result) return Promise.reject(Tools.translate("Invalid captcha"));
        return Promise.resolve();
    });
};

module.exports = googleRecaptcha;
//# sourceMappingURL=google-recaptcha-v1.js.map
