"use strict";

var captcha = require("node-captcha");
var FS = require("q-io/fs");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var nodeCaptcha = new Captcha("node-captcha", Tools.translate.noop("Node captcha"));

nodeCaptcha.challenges = {};

nodeCaptcha.info = function () {
    var inf = Captcha.prototype.info.call(this);
    inf.size = config("captcha.node-captcha.size", 6);
    inf.height = config("captcha.node-captcha.height", 60);
    inf.width = config("captcha.node-captcha.width", Math.round(inf.size * inf.height / 1.8));
    inf.ttl = config("captcha.node-captcha.ttl", 5 * Tools.Minute);
    return inf;
};

nodeCaptcha.checkCaptcha = function (req, fields) {
    var challenge = fields.nodeCaptchaChallenge;
    var response = fields.nodeCaptchaResponse;
    if (!challenge) return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response) return Promise.reject(Tools.translate("Captcha is empty"));
    var c = nodeCaptcha.challenges[challenge];
    if (!c) return Promise.reject(Tools.translate("Invalid captcha"));
    clearTimeout(c.timer);
    FS.remove(__dirname + "/../public/node-captcha/" + c.fileName).catch(function (err) {
        Global.error(err);
    });
    delete nodeCaptcha.challenges[challenge];
    if (response !== c.response) return Promise.reject(Tools.translate("Captcha is solved incorrectly"));
    return Promise.resolve();
};

nodeCaptcha.apiRoutes = function () {
    return [{
        method: "get",
        path: "/nodeCaptchaImage.json",
        handler: function handler(req, res) {
            var size = config("captcha.node-captcha.size", 6);
            var height = config("captcha.node-captcha.height", 60);
            var color = config("captcha.node-captcha.color", "rgb(0,0,0)");
            captcha({
                fileMode: 1,
                saveDir: __dirname + "/../public/node-captcha",
                size: size,
                height: height,
                width: config("captcha.node-captcha.width", Math.round(height * size / 1.8)),
                color: color,
                background: config("captcha.node-captcha.background", "rgb(255,255,255)"),
                lineWidth: config("captcha.node-captcha.lineWidth", 4),
                noise: config("captcha.node-captcha.noise", true),
                noiseColor: config("captcha.node-captcha.noiseColor", color),
                complexity: config("captcha.node-captcha.complexity", 1),
                spacing: config("captcha.node-captcha.spacing", 4)
            }, function (response, fileName) {
                var challenge = UUID.v4();
                nodeCaptcha.challenges[challenge] = {
                    challenge: challenge,
                    fileName: fileName,
                    response: response,
                    timer: setTimeout(function () {
                        FS.remove(__dirname + "/../public/node-captcha/" + fileName).catch(function (err) {
                            Global.error(err);
                        });
                        delete nodeCaptcha.challenges[challenge];
                    }, config("captcha.node-captcha.ttl", 5 * Tools.Minute))
                };
                res.send({
                    challenge: challenge,
                    fileName: fileName,
                    ttl: config("captcha.node-captcha.ttl", 5 * Tools.Minute)
                });
            });
        }
    }];
};

module.exports = nodeCaptcha;
//# sourceMappingURL=node-captcha.js.map
